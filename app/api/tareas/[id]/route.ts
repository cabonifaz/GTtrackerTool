import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { desactivarTarea } from "@/lib/services/tareaService";

// Igual que finalizar: cualquier talento con el proyecto de la tarea
// asignado puede eliminarla, no solo Admin (el SP igual lo valida).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarTarea(
      Number(params.id),
      session.user.idEmpresa!,
      session.user.idUsuario,
      session.user.rol,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
