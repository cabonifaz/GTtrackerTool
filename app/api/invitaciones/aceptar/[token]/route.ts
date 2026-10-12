import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/apiHelpers";
import { aceptarInvitacion } from "@/lib/services/invitacionService";

// Publica -- no requiere sesion, la persona todavia no tiene clave con la
// que loguearse. El token (64 hex chars, imposible de adivinar) es la
// unica credencial necesaria.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { password } = await req.json();

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "La contrasena debe tener al menos 8 caracteres" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const resultado = await aceptarInvitacion(params.token, passwordHash);
    return NextResponse.json(resultado);
  } catch (err) {
    return handleApiError(err);
  }
}
