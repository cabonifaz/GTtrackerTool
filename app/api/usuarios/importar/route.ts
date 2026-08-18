import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiHelpers";
import { BusinessError } from "@/lib/db";
import { crearUsuario } from "@/lib/services/usuarioService";
import { PASSWORD_GENERICA } from "@/lib/constants";
import { ImportarUsuarioResultado } from "@/lib/types";

// Columnas resueltas por nombre de encabezado (fila 1), no por posicion.
// Rol vacio => TALENTO. Documento es opcional. Los emails repetidos
// dentro del propio archivo, o que ya existan en la base, se saltan y
// quedan marcados en el resultado -- nunca se crean duplicados.

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

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("archivo");
  if (!(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo a importar" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- desajuste de tipos entre exceljs y la version de @types/node instalada
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });
  }

  const columnas = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    columnas.set(normalizarEncabezado(cell.value), colNumber);
  });

  if (!columnas.has("nombres") || !columnas.has("apellidos") || !columnas.has("email")) {
    return NextResponse.json(
      { error: "Faltan columnas en el archivo: Nombres, Apellidos, Email" },
      { status: 400 }
    );
  }

  const colNombres = columnas.get("nombres")!;
  const colApellidos = columnas.get("apellidos")!;
  const colEmail = columnas.get("email")!;
  const colRol = columnas.get("rol");
  const colDocumento = columnas.get("documento");

  const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);
  const emailsEnArchivo = new Set<string>();
  const resultados: ImportarUsuarioResultado[] = [];

  for (let fila = 2; fila <= sheet.rowCount; fila++) {
    const row = sheet.getRow(fila);
    const nombres = celdaTexto(row.getCell(colNombres).value);
    const apellidos = celdaTexto(row.getCell(colApellidos).value);
    const email = celdaTexto(row.getCell(colEmail).value);
    if (!nombres && !apellidos && !email) continue; // fila vacia, se omite en silencio

    const rolTexto = colRol ? celdaTexto(row.getCell(colRol).value).toUpperCase() : "";
    const codigoRol = rolTexto === "ADMIN" ? "ADMIN" : "TALENTO";
    const documento = colDocumento ? celdaTexto(row.getCell(colDocumento).value) || null : null;
    const emailNormalizado = email.toLowerCase();

    try {
      if (!nombres || !apellidos) throw new Error("Faltan Nombres o Apellidos");
      if (!email) throw new Error("Falta el Email");
      if (colRol && rolTexto && rolTexto !== "ADMIN" && rolTexto !== "TALENTO") {
        throw new Error(`Rol invalido: "${rolTexto}" (usa ADMIN o TALENTO)`);
      }
      if (emailsEnArchivo.has(emailNormalizado)) {
        throw new Error("Email duplicado dentro del mismo archivo, no se subio");
      }

      await crearUsuario(
        nombres,
        apellidos,
        email,
        passwordHash,
        codigoRol,
        session.user.idEmpresa,
        documento,
        session.user.email ?? ""
      );

      emailsEnArchivo.add(emailNormalizado);
      resultados.push({ fila, ok: true, mensaje: "Creado", nombres, apellidos, email });
    } catch (err) {
      resultados.push({
        fila,
        ok: false,
        mensaje: err instanceof BusinessError || err instanceof Error ? err.message : "Error al importar la fila",
        nombres,
        apellidos,
        email,
      });
    }
  }

  return NextResponse.json(resultados);
}
