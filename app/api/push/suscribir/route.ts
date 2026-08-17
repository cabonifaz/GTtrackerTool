import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { guardarSuscripcion } from "@/lib/services/pushService";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { endpoint, keys } = await req.json();

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Suscripcion invalida" }, { status: 400 });
  }

  try {
    await guardarSuscripcion(
      session.user.idUsuario,
      endpoint,
      keys.p256dh,
      keys.auth,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
