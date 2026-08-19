import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteClasesPorGrupo } from "@/lib/services/claseService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const fechaInicio = params.get("fechaInicio");
  const fechaFin = params.get("fechaFin");
  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
  }

  try {
    const filas = await reporteClasesPorGrupo(fechaInicio, fechaFin, session.user.idEmpresa!);
    return NextResponse.json(filas);
  } catch (err) {
    return handleApiError(err);
  }
}
