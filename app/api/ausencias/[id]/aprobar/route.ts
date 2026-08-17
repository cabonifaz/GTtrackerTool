import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { aprobarAusencia } from "@/lib/services/ausenciaService";

const MAX_EVIDENCIA_BYTES = 3 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData().catch(() => null);
  let evidencia: Buffer | null = null;
  let evidenciaTipo: string | null = null;
  const evidenciaFile = form?.get("evidencia");
  if (evidenciaFile instanceof File && evidenciaFile.size > 0) {
    if (evidenciaFile.size > MAX_EVIDENCIA_BYTES) {
      return NextResponse.json({ error: "La imagen no puede superar 3MB" }, { status: 400 });
    }
    evidencia = Buffer.from(await evidenciaFile.arrayBuffer());
    evidenciaTipo = evidenciaFile.type || "application/octet-stream";
  }

  try {
    await aprobarAusencia(Number(params.id), evidencia, evidenciaTipo, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
