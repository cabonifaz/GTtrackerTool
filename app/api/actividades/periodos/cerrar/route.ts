import { NextRequest, NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { cerrarPeriodo } from "@/lib/services/actividadService";

export async function POST(req: NextRequest) {
  const session = await requireAdminOGestor();
  if (session instanceof NextResponse) return session;

  const { idProyecto, periodoDesde, periodoHasta } = await req.json();

  try {
    const result = await cerrarPeriodo(
      Number(idProyecto),
      periodoDesde,
      periodoHasta,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
