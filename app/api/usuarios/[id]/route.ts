import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { editarUsuario } from "@/lib/services/usuarioService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombres, apellidos, codigoRol, numeroDocumento } = await req.json();

  try {
    await editarUsuario(
      Number(params.id),
      nombres,
      apellidos,
      codigoRol,
      numeroDocumento || null,
      session.user.idEmpresa,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
