import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteClasesPorProfesor, reporteClasesPorGrupo } from "@/lib/services/claseService";
import { generarExcel, nombreArchivoReporte, respuestaExcel } from "@/lib/excelExport";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const fechaInicio = params.get("fechaInicio");
  const fechaFin = params.get("fechaFin");
  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
  }

  try {
    const [porProfesor, porGrupo] = await Promise.all([
      reporteClasesPorProfesor(fechaInicio, fechaFin, session.user.idEmpresa!),
      reporteClasesPorGrupo(fechaInicio, fechaFin, session.user.idEmpresa!),
    ]);

    const buffer = await generarExcel([
      {
        nombre: "Por profesor",
        columnas: [
          { header: "Profesor", key: "profesor", width: 25 },
          { header: "Sesiones", key: "sesiones_dictadas", width: 12 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
        ],
        filas: porProfesor.map((f) => ({ ...f, horas: Number(f.total_segundos) / 3600 })),
      },
      {
        nombre: "Por grupo",
        columnas: [
          { header: "Grupo", key: "grupo", width: 20 },
          { header: "Proyecto", key: "proyecto", width: 20 },
          { header: "Profesor", key: "profesor", width: 25 },
          { header: "Sesiones", key: "sesiones_dictadas", width: 12 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
        ],
        filas: porGrupo.map((f) => ({ ...f, horas: Number(f.total_segundos) / 3600 })),
      },
    ]);

    return respuestaExcel(buffer, nombreArchivoReporte("Classes", fechaInicio, fechaFin));
  } catch (err) {
    return handleApiError(err);
  }
}
