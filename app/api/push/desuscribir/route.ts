import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { eliminarSuscripcion } from "@/lib/services/pushService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Falta el endpoint" }, { status: 400 });
  }

  try {
    await eliminarSuscripcion(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
