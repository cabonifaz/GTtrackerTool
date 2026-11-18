import { executeProcedure, executeQuery } from "@/lib/db";
import { asignarTalento } from "@/lib/services/proyectoService";
import { crearRegistroManual } from "@/lib/services/cronometroService";
import { listarHorasDictadasExternas } from "@/lib/services/entrenamientoApiService";
import { InstructorExternoPendiente, ResultadoFilaImportacion } from "@/lib/types";

// Suma minutos a una hora "HH:mm" con aritmetica entera (nunca Date ni
// timezone -- esas comparaciones ya mordieron a este proyecto antes).
function sumarMinutos(horaHHmm: string, minutos: number): string {
  const [h, m] = horaHHmm.split(":").map(Number);
  const total = ((h * 60 + m + minutos) % (24 * 60) + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function construirRangoFecha(fecha: string, horaInicio: string | null, minutos: number) {
  const inicio = horaInicio ?? "00:00";
  const fin = sumarMinutos(inicio, minutos);
  return {
    fechaInicio: `${fecha} ${inicio}:00`,
    fechaFin: `${fecha} ${fin}:00`,
  };
}

interface InstructorExternoRow {
  id_instructor_externo: number;
  email_externo: string;
  nombre_externo: string;
  id_usuario: number | null;
}

function upsertInstructorExterno(email: string, nombre: string, idEmpresaActor: number, creadoPor: string) {
  return executeProcedure<InstructorExternoRow>("sp_instructor_externo_upsert", [
    email,
    nombre,
    idEmpresaActor,
    creadoPor,
  ]).then((rows) => rows[0]);
}

interface ClaseLog {
  program_id: number;
  group_id: number;
  topic_id: number;
  component_name: string;
  topic_title: string;
  fecha: string;
  horaInicio: string | null;
  minutos: number;
}

function registrarLog(
  c: ClaseLog,
  emailExterno: string,
  idUsuario: number | null,
  idProyecto: number,
  idTarea: number | null,
  idRegistro: number | null,
  codigoEstado: "IMPORTADO" | "SIN_EMPAREJAR",
  idEmpresaActor: number,
  creadoPor: string
) {
  const horaInicioSql = c.horaInicio ? `${c.horaInicio}:00` : null;
  const horaFinSql = c.horaInicio ? `${sumarMinutos(c.horaInicio, c.minutos)}:00` : null;
  return executeProcedure("sp_hora_dictada_importar_registrar", [
    c.program_id,
    c.group_id,
    c.topic_id,
    c.component_name,
    c.topic_title,
    c.fecha,
    horaInicioSql,
    horaFinSql,
    c.minutos,
    emailExterno,
    idUsuario,
    idProyecto,
    idTarea,
    idRegistro,
    codigoEstado,
    idEmpresaActor,
    creadoPor,
  ]);
}

// Crea el registro_tiempo de una clase ya emparejada con un talento, y
// deja el log. Compartido entre la importacion en vivo y el reproceso
// al relacionar un instructor pendiente.
async function procesarClaseEmparejada(
  c: ClaseLog,
  emailExterno: string,
  idUsuario: number,
  idProyecto: number,
  idEmpresaActor: number,
  actorEmail: string
) {
  const { fechaInicio, fechaFin } = construirRangoFecha(c.fecha, c.horaInicio, c.minutos);
  await asignarTalento(idUsuario, idProyecto, null, idEmpresaActor, actorEmail);
  const [registro] = await crearRegistroManual(
    idUsuario,
    { idProyecto, nombreTarea: c.component_name },
    fechaInicio,
    fechaFin,
    c.topic_title,
    actorEmail,
    "ADMIN",
    idEmpresaActor
  );
  await registrarLog(c, emailExterno, idUsuario, idProyecto, registro.id_tarea, registro.id_registro, "IMPORTADO", idEmpresaActor, actorEmail);
  return registro;
}

export async function importarHorasDictadas(
  idProyecto: number,
  programId: number,
  from: string,
  to: string,
  idEmpresaActor: number,
  actorEmail: string
): Promise<ResultadoFilaImportacion[]> {
  const clases = await listarHorasDictadasExternas(programId, from, to);

  const estados = await executeProcedure<{ topic_id: number; codigo_estado: string }>(
    "sp_horas_dictadas_estado_por_programa_listar",
    [programId, idEmpresaActor]
  );
  const yaImportados = new Set(estados.filter((e) => e.codigo_estado === "IMPORTADO").map((e) => e.topic_id));

  // Un upsert por instructor distinto visto en este lote (no uno por
  // clase) -- auto-relaciona por email exacto si corresponde.
  const nombrePorEmail = new Map<string, string>();
  for (const c of clases) {
    if (c.instructorEmail) nombrePorEmail.set(c.instructorEmail, c.instructorName ?? c.instructorEmail);
  }
  const idUsuarioPorEmail = new Map<string, number | null>();
  for (const [email, nombre] of Array.from(nombrePorEmail)) {
    const row = await upsertInstructorExterno(email, nombre, idEmpresaActor, actorEmail);
    idUsuarioPorEmail.set(email, row.id_usuario);
  }

  const resultados: ResultadoFilaImportacion[] = [];

  for (const c of clases) {
    const profesor = c.instructorName ?? c.instructorEmail ?? "(sin profesor)";

    if (yaImportados.has(c.topicId)) {
      resultados.push({ fecha: c.date, profesor, email: c.instructorEmail ?? "-", tema: c.topicTitle, estado: "YA_IMPORTADO" });
      continue;
    }

    if (!c.instructorEmail) {
      resultados.push({
        fecha: c.date,
        profesor,
        email: "-",
        tema: c.topicTitle,
        estado: "ERROR",
        mensaje: "La clase no tiene profesor en el sistema externo",
      });
      continue;
    }

    const minutos = c.minutes ?? c.plannedMinutes ?? 0;
    const claseLog: ClaseLog = {
      program_id: programId,
      group_id: c.groupId,
      topic_id: c.topicId,
      component_name: c.componentName,
      topic_title: c.topicTitle,
      fecha: c.date,
      horaInicio: c.start,
      minutos,
    };

    const idUsuario = idUsuarioPorEmail.get(c.instructorEmail) ?? null;

    if (!idUsuario) {
      if (minutos > 0) {
        await registrarLog(claseLog, c.instructorEmail, null, idProyecto, null, null, "SIN_EMPAREJAR", idEmpresaActor, actorEmail);
      }
      resultados.push({
        fecha: c.date,
        profesor,
        email: c.instructorEmail,
        tema: c.topicTitle,
        estado: "SIN_EMPAREJAR",
        mensaje: "Este profesor todavia no esta relacionado con un talento de Qronos",
      });
      continue;
    }

    if (minutos <= 0) {
      resultados.push({
        fecha: c.date,
        profesor,
        email: c.instructorEmail,
        tema: c.topicTitle,
        estado: "ERROR",
        mensaje: "La clase no tiene horario ni duracion planificada",
      });
      continue;
    }

    try {
      await procesarClaseEmparejada(claseLog, c.instructorEmail, idUsuario, idProyecto, idEmpresaActor, actorEmail);
      resultados.push({ fecha: c.date, profesor, email: c.instructorEmail, tema: c.topicTitle, estado: "IMPORTADO" });
    } catch (err) {
      resultados.push({
        fecha: c.date,
        profesor,
        email: c.instructorEmail,
        tema: c.topicTitle,
        estado: "ERROR",
        mensaje: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return resultados;
}

export function listarInstructoresExternosPendientes(idEmpresaActor: number) {
  return executeProcedure<InstructorExternoPendiente>("sp_instructores_externos_pendientes_listar", [idEmpresaActor]);
}

interface PendienteRow {
  id_importacion: number;
  program_id: number;
  group_id: number;
  topic_id: number;
  component_name: string;
  topic_title: string;
  fecha_clase: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  minutos: number;
  id_proyecto: number;
}

// Relaciona un instructor externo pendiente con un talento de Qronos, y
// de inmediato reprocesa cualquier clase suya que ya se habia visto
// pero quedo sin registrar por falta de este vinculo.
export async function relacionarInstructorExterno(
  idInstructorExterno: number,
  idUsuario: number,
  idEmpresaActor: number,
  actorEmail: string
): Promise<{ emailExterno: string; reprocesadas: number; totalPendientes: number }> {
  const [relacion] = await executeProcedure<{ email_externo: string }>("sp_instructor_externo_relacionar", [
    idInstructorExterno,
    idUsuario,
    idEmpresaActor,
    actorEmail,
  ]);
  const emailExterno = relacion.email_externo;

  const pendientes = await executeProcedure<PendienteRow>("sp_hora_dictada_pendientes_por_email_listar", [
    emailExterno,
    idEmpresaActor,
  ]);

  let reprocesadas = 0;
  for (const p of pendientes) {
    try {
      const claseLog: ClaseLog = {
        program_id: p.program_id,
        group_id: p.group_id,
        topic_id: p.topic_id,
        component_name: p.component_name,
        topic_title: p.topic_title,
        fecha: p.fecha_clase,
        horaInicio: p.hora_inicio ? p.hora_inicio.slice(0, 5) : null,
        minutos: p.minutos,
      };
      await procesarClaseEmparejada(claseLog, emailExterno, idUsuario, p.id_proyecto, idEmpresaActor, actorEmail);
      reprocesadas++;
    } catch {
      // Queda en SIN_EMPAREJAR para revisar a mano (ej. un choque de
      // horario real con otra tarea ya cargada) -- no bloquea el resto.
    }
  }

  return { emailExterno, reprocesadas, totalPendientes: pendientes.length };
}

export async function nombreInstructorExterno(idInstructorExterno: number, idEmpresaActor: number) {
  const rows = await executeQuery<{ email_externo: string; nombre_externo: string }>(
    "SELECT email_externo, nombre_externo FROM instructores_externos WHERE id_instructor_externo = ? AND id_empresa = ?",
    [idInstructorExterno, idEmpresaActor]
  );
  return rows[0] ?? null;
}
