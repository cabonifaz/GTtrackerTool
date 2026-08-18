import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";

// Plantilla en blanco para la carga masiva de tarifarios, con el mismo
// formato de 3 columnas que ya manejan los clientes (Id Rate / Rate /
// Rate p/h). El cliente y la moneda se eligen una sola vez en la pantalla
// de carga, no van por fila.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const workbook = new ExcelJS.Workbook();

    const plantilla = workbook.addWorksheet("Plantilla");
    plantilla.columns = [
      { header: "Id Rate", key: "id_rate", width: 12 },
      { header: "Rate", key: "rate", width: 30 },
      { header: "Rate p/h", key: "rate_ph", width: 12 },
    ];
    plantilla.getRow(1).font = { bold: true };
    plantilla.getColumn("rate_ph").numFmt = "0.00";

    const instrucciones = workbook.addWorksheet("Instrucciones");
    instrucciones.columns = [{ width: 90 }];
    instrucciones.addRows([
      ["Como llenar la plantilla"],
      [""],
      ["Id Rate: codigo interno del perfil (ej. S1), opcional -- solo de referencia."],
      ["Rate: nombre del perfil (ej. Dev Semi Senior). Obligatorio."],
      ["Rate p/h: tarifa por hora. Obligatoria, mayor a cero."],
      [""],
      [
        "El cliente y la moneda de la tarifa se eligen en la pantalla antes de subir el archivo -- todas las filas de una misma carga comparten la misma moneda.",
      ],
      [
        "Si ya existe un perfil con ese mismo nombre para el cliente elegido, se actualiza su tarifa (quedando historico de la anterior); si no existe, se crea.",
      ],
      [""],
      ["Ejemplo:"],
      ["Id Rate", "Rate", "Rate p/h"],
      ["S1", "Dev Semi Senior", 20],
      [""],
      ["No borres la fila de encabezados de la hoja 'Plantilla'. Puedes agregar tantas filas como necesites."],
    ]);
    instrucciones.getRow(1).font = { bold: true, size: 13 };
    instrucciones.getRow(10).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_tarifario.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
