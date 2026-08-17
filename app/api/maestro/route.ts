import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { listarMaestro } from "@/lib/services/maestroService";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const tipo = req.nextUrl.searchParams.get("tipo");
  if (!tipo) {
    return NextResponse.json({ error: "Falta el parametro tipo" }, { status: 400 });
  }

  try {
    const items = await listarMaestro(tipo);
    return NextResponse.json(items);
  } catch (err) {
    return handleApiError(err);
  }
}
