import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { cerrarMesFacturacion, estadoCierreFacturacion, reabrirMesFacturacion } from "@/lib/services/reporteService";

function leerParams(params: URLSearchParams) {
  const idProyecto = params.get("idProyecto");
  const anio = params.get("anio");
  const mes = params.get("mes");
  if (!idProyecto || !anio || !mes) return null;
  return { idProyecto: Number(idProyecto), anio: Number(anio), mes: Number(mes) };
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const parsed = leerParams(req.nextUrl.searchParams);
  if (!parsed) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    const estado = await estadoCierreFacturacion(parsed.idProyecto, parsed.anio, parsed.mes);
    return NextResponse.json(estado ?? { cerrado: 0, cerrado_por: null, fecha_cierre: null });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idProyecto, anio, mes } = await req.json();
  if (!idProyecto || !anio || !mes) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    await cerrarMesFacturacion(
      Number(idProyecto),
      Number(anio),
      Number(mes),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const parsed = leerParams(req.nextUrl.searchParams);
  if (!parsed) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    await reabrirMesFacturacion(
      parsed.idProyecto,
      parsed.anio,
      parsed.mes,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
