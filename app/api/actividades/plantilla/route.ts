import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";

// Plantilla para la carga masiva de asignaciones (proyectos tipo
// Actividades por Excel). El periodo (desde/hasta) y el proyecto se
// eligen una sola vez en la pantalla de carga, no van por fila -- por
// eso no estan como columnas aca. La columna Detalle de Entregable se
// deja de ejemplo pero se ignora al importar: el talento la completa
// despues, dentro de la app.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const workbook = new ExcelJS.Workbook();

    const plantilla = workbook.addWorksheet("Plantilla");
    plantilla.columns = [
      { header: "Proveedor", key: "proveedor", width: 18 },
      { header: "N° OC/O", key: "oc_os", width: 14 },
      { header: "Número y nombre de Iniciativa", key: "iniciativa", width: 40 },
      { header: "Periodo actividades realizadas", key: "periodo", width: 24 },
      { header: "Detalle de Entregable", key: "detalle", width: 40 },
      { header: "Nombre de recurso asignado", key: "recurso", width: 24 },
      { header: "Lider Tecnico Asociado", key: "lider", width: 24 },
    ];
    plantilla.getRow(1).font = { bold: true };

    const instrucciones = workbook.addWorksheet("Instrucciones");
    instrucciones.columns = [{ width: 90 }];
    instrucciones.addRows([
      ["Como llenar la plantilla"],
      [""],
      ["Proveedor, N° OC/O, Número y nombre de Iniciativa, Lider Tecnico Asociado: texto libre, opcional."],
      ["Periodo actividades realizadas: solo de referencia (texto libre) -- el rango real que controla el acceso se elige en la pantalla antes de subir el archivo."],
      ["Detalle de Entregable: dejar vacio. Esa columna la completa cada talento dentro de la app (hasta 5 actividades por periodo)."],
      ["Nombre de recurso asignado: obligatorio. Debe coincidir con el nombre y apellido de un usuario ya creado en Usuarios."],
      [""],
      ["El proyecto y el periodo (desde/hasta) se eligen una sola vez en la pantalla, antes de subir el archivo -- todas las filas de una misma carga comparten el mismo periodo."],
      ["Si vuelves a subir una fila para el mismo talento y el mismo periodo, se actualiza (proveedor, OC/OS, iniciativa, lider) en vez de duplicarse."],
      [""],
      ["Ejemplo:"],
      ["Proveedor", "N° OC/O", "Número y nombre de Iniciativa", "Periodo actividades realizadas", "Detalle de Entregable", "Nombre de recurso asignado", "Lider Tecnico Asociado"],
      ["CELER SAC", "OC 30232", "15546 - Implementacion Internal Developer Portal", "31/08/2026", "", "Hugo Rodriguez", "AYVAR, DANIEL"],
      [""],
      ["No borres la fila de encabezados de la hoja 'Plantilla'. Puedes agregar tantas filas como necesites."],
    ]);
    instrucciones.getRow(1).font = { bold: true, size: 13 };
    instrucciones.getRow(11).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_actividades.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
