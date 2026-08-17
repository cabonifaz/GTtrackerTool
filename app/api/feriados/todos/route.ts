import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarFeriadosTodos } from "@/lib/services/feriadoService";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const feriados = await listarFeriadosTodos();
    return NextResponse.json(feriados);
  } catch (err) {
    return handleApiError(err);
  }
}
