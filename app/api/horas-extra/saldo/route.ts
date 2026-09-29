import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { obtenerSaldoCompensatorio } from "@/lib/services/horaExtraService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idUsuarioParam = req.nextUrl.searchParams.get("idUsuario");
  // Un Talento solo puede ver su propio saldo; un Admin puede consultar el de cualquiera.
  const idUsuario =
    session.user.rol === "ADMIN" && idUsuarioParam ? Number(idUsuarioParam) : session.user.idUsuario;

  try {
    const saldo = await obtenerSaldoCompensatorio(idUsuario, session.user.idEmpresa!);
    return NextResponse.json(saldo);
  } catch (err) {
    return handleApiError(err);
  }
}
