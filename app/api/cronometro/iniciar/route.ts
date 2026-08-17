import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { iniciarCronometro, ResolverTarea } from "@/lib/services/cronometroService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { idTarea, idProyecto, nombreTarea, descripcion, fechaInicio } = await req.json();

  const tarea: ResolverTarea = idTarea
    ? { idTarea: Number(idTarea) }
    : { idProyecto: Number(idProyecto), nombreTarea };

  try {
    const result = await iniciarCronometro(
      session.user.idUsuario,
      tarea,
      descripcion ?? null,
      session.user.email ?? "",
      session.user.rol,
      fechaInicio ?? null,
      session.user.idEmpresa!
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
