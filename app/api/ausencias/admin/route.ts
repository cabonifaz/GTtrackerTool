import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearAusenciaAdmin } from "@/lib/services/ausenciaService";

const MAX_EVIDENCIA_BYTES = 3 * 1024 * 1024;

// El Admin registra una ausencia ya decidida (ej. avisada por fuera del
// sistema) directamente para un talento -- queda en APROBADA de una,
// sin pasar por el flujo de solicitud/aprobacion normal.
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const idUsuario = form.get("idUsuario");
  const idTipo = form.get("idTipo");
  const fechaInicio = form.get("fechaInicio");
  const fechaFin = form.get("fechaFin");
  const motivo = form.get("motivo");
  const evidenciaFile = form.get("evidencia");

  if (!idUsuario) {
    return NextResponse.json({ error: "Elige un talento" }, { status: 400 });
  }

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
    const result = await crearAusenciaAdmin(
      Number(idUsuario),
      Number(idTipo),
      String(fechaInicio),
      String(fechaFin),
      motivo ? String(motivo) : null,
      evidencia,
      evidenciaTipo,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
