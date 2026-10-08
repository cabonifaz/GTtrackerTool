import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import {
  estadoCierreFacturacion,
  reporteFacturacionCierreDetalle,
  reporteFacturacionMensual,
} from "@/lib/services/reporteService";

// Totales de horas/dinero del mismo calculo que usa la exportacion de
// Facturacion (congelado si el mes esta cerrado, en vivo con tarifa
// vigente historicamente si no), para mostrarlos en pantalla sin tener
// que descargar el Excel.
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idProyecto = params.get("idProyecto");
  const anio = params.get("anio");
  const mes = params.get("mes");

  if (!idProyecto || !anio || !mes) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    const estadoCierre = await estadoCierreFacturacion(Number(idProyecto), Number(anio), Number(mes));
    const estaCerrado = estadoCierre?.cerrado === 1;

    const detalle = estaCerrado
      ? await reporteFacturacionCierreDetalle(Number(idProyecto), Number(anio), Number(mes))
      : await reporteFacturacionMensual(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!);

    const totales = detalle.reduce(
      (acc, f) => ({
        talentos: acc.talentos + 1,
        horasTrabajadas: acc.horasTrabajadas + Number(f.horas_trabajadas),
        horasObjetivo: acc.horasObjetivo + Number(f.horas_objetivo),
        montoTotal: acc.montoTotal + Number(f.horas_trabajadas) * Number(f.tarifa ?? 0),
      }),
      { talentos: 0, horasTrabajadas: 0, horasObjetivo: 0, montoTotal: 0 }
    );
    const codigoMoneda = detalle.find((f) => f.codigo_moneda)?.codigo_moneda ?? null;

    return NextResponse.json({ ...totales, codigoMoneda, cerrado: estaCerrado });
  } catch (err) {
    return handleApiError(err);
  }
}
