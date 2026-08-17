import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { eliminarSuscripcion, listarSuscripcionesPorUsuario } from "@/lib/services/pushService";
import { enviarNotificacion } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario } = await req.json();
  if (!idUsuario) {
    return NextResponse.json({ error: "Falta idUsuario" }, { status: 400 });
  }

  try {
    const usuarios = await listarUsuarios();
    const usuario = usuarios.find((u) => u.id_usuario === Number(idUsuario));
    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "Ese talento no esta activo" }, { status: 400 });
    }

    const suscripciones = await listarSuscripcionesPorUsuario(Number(idUsuario));
    if (suscripciones.length === 0) {
      return NextResponse.json(
        { error: "Ese talento no tiene notificaciones activadas en ningun dispositivo" },
        { status: 400 }
      );
    }

    let enviados = 0;
    for (const s of suscripciones) {
      try {
        await enviarNotificacion(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          {
            title: "Actualiza tus horas",
            body: "Tu avance de horas registradas esta por debajo de lo esperado este mes. Registra tus horas pendientes.",
            url: "/cronometro",
          }
        );
        enviados++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await eliminarSuscripcion(s.endpoint);
        }
      }
    }

    return NextResponse.json({ enviados, total: suscripciones.length });
  } catch (err) {
    return handleApiError(err);
  }
}
