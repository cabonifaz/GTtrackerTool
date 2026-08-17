import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { cambiarPassword } from "@/lib/services/usuarioService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { nuevaPassword } = await req.json();

  if (!nuevaPassword || nuevaPassword.length < 8) {
    return NextResponse.json(
      { error: "La contrasena debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await cambiarPassword(session.user.idUsuario, passwordHash, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
