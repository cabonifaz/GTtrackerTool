import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarInvitaciones } from "@/lib/services/invitacionService";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const invitaciones = await listarInvitaciones(session.user.idEmpresa!);
    return NextResponse.json(invitaciones);
  } catch (err) {
    return handleApiError(err);
  }
}
