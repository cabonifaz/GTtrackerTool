import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarProgramasExternos } from "@/lib/services/entrenamientoApiService";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const programas = await listarProgramasExternos();
    return NextResponse.json(programas);
  } catch (err) {
    return handleApiError(err);
  }
}
