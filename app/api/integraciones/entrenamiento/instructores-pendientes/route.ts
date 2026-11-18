import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarInstructoresExternosPendientes } from "@/lib/services/entrenamientoService";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const pendientes = await listarInstructoresExternosPendientes(session.user.idEmpresa!);
    return NextResponse.json(pendientes);
  } catch (err) {
    return handleApiError(err);
  }
}
