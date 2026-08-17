import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { asignarSaldoVacaciones, obtenerSaldoVacaciones } from "@/lib/services/ausenciaService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const anio = Number(params.get("anio") ?? new Date().getFullYear());
  const idUsuarioParam = params.get("idUsuario");

  // Un Talento solo puede ver su propio saldo; un Admin puede consultar el de cualquiera.
  const idUsuario =
    session.user.rol === "ADMIN" && idUsuarioParam ? Number(idUsuarioParam) : session.user.idUsuario;

  try {
    const saldo = await obtenerSaldoVacaciones(idUsuario, anio);
    return NextResponse.json(saldo);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario, anio, diasAsignados } = await req.json();

  try {
    await asignarSaldoVacaciones(
      Number(idUsuario),
      Number(anio),
      Number(diasAsignados),
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
