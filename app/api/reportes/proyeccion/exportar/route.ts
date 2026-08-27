import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteProyeccionCliente } from "@/lib/services/reporteService";
import { generarExcel, respuestaExcel } from "@/lib/excelExport";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idCliente = params.get("idCliente");
  const mesesAtras = params.get("mesesAtras");
  const mesesAdelante = params.get("mesesAdelante");

  if (!idCliente) {
    return NextResponse.json({ error: "idCliente es requerido" }, { status: 400 });
  }

  try {
    const filas = await reporteProyeccionCliente(
      Number(idCliente),
      Number(mesesAtras ?? 3),
      Number(mesesAdelante ?? 6),
      session.user.idEmpresa!
    );

    const buffer = await generarExcel([
      {
        nombre: "Proyeccion",
        columnas: [
          { header: "Mes", key: "mes_texto", width: 18 },
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Estado", key: "estado", width: 12 },
          { header: "Dias laborales", key: "dias_laborales", width: 14 },
          { header: "Horas planificadas", key: "horas_planificadas", width: 18, numFmt: "0.00" },
          { header: "Moneda", key: "codigo_moneda", width: 10 },
          { header: "Ingreso planificado", key: "ingreso_planificado", width: 18, numFmt: "#,##0.00" },
          { header: "Horas reales", key: "horas_reales", width: 14, numFmt: "0.00" },
          { header: "Ingreso real", key: "ingreso_real", width: 16, numFmt: "#,##0.00" },
        ],
        filas: filas.map((f) => ({
          ...f,
          mes_texto: `${MESES[f.mes - 1]} ${f.anio}`,
          estado: f.es_ejecutado === 1 ? "Ejecutado" : "Proyectado",
          horas_planificadas: Number(f.horas_planificadas),
          ingreso_planificado: Number(f.ingreso_planificado),
          horas_reales: f.horas_reales === null ? null : Number(f.horas_reales),
          ingreso_real: f.ingreso_real === null ? null : Number(f.ingreso_real),
        })),
      },
    ]);

    return respuestaExcel(buffer, `proyeccion_cliente_${idCliente}.xlsx`);
  } catch (err) {
    return handleApiError(err);
  }
}
