import { NextRequest, NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { desactivarAsignacion } from "@/lib/services/actividadService";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminOGestor();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarAsignacion(
      Number(params.id),
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
