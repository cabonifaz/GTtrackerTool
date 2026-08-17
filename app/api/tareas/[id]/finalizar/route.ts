import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { finalizarTarea } from "@/lib/services/tareaService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await finalizarTarea(
      Number(params.id),
      session.user.email ?? "",
      session.user.idUsuario,
      session.user.rol
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
