import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { iniciarSesionClase } from "@/lib/services/claseService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { idSesion, fechaInicio } = await req.json();

  try {
    const result = await iniciarSesionClase(
      Number(idSesion),
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? "",
      fechaInicio ?? null
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
