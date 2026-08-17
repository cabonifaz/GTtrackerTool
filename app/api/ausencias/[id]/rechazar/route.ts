import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { rechazarAusencia } from "@/lib/services/ausenciaService";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { motivoRechazo } = await req.json();

  try {
    await rechazarAusencia(Number(params.id), motivoRechazo ?? null, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
