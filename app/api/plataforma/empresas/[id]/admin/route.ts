import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearUsuario } from "@/lib/services/usuarioService";
import { PASSWORD_GENERICA } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { nombres, apellidos, email } = await req.json();

  try {
    const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);
    const result = await crearUsuario(
      nombres,
      apellidos,
      email,
      passwordHash,
      "ADMIN",
      Number(params.id),
      null,
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
