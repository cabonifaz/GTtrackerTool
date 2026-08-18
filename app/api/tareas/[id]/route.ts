import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { desactivarTarea } from "@/lib/services/tareaService";

// Eliminar (baja logica) una tarea es mas destructivo que finalizarla --
// a diferencia de crear/finalizar, que cualquier talento asignado puede
// hacer, borrar queda reservado a Admin.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarTarea(Number(params.id), session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
