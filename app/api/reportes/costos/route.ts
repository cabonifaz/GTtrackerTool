import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteCostosMensual } from "@/lib/services/reporteService";

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
    const filas = await reporteCostosMensual(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!);
    return NextResponse.json(filas);
  } catch (err) {
    return handleApiError(err);
  }
}
