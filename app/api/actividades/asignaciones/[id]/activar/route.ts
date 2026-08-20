import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { activarAsignacion } from "@/lib/services/actividadService";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await activarAsignacion(Number(params.id), session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
