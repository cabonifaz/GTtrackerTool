import { NextRequest, NextResponse } from "next/server";
import { obtenerSlotsPendientes, marcarAlertaEnviada, cerrarAutomaticoVencidas } from "@/lib/services/cronAlertasService";
import { eliminarSuscripcion, listarSuscripcionesPorUsuario } from "@/lib/services/pushService";
import { enviarNotificacion } from "@/lib/push";

// Job periodico (disparado desde GitHub Actions cada 30 min, ver
// .github/workflows/alertas-actividades.yml) que:
//   1. Cierra solas las asignaciones vencidas con las 5 actividades completas.
//   2. Manda push "llamativo" a los talentos con asignaciones tipo Actividades
//      por Excel por vencer (3 dias antes) o vencidas hoy mismo (varios
//      horarios el mismo dia de vencimiento), mientras no lleguen a 5
//      actividades. No requiere sesion de usuario -- se autentica con un
//      secreto compartido (header x-cron-secret), no con NextAuth.
export async function POST(req: NextRequest) {
  const secreto = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secreto !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const asignacionesCerradas = await cerrarAutomaticoVencidas();

  const slots = await obtenerSlotsPendientes();
  let enviados = 0;
  let omitidos = 0;

  for (const slot of slots) {
    const gano = await marcarAlertaEnviada(slot.id_asignacion, slot.clave_alerta);
    if (!gano) {
      omitidos++;
      continue;
    }

    const suscripciones = await listarSuscripcionesPorUsuario(slot.id_usuario);
    if (suscripciones.length === 0) continue;

    const esT3 = slot.clave_alerta === "T3";
    const faltan = 5 - slot.actividades_cargadas;
    const titulo = esT3
      ? "⚠️ Actividades por vencer en 3 dias"
      : "🚨 URGENTE: hoy vence tu reporte de actividades";
    const cuerpo = esT3
      ? `Te faltan ${faltan} actividad${faltan === 1 ? "" : "es"} de "${slot.nombre_iniciativa ?? slot.proyecto}". Vence el ${slot.periodo_hasta}.`
      : `Te faltan ${faltan} actividad${faltan === 1 ? "" : "es"} de "${slot.nombre_iniciativa ?? slot.proyecto}" y vence HOY. Completalas ahora para evitar quedar incompleto.`;

    for (const s of suscripciones) {
      try {
        await enviarNotificacion(
          { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
          { title: titulo, body: cuerpo, url: `/${slot.empresa_slug}/actividades` }
        );
        enviados++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await eliminarSuscripcion(s.endpoint);
        }
      }
    }
  }

  return NextResponse.json({
    asignacionesCerradas,
    slotsEvaluados: slots.length,
    enviados,
    omitidosPorCarreraDeJobs: omitidos,
  });
}
