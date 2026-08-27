import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { requireSession } from "@/lib/apiHelpers";
import { BusinessError } from "@/lib/db";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarTareas } from "@/lib/services/tareaService";
import { crearRegistroManual } from "@/lib/services/cronometroService";
import { ImportarFilaResultado } from "@/lib/types";

// Las columnas se resuelven por el nombre del encabezado (fila 1), no por
// posicion fija. Se aceptan dos formatos de fecha/hora:
//   - separado (el que genera la plantilla): Fecha Inicio, Hora Inicio, Fecha Fin, Hora Fin
//   - combinado (un "Exportar Excel" reeditado): Inicio, Fin (fecha+hora en una sola celda)
// Colaborador/Cliente/Horas (si vienen, por ser un export reeditado) se ignoran.
// El resto de las reglas (longitud de nombre de tarea, existencia/asignacion
// del proyecto, solapamiento de horarios, actualizar en vez de duplicar si
// la fecha/hora de inicio coincide con un registro existente) las valida el
// propio SP sp_registro_tiempo_crear_manual.

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

function normalizarEncabezado(valor: ExcelJS.CellValue): string {
  return celdaTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function celdaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object" && "text" in (valor as { text?: unknown })) {
    return String((valor as { text?: unknown }).text ?? "").trim();
  }
  return String(valor).trim();
}

function parsearFechaSolo(valor: ExcelJS.CellValue, etiqueta: string): Resultado<string> {
  const pad = (n: number) => String(n).padStart(2, "0");

  if (valor === null || valor === undefined || celdaTexto(valor) === "") {
    return { ok: false, error: `Falta ${etiqueta}` };
  }
  if (valor instanceof Date) {
    return {
      ok: true,
      valor: `${valor.getUTCFullYear()}-${pad(valor.getUTCMonth() + 1)}-${pad(valor.getUTCDate())}`,
    };
  }

  const texto = celdaTexto(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return { ok: true, valor: texto };

  const fecha = new Date(texto);
  if (!isNaN(fecha.getTime())) {
    return { ok: true, valor: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` };
  }
  return { ok: false, error: `Formato de ${etiqueta} invalido (usa AAAA-MM-DD): "${texto}"` };
}

function parsearHoraSolo(valor: ExcelJS.CellValue, etiqueta: string): Resultado<string> {
  const pad = (n: number) => String(n).padStart(2, "0");

  if (valor === null || valor === undefined || celdaTexto(valor) === "") {
    return { ok: false, error: `Falta ${etiqueta}` };
  }
  if (valor instanceof Date) {
    return {
      ok: true,
      valor: `${pad(valor.getUTCHours())}:${pad(valor.getUTCMinutes())}:${pad(valor.getUTCSeconds())}`,
    };
  }
  if (typeof valor === "number") {
    // Excel guarda las horas como fraccion de dia (0.375 = 09:00) cuando la celda no trae formato de hora.
    const totalSegundos = Math.round(valor * 86400);
    const h = Math.floor(totalSegundos / 3600) % 24;
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    return { ok: true, valor: `${pad(h)}:${pad(m)}:${pad(s)}` };
  }

  const texto = celdaTexto(valor);
  const match = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return { ok: false, error: `Formato de ${etiqueta} invalido (usa HH:MM): "${texto}"` };
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) {
    return { ok: false, error: `Hora fuera de rango en ${etiqueta}: "${texto}"` };
  }
  return { ok: true, valor: `${pad(h)}:${pad(m)}:${pad(Number(match[3] ?? "0"))}` };
}

function parsearFechaHoraCombinada(valor: ExcelJS.CellValue, etiqueta: string): Resultado<string> {
  const pad = (n: number) => String(n).padStart(2, "0");

  if (valor === null || valor === undefined || celdaTexto(valor) === "") {
    return { ok: false, error: `Falta ${etiqueta}` };
  }
  if (valor instanceof Date) {
    return {
      ok: true,
      valor: `${valor.getUTCFullYear()}-${pad(valor.getUTCMonth() + 1)}-${pad(valor.getUTCDate())} ${pad(valor.getUTCHours())}:${pad(valor.getUTCMinutes())}:${pad(valor.getUTCSeconds())}`,
    };
  }

  const texto = celdaTexto(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return { ok: true, valor: texto };

  const fecha = new Date(texto);
  if (!isNaN(fecha.getTime())) {
    return {
      ok: true,
      valor: `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`,
    };
  }
  return { ok: false, error: `Formato de ${etiqueta} invalido (usa AAAA-MM-DD HH:MM:SS): "${texto}"` };
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("archivo");
  if (!(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo a importar" }, { status: 400 });
  }

  const nombreArchivo = archivo instanceof File ? archivo.name : "";
  const esCsv = nombreArchivo.toLowerCase().endsWith(".csv") || archivo.type === "text/csv";

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  let sheet: ExcelJS.Worksheet | undefined;
  if (esCsv) {
    // Se fuerza a que cada celda quede como texto plano (sin la
    // auto-deteccion de fechas/numeros de exceljs, que interpreta fechas
    // en hora local y puede convertir de mas): asi el CSV pasa por el
    // mismo parseo de texto que ya usan las columnas separadas de Excel.
    sheet = await workbook.csv.read(Readable.from(buffer), {
      map: (datum: string) => (datum === "" ? null : datum),
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- desajuste de tipos entre exceljs y la version de @types/node instalada
    await workbook.xlsx.load(buffer as any);
    sheet = workbook.worksheets[0];
  }
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene datos" }, { status: 400 });
  }

  const columnas = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    columnas.set(normalizarEncabezado(cell.value), colNumber);
  });

  if (!columnas.has("proyecto") || !columnas.has("tarea")) {
    return NextResponse.json(
      { error: "Faltan columnas en el archivo: Proyecto, Tarea" },
      { status: 400 }
    );
  }

  const colProyecto = columnas.get("proyecto")!;
  const colTarea = columnas.get("tarea")!;
  const colDescripcion = columnas.get("descripcion");

  const colFechaInicio = columnas.get("fecha inicio");
  const colHoraInicio = columnas.get("hora inicio");
  const colFechaFin = columnas.get("fecha fin");
  const colHoraFin = columnas.get("hora fin");
  const usaFechaHoraSeparada = !!(colFechaInicio && colHoraInicio && colFechaFin && colHoraFin);

  const colInicioCombinado = columnas.get("inicio");
  const colFinCombinado = columnas.get("fin");
  const usaFechaHoraCombinada = !!(colInicioCombinado && colFinCombinado);

  if (!usaFechaHoraSeparada && !usaFechaHoraCombinada) {
    return NextResponse.json(
      {
        error:
          "Faltan columnas de fecha/hora: usa 'Fecha Inicio, Hora Inicio, Fecha Fin, Hora Fin' o 'Inicio, Fin'",
      },
      { status: 400 }
    );
  }

  function obtenerFechaInicio(row: ExcelJS.Row): Resultado<string> {
    if (usaFechaHoraSeparada) {
      const fecha = parsearFechaSolo(row.getCell(colFechaInicio!).value, "Fecha Inicio");
      if (!fecha.ok) return fecha;
      const hora = parsearHoraSolo(row.getCell(colHoraInicio!).value, "Hora Inicio");
      if (!hora.ok) return hora;
      return { ok: true, valor: `${fecha.valor} ${hora.valor}` };
    }
    return parsearFechaHoraCombinada(row.getCell(colInicioCombinado!).value, "Inicio");
  }

  function obtenerFechaFin(row: ExcelJS.Row): Resultado<string> {
    if (usaFechaHoraSeparada) {
      const fecha = parsearFechaSolo(row.getCell(colFechaFin!).value, "Fecha Fin");
      if (!fecha.ok) return fecha;
      const hora = parsearHoraSolo(row.getCell(colHoraFin!).value, "Hora Fin");
      if (!hora.ok) return hora;
      return { ok: true, valor: `${fecha.valor} ${hora.valor}` };
    }
    return parsearFechaHoraCombinada(row.getCell(colFinCombinado!).value, "Fin");
  }

  const [proyectosVisibles, tareasVisibles] = await Promise.all([
    listarProyectos(session.user.idUsuario, session.user.rol, session.user.idEmpresa!),
    listarTareas(null, session.user.idUsuario, session.user.rol, session.user.idEmpresa!),
  ]);

  const proyectoPorNombre = new Map(proyectosVisibles.map((p) => [p.nombre.trim().toLowerCase(), p]));
  const tareaPorClave = new Map(
    tareasVisibles.map((t) => [`${t.id_proyecto}::${t.nombre.trim().toLowerCase()}`, t.id_tarea])
  );

  const resultados: ImportarFilaResultado[] = [];

  for (let fila = 2; fila <= sheet.rowCount; fila++) {
    const row = sheet.getRow(fila);
    const proyectoNombre = celdaTexto(row.getCell(colProyecto).value);
    if (!proyectoNombre) continue; // fila vacia, se omite en silencio

    const tareaNombre = celdaTexto(row.getCell(colTarea).value);
    const descripcion = colDescripcion ? celdaTexto(row.getCell(colDescripcion).value) || null : null;

    const fechaInicioResultado = obtenerFechaInicio(row);
    const fechaFinResultado = obtenerFechaFin(row);
    const detalle = {
      proyecto: proyectoNombre,
      tarea: tareaNombre,
      fechaInicio: fechaInicioResultado.ok ? fechaInicioResultado.valor : null,
      fechaFin: fechaFinResultado.ok ? fechaFinResultado.valor : null,
    };

    try {
      if (!fechaInicioResultado.ok) throw new Error(fechaInicioResultado.error);
      if (!fechaFinResultado.ok) throw new Error(fechaFinResultado.error);
      if (!tareaNombre) throw new Error("Falta el nombre de la tarea");

      const proyecto = proyectoPorNombre.get(proyectoNombre.toLowerCase());
      if (!proyecto) {
        throw new Error(`El proyecto "${proyectoNombre}" no existe o no esta asignado a tu usuario`);
      }

      const claveTarea = `${proyecto.id_proyecto}::${tareaNombre.toLowerCase()}`;
      const idTareaExistente = tareaPorClave.get(claveTarea);

      const resultado = await crearRegistroManual(
        session.user.idUsuario,
        idTareaExistente
          ? { idTarea: idTareaExistente }
          : { idProyecto: proyecto.id_proyecto, nombreTarea: tareaNombre },
        fechaInicioResultado.valor,
        fechaFinResultado.valor,
        descripcion,
        session.user.email ?? "",
        session.user.rol,
        session.user.idEmpresa!
      );

      if (!idTareaExistente) {
        tareaPorClave.set(claveTarea, resultado[0].id_tarea);
      }

      resultados.push({
        fila,
        ok: true,
        mensaje: resultado[0].actualizado ? "Actualizado (misma fecha/hora que un registro existente)" : "Importado",
        ...detalle,
      });
    } catch (err) {
      resultados.push({
        fila,
        ok: false,
        mensaje: err instanceof BusinessError || err instanceof Error ? err.message : "Error al importar la fila",
        ...detalle,
      });
    }
  }

  return NextResponse.json(resultados);
}
