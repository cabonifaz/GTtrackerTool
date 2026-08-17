import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { asignarPerfilTalento } from "@/lib/services/proyectoService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario, idPerfil } = await req.json();

  try {
    await asignarPerfilTalento(
      Number(idUsuario),
      Number(params.id),
      idPerfil ? Number(idPerfil) : null,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
