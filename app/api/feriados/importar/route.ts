import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarMaestro } from "@/lib/services/maestroService";
import { crearFeriado, reemplazarFeriadosAnio } from "@/lib/services/feriadoService";

interface FeriadoExterno {
  date: string;
  localName: string;
  name: string;
}

// Trae el calendario oficial de feriados de un pais/anio desde Nager.Date
// (https://date.nager.at, API publica y gratuita de feriados nacionales) y
// los guarda vía sp_feriado_crear -- que ya es idempotente (UNIQUE por
// pais+fecha), asi que reimportar el mismo anio actualiza en vez de duplicar.
// Esto es una operacion tecnica de obtencion/formato de datos (igual que el
// importador de Excel); la validacion de negocio sigue viviendo en el SP.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idPais, anio, reemplazar } = await req.json();
  if (!idPais || !anio) {
    return NextResponse.json({ error: "idPais y anio son requeridos" }, { status: 400 });
  }

  const paises = await listarMaestro("PAIS_CALENDARIO");
  const pais = paises.find((p) => p.id_maestro === Number(idPais));
  if (!pais) {
    return NextResponse.json({ error: "Pais de calendario invalido" }, { status: 400 });
  }

  if (reemplazar) {
    try {
      // Solo borra (baja logica) los feriados existentes de ese pais/anio si el
      // SP confirma que el anio todavia no comenzo -- si no, corta aca mismo
      // antes de gastar la llamada a la fuente externa.
      await reemplazarFeriadosAnio(pais.id_maestro, Number(anio), session.user.email ?? "");
    } catch (err) {
      return handleApiError(err);
    }
  }

  let feriadosExternos: FeriadoExterno[];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${anio}/${pais.codigo}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 204) {
      return NextResponse.json(
        { error: `La fuente no tiene feriados publicados para ${pais.valor} en ${anio}` },
        { status: 404 }
      );
    }
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    feriadosExternos = await res.json();
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener el calendario desde la fuente externa. Intenta de nuevo mas tarde." },
      { status: 502 }
    );
  }

  try {
    for (const feriado of feriadosExternos) {
      await crearFeriado(pais.id_maestro, feriado.date, feriado.localName || feriado.name, session.user.email ?? "");
    }
    return NextResponse.json({ pais: pais.valor, anio, total: feriadosExternos.length });
  } catch (err) {
    return handleApiError(err);
  }
}
