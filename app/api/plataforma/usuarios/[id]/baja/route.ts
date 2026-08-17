import { NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { desactivarUsuario } from "@/lib/services/usuarioService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarUsuario(Number(params.id), null, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
