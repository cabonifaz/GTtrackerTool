import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { cancelarSesionClase } from "@/lib/services/claseService";

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await cancelarSesionClase(Number(params.id), session.user.rol, session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
