import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearProyecto, listarProyectos } from "@/lib/services/proyectoService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const proyectos = await listarProyectos(session.user.idUsuario, session.user.rol);
    return NextResponse.json(proyectos);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idCliente, nombre, descripcion } = await req.json();

  try {
    const result = await crearProyecto(
      idCliente ?? null,
      nombre,
      descripcion ?? null,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
