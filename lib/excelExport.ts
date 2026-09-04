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

// Nombre de archivo consistente para todas las exportaciones de Reportes:
// Qronos_Report_<Tipo>_DD_MM_YYYY-DD_MM_YYYY.xlsx
export function nombreArchivoReporte(tipo: string, fechaInicio: string, fechaFin: string): string {
  const aDDMMYYYY = (f: string) => {
    const [y, m, d] = f.slice(0, 10).split("-");
    return `${d}_${m}_${y}`;
  };
  return `Qronos_Report_${tipo}_${aDDMMYYYY(fechaInicio)}-${aDDMMYYYY(fechaFin)}.xlsx`;
}

export function primerYUltimoDiaMes(anio: number, mes: number): { primero: string; ultimo: string } {
  const primero = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const finDeMes = new Date(anio, mes, 0);
  const ultimo = `${finDeMes.getFullYear()}-${String(finDeMes.getMonth() + 1).padStart(2, "0")}-${String(finDeMes.getDate()).padStart(2, "0")}`;
  return { primero, ultimo };
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
