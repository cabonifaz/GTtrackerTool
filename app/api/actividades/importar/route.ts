import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/apiHelpers";
import { BusinessError } from "@/lib/db";
import { upsertAsignacion } from "@/lib/services/actividadService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { ImportarAsignacionResultado } from "@/lib/types";

// Carga masiva de asignaciones (proveedor/OC-OS/iniciativa/lider tecnico) por
// talento y periodo, para proyectos tipo Actividades por Excel. El periodo
// (desde/hasta) se elige una sola vez para toda la carga, igual que el
// cliente/moneda en la carga de tarifarios -- no viene por fila. La columna
// "Detalle de Entregable" del archivo se ignora a proposito: esa parte la
// completa el talento despues, dentro de la app.

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
    .replace(/[̀-ͯ]/g, "")
    .replace(/°/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarNombre(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("archivo");
  const idProyecto = Number(form.get("idProyecto"));
  const periodoDesde = String(form.get("periodoDesde") ?? "");
  const periodoHasta = String(form.get("periodoHasta") ?? "");

  if (!(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo a importar" }, { status: 400 });
  }
  if (!idProyecto || !periodoDesde || !periodoHasta) {
    return NextResponse.json({ error: "Falta elegir el proyecto y el periodo (desde/hasta)" }, { status: 400 });
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

  const colProveedor = columnas.get("proveedor");
  const colOcOs = columnas.get("n oc/o") ?? columnas.get("oc/os") ?? columnas.get("nro oc/o");
  const colIniciativa = columnas.get("numero y nombre de iniciativa");
  const colPeriodoRef = columnas.get("periodo actividades realizadas");
  const colRecurso = columnas.get("nombre de recurso asignado");
  const colLider = columnas.get("lider tecnico asociado");

  if (!colRecurso) {
    return NextResponse.json(
      { error: "Falta la columna 'Nombre de recurso asignado' en el archivo" },
      { status: 400 }
    );
  }

  const usuarios = await listarUsuarios(session.user.idEmpresa!);
  const usuarioPorNombre = new Map(
    usuarios.filter((u) => u.activo).map((u) => [normalizarNombre(`${u.nombres} ${u.apellidos}`), u.id_usuario])
  );

  const resultados: ImportarAsignacionResultado[] = [];

  for (let fila = 2; fila <= sheet.rowCount; fila++) {
    const row = sheet.getRow(fila);
    const recurso = celdaTexto(row.getCell(colRecurso).value);
    const proveedor = colProveedor ? celdaTexto(row.getCell(colProveedor).value) || null : null;
    const ocOs = colOcOs ? celdaTexto(row.getCell(colOcOs).value) || null : null;
    const iniciativa = colIniciativa ? celdaTexto(row.getCell(colIniciativa).value) || null : null;
    const periodoRef = colPeriodoRef ? celdaTexto(row.getCell(colPeriodoRef).value) || null : null;
    const lider = colLider ? celdaTexto(row.getCell(colLider).value) || null : null;

    if (!recurso && !proveedor && !iniciativa) continue; // fila vacia, se omite en silencio

    try {
      if (!recurso) throw new Error("Falta el nombre de recurso asignado");
      const idUsuario = usuarioPorNombre.get(normalizarNombre(recurso));
      if (!idUsuario) {
        throw new Error(`No se encontro un usuario activo con el nombre "${recurso}" -- creelo primero en Usuarios`);
      }

      await upsertAsignacion(
        idProyecto,
        idUsuario,
        proveedor,
        ocOs,
        iniciativa,
        periodoDesde,
        periodoHasta,
        periodoRef,
        lider,
        session.user.idEmpresa!,
        session.user.email ?? ""
      );
      resultados.push({ fila, ok: true, mensaje: "Cargado", recurso });
    } catch (err) {
      resultados.push({
        fila,
        ok: false,
        mensaje: err instanceof BusinessError || err instanceof Error ? err.message : "Error al importar la fila",
        recurso,
      });
    }
  }

  return NextResponse.json(resultados);
}
