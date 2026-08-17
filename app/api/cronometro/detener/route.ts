import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { detenerCronometro } from "@/lib/services/cronometroService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { fechaFin } = await req.json().catch(() => ({ fechaFin: null }));

  try {
    const result = await detenerCronometro(
      session.user.idUsuario,
      session.user.email ?? "",
      fechaFin ?? null
    );
    return NextResponse.json(result[0]);
  } catch (err) {
    return handleApiError(err);
  }
}
