import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { finalizarAsignacion } from "@/lib/services/actividadService";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await finalizarAsignacion(
      Number(params.id),
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
