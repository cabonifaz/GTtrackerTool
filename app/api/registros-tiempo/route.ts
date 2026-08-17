import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearRegistroManual, ResolverTarea } from "@/lib/services/cronometroService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { idTarea, idProyecto, nombreTarea, fechaInicio, fechaFin, descripcion } = await req.json();

  const tarea: ResolverTarea = idTarea
    ? { idTarea: Number(idTarea) }
    : { idProyecto: Number(idProyecto), nombreTarea };

  try {
    const result = await crearRegistroManual(
      session.user.idUsuario,
      tarea,
      fechaInicio,
      fechaFin,
      descripcion ?? null,
      session.user.email ?? "",
      session.user.rol
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
