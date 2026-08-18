import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";

// Plantilla en blanco para la carga masiva de usuarios. Las columnas
// coinciden con lo que espera POST /api/usuarios/importar (resueltas por
// nombre de encabezado, no por posicion).
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const workbook = new ExcelJS.Workbook();

    const plantilla = workbook.addWorksheet("Plantilla");
    plantilla.columns = [
      { header: "Nombres", key: "nombres", width: 25 },
      { header: "Apellidos", key: "apellidos", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Rol", key: "rol", width: 12 },
      { header: "Documento", key: "documento", width: 20 },
    ];
    plantilla.getRow(1).font = { bold: true };

    const instrucciones = workbook.addWorksheet("Instrucciones");
    instrucciones.columns = [{ width: 90 }];
    instrucciones.addRows([
      ["Como llenar la plantilla"],
      [""],
      ["Nombres / Apellidos: obligatorios."],
      ["Email: obligatorio y unico -- si ya existe un usuario con ese email, esa fila se salta."],
      ["Rol: ADMIN o TALENTO (si se deja vacio, se usa TALENTO)."],
      ["Documento: numero de documento de identidad, opcional."],
      [""],
      ["Todos los usuarios creados reciben la misma contrasena temporal generica y deberan cambiarla en su primer login."],
      [""],
      ["Ejemplo:"],
      ["Nombres", "Apellidos", "Email", "Rol", "Documento"],
      ["Maria", "Perez", "maria.perez@ejemplo.com", "TALENTO", "12345678"],
      [""],
      ["No borres la fila de encabezados de la hoja 'Plantilla'. Puedes agregar tantas filas como necesites."],
    ]);
    instrucciones.getRow(1).font = { bold: true, size: 13 };
    instrucciones.getRow(8).font = { italic: true };
    instrucciones.getRow(11).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="plantilla_usuarios.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
