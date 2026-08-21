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

export async function requireSuperAdmin(): Promise<Session | NextResponse> {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;
  if (session.user.rol !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Requiere rol Super Admin" }, { status: 403 });
  }
  return session;
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof BusinessError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);

  // Para errores inesperados (no de negocio), "Error interno" a secas no
  // ayuda a nadie a diagnosticar nada -- se suma el detalle tecnico si
  // esta disponible (sqlMessage de MySQL o el mensaje del Error), sin
  // exponer el stack completo. Son mensajes de MySQL (columna, largo,
  // duplicado, etc.), no datos sensibles.
  const detalle =
    err && typeof err === "object" && "sqlMessage" in err
      ? String((err as { sqlMessage?: unknown }).sqlMessage ?? "")
      : err instanceof Error
        ? err.message
        : null;

  return NextResponse.json(
    { error: detalle ? `Error interno: ${detalle}` : "Error interno" },
    { status: 500 }
  );
}
