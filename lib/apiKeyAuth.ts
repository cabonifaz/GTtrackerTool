import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { validarApiKey } from "@/lib/services/usuarioSistemaService";

/** Autentica una request de /api/v1/* usando cabeceras x-api-key / x-api-secret. */
export async function requireApiKey(
  req: NextRequest
): Promise<{ idUsuarioSistema: number; nombreSistema: string; idEmpresa: number } | NextResponse> {
  const apiKey = req.headers.get("x-api-key");
  const apiSecret = req.headers.get("x-api-secret");

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Se requieren las cabeceras x-api-key y x-api-secret" },
      { status: 401 }
    );
  }

  const cuenta = await validarApiKey(apiKey);
  if (!cuenta) {
    return NextResponse.json({ error: "api key invalida o inactiva" }, { status: 401 });
  }

  const secretoValido = await bcrypt.compare(apiSecret, cuenta.api_secret_hash);
  if (!secretoValido) {
    return NextResponse.json({ error: "api secret invalido" }, { status: 401 });
  }

  return {
    idUsuarioSistema: cuenta.id_usuario_sistema,
    nombreSistema: cuenta.nombre_sistema,
    idEmpresa: cuenta.id_empresa,
  };
}
