import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearUsuarioSistema, listarUsuariosSistema } from "@/lib/services/usuarioSistemaService";

export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const cuentas = await listarUsuariosSistema();
    return NextResponse.json(cuentas);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombreSistema } = await req.json();

  const apiKey = crypto.randomBytes(16).toString("hex");
  const apiSecret = crypto.randomBytes(24).toString("hex");
  const apiSecretHash = await bcrypt.hash(apiSecret, 10);

  try {
    const result = await crearUsuarioSistema(
      nombreSistema,
      apiKey,
      apiSecretHash,
      session.user.email ?? ""
    );
    // El api_secret en claro solo se muestra una vez, al momento de la creacion.
    return NextResponse.json(
      { id_usuario_sistema: result[0].id_usuario_sistema, apiKey, apiSecret },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
