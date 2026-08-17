import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearTarea, listarTareas } from "@/lib/services/tareaService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idProyectoParam = req.nextUrl.searchParams.get("idProyecto");
  const idProyecto = idProyectoParam ? Number(idProyectoParam) : null;

  try {
    const tareas = await listarTareas(idProyecto, session.user.idUsuario, session.user.rol, session.user.idEmpresa!);
    return NextResponse.json(tareas);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { idProyecto, nombre, descripcion } = await req.json();

  try {
    const result = await crearTarea(
      idProyecto,
      nombre,
      descripcion ?? null,
      session.user.email ?? "",
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
