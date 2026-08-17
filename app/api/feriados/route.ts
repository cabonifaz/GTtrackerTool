import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearFeriado, listarFeriadosAnio } from "@/lib/services/feriadoService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idPais = req.nextUrl.searchParams.get("idPais");
  const anio = req.nextUrl.searchParams.get("anio");
  if (!idPais || !anio) {
    return NextResponse.json({ error: "idPais y anio son requeridos" }, { status: 400 });
  }

  try {
    const feriados = await listarFeriadosAnio(Number(idPais), Number(anio));
    return NextResponse.json(feriados);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idPais, fecha, nombre } = await req.json();

  try {
    const result = await crearFeriado(Number(idPais), fecha, nombre, session.user.email ?? "");
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
