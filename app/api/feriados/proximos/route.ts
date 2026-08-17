import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarFeriadosProximos } from "@/lib/services/feriadoService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const idPais = req.nextUrl.searchParams.get("idPais");
  const limite = req.nextUrl.searchParams.get("limite") ?? "5";
  if (!idPais) {
    return NextResponse.json({ error: "idPais es requerido" }, { status: 400 });
  }

  try {
    const feriados = await listarFeriadosProximos(Number(idPais), Number(limite));
    return NextResponse.json(feriados);
  } catch (err) {
    return handleApiError(err);
  }
}
