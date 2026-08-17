import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearAusencia, listarAusenciasPorUsuario } from "@/lib/services/ausenciaService";

const MAX_EVIDENCIA_BYTES = 3 * 1024 * 1024;

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const ausencias = await listarAusenciasPorUsuario(session.user.idUsuario);
    return NextResponse.json(ausencias);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const idTipo = form.get("idTipo");
  const fechaInicio = form.get("fechaInicio");
  const fechaFin = form.get("fechaFin");
  const motivo = form.get("motivo");
  const evidenciaFile = form.get("evidencia");

  let evidencia: Buffer | null = null;
  let evidenciaTipo: string | null = null;
  if (evidenciaFile instanceof File && evidenciaFile.size > 0) {
    if (evidenciaFile.size > MAX_EVIDENCIA_BYTES) {
      return NextResponse.json({ error: "La imagen no puede superar 3MB" }, { status: 400 });
    }
    evidencia = Buffer.from(await evidenciaFile.arrayBuffer());
    evidenciaTipo = evidenciaFile.type || "application/octet-stream";
  }

  try {
    const result = await crearAusencia(
      session.user.idUsuario,
      Number(idTipo),
      String(fechaInicio),
      String(fechaFin),
      motivo ? String(motivo) : null,
      evidencia,
      evidenciaTipo,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
