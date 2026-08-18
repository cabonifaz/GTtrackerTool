import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearUsuario, listarUsuarios } from "@/lib/services/usuarioService";
import { PASSWORD_GENERICA } from "@/lib/constants";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const usuarios = await listarUsuarios(session.user.idEmpresa);
    return NextResponse.json(usuarios);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombres, apellidos, email, codigoRol, numeroDocumento } = await req.json();

  try {
    const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);
    const result = await crearUsuario(
      nombres,
      apellidos,
      email,
      passwordHash,
      codigoRol,
      session.user.idEmpresa,
      numeroDocumento || null,
      session.user.email ?? ""
    );
    return NextResponse.json(
      { ...result[0], passwordGenerica: PASSWORD_GENERICA },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
