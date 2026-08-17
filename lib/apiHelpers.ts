import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessError } from "@/lib/db";

export async function requireSession(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return session;
}

export async function requireAdmin(): Promise<Session | NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (session.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Requiere rol Admin" }, { status: 403 });
  }
  return session;
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof BusinessError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
