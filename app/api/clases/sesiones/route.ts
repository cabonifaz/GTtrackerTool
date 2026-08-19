import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { generarSesionesClase, listarSesionesClase } from "@/lib/services/claseService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(req.url);
  const idGrupo = searchParams.get("idGrupo");
  const fechaDesde = searchParams.get("fechaDesde");
  const fechaHasta = searchParams.get("fechaHasta");
  if (!fechaDesde || !fechaHasta) {
    return NextResponse.json({ error: "Indica fechaDesde y fechaHasta" }, { status: 400 });
  }

  try {
    const sesiones = await listarSesionesClase(
      idGrupo ? Number(idGrupo) : null,
      fechaDesde,
      fechaHasta,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!
    );
    return NextResponse.json(sesiones);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idGrupo, fechaDesde, fechaHasta } = await req.json();

  try {
    const result = await generarSesionesClase(
      Number(idGrupo),
      fechaDesde,
      fechaHasta,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
