import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { desactivarAsignacion } from "@/lib/services/actividadService";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarAsignacion(Number(params.id), session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
