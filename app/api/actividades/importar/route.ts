import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/apiHelpers";
import { BusinessError } from "@/lib/db";
import { upsertAsignacion } from "@/lib/services/actividadService";
import { crearUsuario, listarUsuarios } from "@/lib/services/usuarioService";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import { PASSWORD_GENERICA } from "@/lib/constants";
import { ImportarAsignacionResultado } from "@/lib/types";
import { generarEmailUnico, normalizarNombre, partirNombre, resolverDominioCorreo } from "@/lib/services/recursoService";

// Carga masiva de asignaciones (proveedor/OC-OS/iniciativa/lider tecnico) por
// talento, para proyectos tipo Actividades por Excel. El periodo (desde/
// hasta) de cada fila sale de la columna "Periodo actividades realizadas"
// del propio archivo -- no se pide aparte. Esa columna trae la fecha de
// corte del mes (ej. 31/07/2026); el periodo de esa fila queda del dia 1
// de ese mes hasta esa fecha. La columna "Detalle de Entregable" se
// ignora a proposito: esa parte la completa el talento despues, dentro
// de la app. Si el "Nombre de recurso asignado" no coincide con ningun
// usuario ya creado, se crea uno nuevo automaticamente (rol Talento,
// clave generica, email sintetico) en vez de fallar la fila.

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

function celdaFecha(valor: ExcelJS.CellValue): Date | null {
  if (valor instanceof Date) return valor;
  const texto = celdaTexto(valor);
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const fecha = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(fecha.getTime()) ? null : fecha;
}

function aFechaISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function aFechaTexto(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function primerDiaDelMes(d: Date): string {
  return aFechaISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("archivo");
  const idProyecto = Number(form.get("idProyecto"));

  if (!(archivo instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo a importar" }, { status: 400 });
  }
  if (!idProyecto) {
    return NextResponse.json({ error: "Falta elegir el proyecto" }, { status: 400 });
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
  const colPeriodo = columnas.get("periodo actividades realizadas");
  const colRecurso = columnas.get("nombre de recurso asignado");
  const colLider = columnas.get("lider tecnico asociado");

  if (!colRecurso || !colPeriodo) {
    return NextResponse.json(
      { error: "Faltan columnas en el archivo: Nombre de recurso asignado, Periodo actividades realizadas" },
      { status: 400 }
    );
  }

  const empresaSlug = session.user.empresaSlug ?? "empresa";
  const empresa = await obtenerEmpresaPorSlug(empresaSlug);
  const dominioCorreo = resolverDominioCorreo(empresa?.dominio_correo, empresaSlug);
  const usuarios = await listarUsuarios(session.user.idEmpresa!);
  const usuarioPorNombre = new Map(usuarios.map((u) => [normalizarNombre(`${u.nombres} ${u.apellidos}`), u.id_usuario]));
  const emailsExistentes = new Set(usuarios.map((u) => u.email.toLowerCase()));
  const passwordHash = await bcrypt.hash(PASSWORD_GENERICA, 10);

  const resultados: ImportarAsignacionResultado[] = [];

  for (let fila = 2; fila <= sheet.rowCount; fila++) {
    const row = sheet.getRow(fila);
    const recurso = celdaTexto(row.getCell(colRecurso).value);
    const proveedor = colProveedor ? celdaTexto(row.getCell(colProveedor).value).slice(0, 150) || null : null;
    const ocOs = colOcOs ? celdaTexto(row.getCell(colOcOs).value).slice(0, 50) || null : null;
    const iniciativa = colIniciativa ? celdaTexto(row.getCell(colIniciativa).value).slice(0, 255) || null : null;
    const celdaPeriodo = row.getCell(colPeriodo).value;
    const periodoFecha = celdaFecha(celdaPeriodo);
    // Si la celda vino como fecha real de Excel, se formatea corto (DD/MM/YYYY)
    // para guardar como referencia -- el toString() nativo de un Date es un
    // texto largo tipo "Thu Jul 30 2026 19:00:00 GMT-0500 (...)" que no entra
    // en la columna. Si no parseo como fecha, se usa el texto tal cual (solo
    // para el mensaje de error, esa fila nunca llega a guardarse).
    const periodoTexto = periodoFecha ? aFechaTexto(periodoFecha) : celdaTexto(celdaPeriodo).slice(0, 50);
    const lider = colLider ? celdaTexto(row.getCell(colLider).value).slice(0, 150) || null : null;

    if (!recurso && !proveedor && !iniciativa) continue; // fila vacia, se omite en silencio

    try {
      if (!recurso) throw new Error("Falta el nombre de recurso asignado");

      if (!periodoFecha) {
        throw new Error(`Periodo invalido: "${periodoTexto}" (se espera una fecha, ej. 31/07/2026)`);
      }

      let idUsuario = usuarioPorNombre.get(normalizarNombre(recurso));
      let mensajeCreacion = "";

      if (!idUsuario) {
        const { nombres, apellidos } = partirNombre(recurso);
        const email = generarEmailUnico(nombres, apellidos, dominioCorreo, emailsExistentes);

        const creado = await crearUsuario(
          nombres,
          apellidos,
          email,
          passwordHash,
          "TALENTO",
          session.user.idEmpresa!,
          null,
          session.user.email ?? ""
        );
        idUsuario = creado[0].id_usuario;
        usuarioPorNombre.set(normalizarNombre(recurso), idUsuario);
        emailsExistentes.add(email);
        mensajeCreacion = ` (usuario nuevo creado: ${email}, clave generica)`;
      }

      await upsertAsignacion(
        idProyecto,
        idUsuario,
        proveedor,
        ocOs,
        iniciativa,
        primerDiaDelMes(periodoFecha),
        aFechaISO(periodoFecha),
        periodoTexto,
        lider,
        session.user.idEmpresa!,
        session.user.email ?? ""
      );
      resultados.push({ fila, ok: true, mensaje: `Cargado${mensajeCreacion}`, recurso });
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
