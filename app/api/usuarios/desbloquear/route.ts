import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { desbloquear } from "@/lib/rateLimiter";
import { listarUsuarios } from "@/lib/services/usuarioService";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Falta el email" }, { status: 400 });
  }

  try {
    // Solo se puede desbloquear un email que sea de un usuario de la
    // propia empresa -- evita que un Admin ande probando/desbloqueando
    // cuentas de otras empresas.
    const usuarios = await listarUsuarios(session.user.idEmpresa!);
    const pertenece = usuarios.some((u) => u.email.trim().toLowerCase() === String(email).trim().toLowerCase());
    if (!pertenece) {
      return NextResponse.json({ error: "Ese usuario no pertenece a tu empresa" }, { status: 404 });
    }

    desbloquear(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
