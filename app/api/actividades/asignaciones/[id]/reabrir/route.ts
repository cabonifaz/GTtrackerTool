import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reabrirAsignacion } from "@/lib/services/actividadService";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await reabrirAsignacion(Number(params.id), session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
