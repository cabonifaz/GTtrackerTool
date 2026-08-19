import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearGrupoClase, listarGruposClase } from "@/lib/services/claseService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const grupos = await listarGruposClase(session.user.idUsuario, session.user.rol, session.user.idEmpresa!);
    return NextResponse.json(grupos);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idProyecto, nombre, idProfesor } = await req.json();

  try {
    const result = await crearGrupoClase(
      Number(idProyecto),
      nombre,
      Number(idProfesor),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
