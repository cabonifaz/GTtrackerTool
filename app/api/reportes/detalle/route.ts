import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { reporteHorasDetalle } from "@/lib/services/reporteService";

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

  // Un Talento solo puede ver su propio detalle; un Admin puede filtrar por lista de colaboradores.
  const idsUsuario =
    session.user.rol === "ADMIN"
      ? (idsUsuarioParam ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number)
      : [session.user.idUsuario];

  try {
    const detalle = await reporteHorasDetalle(idsUsuario, fechaInicio, fechaFin, session.user.idEmpresa!);
    return NextResponse.json(detalle);
  } catch (err) {
    return handleApiError(err);
  }
}
