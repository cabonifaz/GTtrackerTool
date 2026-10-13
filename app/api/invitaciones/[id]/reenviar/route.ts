import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reenviarInvitacion } from "@/lib/services/invitacionService";

const DIAS_EXPIRACION = 7;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const token = crypto.randomBytes(32).toString("hex");
    await reenviarInvitacion(
      Number(params.id),
      token,
      DIAS_EXPIRACION,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    // NEXTAUTH_URL, mismo motivo que en /api/usuarios/invitar.
    const link = `${process.env.NEXTAUTH_URL}/${session.user.empresaSlug}/invitacion/${token}`;
    return NextResponse.json({ link });
  } catch (err) {
    return handleApiError(err);
  }
}
