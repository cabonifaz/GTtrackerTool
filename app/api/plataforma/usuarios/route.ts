import { NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarUsuarios } from "@/lib/services/usuarioService";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const usuarios = await listarUsuarios(null);
    return NextResponse.json(usuarios);
  } catch (err) {
    return handleApiError(err);
  }
}
