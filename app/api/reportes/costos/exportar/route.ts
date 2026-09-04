import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteCostosMensual } from "@/lib/services/reporteService";
import { generarExcel, nombreArchivoReporte, primerYUltimoDiaMes, respuestaExcel } from "@/lib/excelExport";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idProyecto = params.get("idProyecto");
  const anio = params.get("anio");
  const mes = params.get("mes");

  if (!idProyecto || !anio || !mes) {
    return NextResponse.json({ error: "idProyecto, anio y mes son requeridos" }, { status: 400 });
  }

  try {
    const filas = await reporteCostosMensual(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!);

    const buffer = await generarExcel([
      {
        nombre: "Costos",
        columnas: [
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Calendario", key: "pais_calendario", width: 18 },
          { header: "Dias laborales del mes", key: "dias_laborales_totales_mes", width: 20 },
          { header: "Dias laborales a la fecha", key: "dias_laborales_a_fecha", width: 22 },
          { header: "Horas trabajadas", key: "horas_trabajadas", width: 16, numFmt: "0.00" },
          { header: "Horas sin tarifa", key: "horas_sin_tarifa", width: 16, numFmt: "0.00" },
          { header: "Moneda", key: "codigo_moneda", width: 10 },
          { header: "Costo total", key: "costo_total", width: 14, numFmt: "#,##0.00" },
        ],
        filas: filas.map((f) => ({
          ...f,
          pais_calendario: f.pais_calendario ?? "Sin calendario",
          horas_trabajadas: Number(f.horas_trabajadas),
          horas_sin_tarifa: Number(f.horas_sin_tarifa),
          costo_total: Number(f.costo_total),
        })),
      },
    ]);

    const { primero, ultimo } = primerYUltimoDiaMes(Number(anio), Number(mes));
    return respuestaExcel(buffer, nombreArchivoReporte("Costs", primero, ultimo));
  } catch (err) {
    return handleApiError(err);
  }
}
