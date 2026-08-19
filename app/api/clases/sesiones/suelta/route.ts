import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearSesionSuelta } from "@/lib/services/claseService";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idGrupo, fecha, horaInicio, horaFin, tema } = await req.json();

  try {
    const result = await crearSesionSuelta(
      Number(idGrupo),
      fecha,
      horaInicio,
      horaFin,
      tema || null,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
