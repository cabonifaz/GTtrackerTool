import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { reporteTiempoPorTarea } from "@/lib/services/reporteService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const fechaInicio = params.get("fechaInicio");
  const fechaFin = params.get("fechaFin");
  const idsUsuarioParam = params.get("idsUsuario");

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
  }

  const idsUsuario =
    session.user.rol === "ADMIN"
      ? (idsUsuarioParam ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number)
      : [session.user.idUsuario];

  try {
    const filas = await reporteTiempoPorTarea(idsUsuario, fechaInicio, fechaFin);
    return NextResponse.json(filas);
  } catch (err) {
    return handleApiError(err);
  }
}
