import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/apiHelpers";
import { BusinessError } from "@/lib/db";
import { crearPerfil, editarTarifaPerfil, listarPerfiles } from "@/lib/services/perfilService";
import { ImportarPerfilResultado } from "@/lib/types";

// Cuadro de tarifas del cliente (formato "Id Rate / Rate / Rate p/h"), a
// nivel de todo el cliente -- reutilizable en cualquiera de sus proyectos,
// igual que un perfil creado a mano. Si el nombre ya existe para ese
// cliente se actualiza la tarifa (con historico); si no, se crea.

function celdaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object" && "text" in (valor as { text?: unknown })) {
    return String((valor as { text?: unknown }).text ?? "").trim();
  }
  return String(valor).trim();
}

function normalizarEncabezado(valor: ExcelJS.CellValue): string {
  return celdaTexto(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("archivo");
  const idCliente = Number(form.get("idCliente"));
  const codigoMoneda = String(form.get("codigoMoneda") ?? "");
  const idMoneda = Number(form.get("idMoneda"));

  if (!(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo a importar" }, { status: 400 });
  }
  if (!idCliente || !idMoneda || !codigoMoneda) {
    return NextResponse.json({ error: "Falta elegir el cliente y la moneda" }, { status: 400 });
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

  const colIdRate = columnas.get("id rate");
  const colRate = columnas.get("rate");
  const colRatePh = columnas.get("rate p/h");

  if (!colRate || !colRatePh) {
    return NextResponse.json({ error: "Faltan columnas en el archivo: Rate, Rate p/h" }, { status: 400 });
  }

  const perfilesExistentes = await listarPerfiles(idCliente, session.user.idEmpresa!);
  const perfilPorNombre = new Map(perfilesExistentes.map((p) => [p.nombre.trim().toLowerCase(), p.id_perfil]));

  const resultados: ImportarPerfilResultado[] = [];

  for (let fila = 2; fila <= sheet.rowCount; fila++) {
    const row = sheet.getRow(fila);
    const idRate = colIdRate ? celdaTexto(row.getCell(colIdRate).value) || null : null;
    const rate = celdaTexto(row.getCell(colRate).value);
    const ratePhTexto = celdaTexto(row.getCell(colRatePh).value);
    if (!idRate && !rate && !ratePhTexto) continue; // fila vacia, se omite en silencio

    try {
      if (!rate) throw new Error("Falta el nombre (Rate)");
      const ratePh = Number(ratePhTexto.replace(",", "."));
      if (!ratePhTexto || isNaN(ratePh) || ratePh <= 0) {
        throw new Error(`Rate p/h invalido: "${ratePhTexto}"`);
      }

      const clave = rate.trim().toLowerCase();
      const idPerfilExistente = perfilPorNombre.get(clave);

      if (idPerfilExistente) {
        await editarTarifaPerfil(idPerfilExistente, ratePh, idMoneda, idRate, session.user.idEmpresa!, session.user.email ?? "");
        resultados.push({ fila, ok: true, mensaje: "Actualizado", idRate, rate });
      } else {
        const creado = await crearPerfil(idCliente, rate, idRate, ratePh, idMoneda, session.user.idEmpresa!, session.user.email ?? "");
        perfilPorNombre.set(clave, creado[0].id_perfil);
        resultados.push({ fila, ok: true, mensaje: "Creado", idRate, rate });
      }
    } catch (err) {
      resultados.push({
        fila,
        ok: false,
        mensaje: err instanceof BusinessError || err instanceof Error ? err.message : "Error al importar la fila",
        idRate,
        rate,
      });
    }
  }

  return NextResponse.json(resultados);
}
