import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export interface ColumnaExcel {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

export interface HojaExcel {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Record<string, unknown>[];
}

// Helper compartido para los distintos "Exportar Excel" de Reportes --
// cada ruta solo arma sus columnas/filas, esto arma el libro.
export async function generarExcel(hojas: HojaExcel[]) {
  const workbook = new ExcelJS.Workbook();
  for (const hoja of hojas) {
    const sheet = workbook.addWorksheet(hoja.nombre);
    sheet.columns = hoja.columnas.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 20,
      style: c.numFmt ? { numFmt: c.numFmt } : undefined,
    }));
    sheet.getRow(1).font = { bold: true };
    for (const fila of hoja.filas) sheet.addRow(fila);
  }
  return workbook.xlsx.writeBuffer();
}

export function respuestaExcel(buffer: Awaited<ReturnType<typeof generarExcel>>, filename: string): NextResponse {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
