import { NextRequest, NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { cerrarAsignacion } from "@/lib/services/actividadService";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminOGestor();
  if (session instanceof NextResponse) return session;

  try {
    await cerrarAsignacion(
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
