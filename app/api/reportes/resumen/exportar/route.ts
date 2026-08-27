import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteResumenAvance, reporteResumenAvanceDetalle } from "@/lib/services/reporteService";
import { generarExcel, respuestaExcel } from "@/lib/excelExport";

// Exporta el resumen de avance JUNTO con su fuente de datos: los
// registros_tiempo individuales que se suman para dar "horas trabajadas"
// en el resumen, en una segunda hoja -- para que se pueda auditar de
// donde sale cada numero, no solo verlo agregado.
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
    const [resumen, detalle] = await Promise.all([
      reporteResumenAvance(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!),
      reporteResumenAvanceDetalle(Number(idProyecto), Number(anio), Number(mes), session.user.idEmpresa!),
    ]);

    const buffer = await generarExcel([
      {
        nombre: "Resumen",
        columnas: [
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Activo", key: "activo", width: 10 },
          { header: "Calendario", key: "pais_calendario", width: 18 },
          { header: "Dias laborales del mes", key: "dias_laborales_totales_mes", width: 20 },
          { header: "Dias laborales a la fecha", key: "dias_laborales_a_fecha", width: 22 },
          { header: "Horas trabajadas", key: "horas_trabajadas", width: 16, numFmt: "0.00" },
          { header: "Horas planificadas", key: "horas_planificadas_a_fecha", width: 18, numFmt: "0.00" },
          { header: "Semaforo", key: "semaforo", width: 12 },
        ],
        filas: resumen.map((f) => ({
          ...f,
          activo: f.usuario_activo === 1 ? "Si" : "No",
          pais_calendario: f.pais_calendario ?? "Sin calendario",
          horas_trabajadas: Number(f.horas_trabajadas),
          horas_planificadas_a_fecha: Number(f.horas_planificadas_a_fecha),
        })),
      },
      {
        nombre: "Fuente (registros de tiempo)",
        columnas: [
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Tarea", key: "tarea", width: 25 },
          { header: "Inicio", key: "fecha_inicio", width: 20 },
          { header: "Fin", key: "fecha_fin", width: 20 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
          { header: "Descripcion", key: "descripcion", width: 30 },
        ],
        filas: detalle.map((f) => ({ ...f, horas: Number(f.horas) })),
      },
    ]);

    return respuestaExcel(buffer, `resumen_avance_${anio}_${mes}.xlsx`);
  } catch (err) {
    return handleApiError(err);
  }
}
