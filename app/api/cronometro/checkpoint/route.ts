import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { checkpointCronometro } from "@/lib/services/cronometroService";

export async function POST() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await checkpointCronometro(session.user.idUsuario, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
