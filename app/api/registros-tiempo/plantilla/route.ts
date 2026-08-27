import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireSession, handleApiError } from "@/lib/apiHelpers";

// Plantilla en blanco para la carga masiva de registros de tiempo. Las
// columnas coinciden con lo que espera POST /api/registros-tiempo/importar
// (resueltas por nombre de encabezado, no por posicion). Fecha y hora van
// en columnas separadas tanto para el inicio como para el fin.
export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const workbook = new ExcelJS.Workbook();

    const plantilla = workbook.addWorksheet("Plantilla");
    plantilla.columns = [
      { header: "Proyecto", key: "proyecto", width: 25 },
      { header: "Tarea", key: "tarea", width: 30 },
      { header: "Fecha Inicio", key: "fecha_inicio", width: 15 },
      { header: "Hora Inicio", key: "hora_inicio", width: 13 },
      { header: "Fecha Fin", key: "fecha_fin", width: 15 },
      { header: "Hora Fin", key: "hora_fin", width: 13 },
      { header: "Descripcion", key: "descripcion", width: 35 },
    ];
    plantilla.getRow(1).font = { bold: true };
    plantilla.getColumn("fecha_inicio").numFmt = "yyyy-mm-dd";
    plantilla.getColumn("fecha_fin").numFmt = "yyyy-mm-dd";
    plantilla.getColumn("hora_inicio").numFmt = "hh:mm";
    plantilla.getColumn("hora_fin").numFmt = "hh:mm";

    // Fila de ejemplo directo en la hoja que se llena, en gris e italica
    // para que se note que hay que reemplazarla/borrarla -- no solo queda
    // el ejemplo escondido en la hoja de Instrucciones.
    const filaEjemplo = plantilla.addRow({
      proyecto: "Sitio Web",
      tarea: "Maquetar home",
      fecha_inicio: "2026-08-20",
      hora_inicio: "09:00",
      fecha_fin: "2026-08-20",
      hora_fin: "11:30",
      descripcion: "Avance de la home (ejemplo -- borra esta fila)",
    });
    filaEjemplo.font = { italic: true, color: { argb: "FF9CA3AF" } };

    const instrucciones = workbook.addWorksheet("Instrucciones");
    instrucciones.columns = [{ width: 90 }];
    instrucciones.addRows([
      ["Como llenar la plantilla"],
      [""],
      ["La hoja 'Plantilla' ya trae una fila de ejemplo en gris -- borrala y agrega tus propias filas."],
      ["El importador tambien acepta el mismo formato en un archivo .csv, no hace falta que sea .xlsx."],
      [""],
      ["Proyecto: el nombre exacto de uno de tus proyectos asignados."],
      [
        "Tarea: el nombre de una tarea existente en ese proyecto, o un nombre nuevo -- si no existe, se crea automaticamente al importar.",
      ],
      ["Fecha Inicio / Fecha Fin: en formato AAAA-MM-DD, por ejemplo 2026-08-20."],
      ["Hora Inicio / Hora Fin: en formato HH:MM (24 horas), por ejemplo 09:00 o 17:30."],
      ["Descripcion: opcional."],
      [""],
      ["Ejemplo:"],
      ["Proyecto", "Tarea", "Fecha Inicio", "Hora Inicio", "Fecha Fin", "Hora Fin", "Descripcion"],
      ["Sitio Web", "Maquetar home", "2026-08-20", "09:00", "2026-08-20", "11:30", "Avance de la home"],
      [""],
      ["No borres la fila de encabezados de la hoja 'Plantilla'. Puedes agregar tantas filas como necesites."],
    ]);
    instrucciones.getRow(1).font = { bold: true, size: 13 };
    instrucciones.getRow(12).font = { italic: true };
    instrucciones.getRow(13).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_registros_tiempo.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
