import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { resetearPassword } from "@/lib/services/usuarioService";
import { PASSWORD_GENERICA } from "@/lib/constants";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);
    await resetearPassword(Number(params.id), passwordHash, session.user.email ?? "");
    return NextResponse.json({ ok: true, passwordGenerica: PASSWORD_GENERICA });
  } catch (err) {
    return handleApiError(err);
  }
}
