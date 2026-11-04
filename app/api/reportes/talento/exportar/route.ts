import { NextRequest, NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { construirReporteTalento } from "@/lib/services/reporteTalentoService";
import { generarExcel, nombreArchivoReporte, primerYUltimoDiaMes, respuestaExcel } from "@/lib/excelExport";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic",
];

export async function GET(req: NextRequest) {
  const session = await requireAdminOGestor();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idCliente = Number(params.get("idCliente"));
  const idUsuario = Number(params.get("idUsuario"));
  const anioDesde = Number(params.get("anioDesde"));
  const mesDesde = Number(params.get("mesDesde"));
  const anioHasta = Number(params.get("anioHasta"));
  const mesHasta = Number(params.get("mesHasta"));

  if (!idCliente || !idUsuario || !anioDesde || !mesDesde || !anioHasta || !mesHasta) {
    return NextResponse.json({ error: "Faltan parametros" }, { status: 400 });
  }

  try {
    const reporte = await construirReporteTalento(
      idCliente,
      idUsuario,
      anioDesde,
      mesDesde,
      anioHasta,
      mesHasta,
      session.user.idEmpresa!,
      session.user.idUsuario,
      session.user.rol
    );

    const buffer = await generarExcel([
      {
        nombre: "Evolucion mensual",
        columnas: [
          { header: "Mes", key: "mes", width: 14 },
          { header: "Estado", key: "estado", width: 12 },
          { header: "Horas reales", key: "horasReales", width: 14, numFmt: "0.00" },
          { header: "Horas planificadas", key: "horasPlanificadas", width: 18, numFmt: "0.00" },
          { header: "Monto facturado", key: "montoFacturado", width: 16, numFmt: "#,##0.00" },
          { header: "Monto planificado", key: "montoPlanificado", width: 16, numFmt: "#,##0.00" },
          { header: "Moneda", key: "moneda", width: 10 },
          { header: "Costo mensual", key: "costoMensual", width: 16, numFmt: "#,##0.00" },
          { header: "Margen $", key: "margenDinero", width: 14, numFmt: "#,##0.00" },
          { header: "Margen %", key: "margenPct", width: 12, numFmt: "0.0" },
        ],
        filas: reporte.meses.map((m) => ({
          mes: `${MESES[m.mes - 1]} ${m.anio}`,
          estado: m.es_ejecutado === 1 ? "Ejecutado" : m.horas_reales !== null ? "En curso" : "Futuro",
          horasReales: m.horas_reales ?? "",
          horasPlanificadas: m.horas_planificadas,
          montoFacturado: m.ingreso_real ?? "",
          montoPlanificado: m.ingreso_planificado,
          moneda: m.codigo_moneda ?? "",
          costoMensual: m.costo_mensual ?? "",
          margenDinero: m.margen_dinero ?? "",
          margenPct: m.margen_pct ?? "",
        })),
      },
      {
        nombre: "Historial perfiles",
        columnas: [
          { header: "Perfil", key: "perfil", width: 25 },
          { header: "Desde", key: "fecha_desde", width: 14 },
          { header: "Hasta", key: "fecha_hasta", width: 14 },
        ],
        filas: reporte.historialPerfiles.map((h) => ({
          perfil: h.perfil,
          fecha_desde: h.fecha_desde,
          fecha_hasta: h.fecha_hasta ?? "Vigente",
        })),
      },
      {
        nombre: "Historial tarifas",
        columnas: [
          { header: "Perfil", key: "perfil", width: 25 },
          { header: "Tarifa", key: "tarifa", width: 12, numFmt: "0.00" },
          { header: "Moneda", key: "codigo_moneda", width: 10 },
          { header: "Desde", key: "fecha_desde", width: 14 },
          { header: "Hasta", key: "fecha_hasta", width: 14 },
        ],
        filas: reporte.historialTarifas.map((h) => ({
          perfil: h.perfil,
          tarifa: Number(h.tarifa),
          codigo_moneda: h.codigo_moneda,
          fecha_desde: h.fecha_desde,
          fecha_hasta: h.fecha_hasta ?? "Vigente",
        })),
      },
      {
        nombre: "Historial costo",
        columnas: [
          { header: "Costo mensual", key: "costo_mensual", width: 16, numFmt: "#,##0.00" },
          { header: "Moneda", key: "codigo_moneda", width: 10 },
          { header: "Desde", key: "fecha_desde", width: 14 },
          { header: "Hasta", key: "fecha_hasta", width: 14 },
        ],
        filas: reporte.historialCosto.map((h) => ({
          costo_mensual: Number(h.costo_mensual),
          codigo_moneda: h.codigo_moneda,
          fecha_desde: h.fecha_desde,
          fecha_hasta: h.fecha_hasta ?? "Vigente",
        })),
      },
    ]);

    const primero = primerYUltimoDiaMes(anioDesde, mesDesde).primero;
    const ultimo = primerYUltimoDiaMes(anioHasta, mesHasta).ultimo;
    return respuestaExcel(buffer, nombreArchivoReporte("Talent", primero, ultimo));
  } catch (err) {
    return handleApiError(err);
  }
}
