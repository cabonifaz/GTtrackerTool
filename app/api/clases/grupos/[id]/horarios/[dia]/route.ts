import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { quitarHorarioGrupo } from "@/lib/services/claseService";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; dia: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await quitarHorarioGrupo(
      Number(params.id),
      Number(params.dia),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
