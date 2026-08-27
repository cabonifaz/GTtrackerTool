import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { reporteTiempoPorTarea } from "@/lib/services/reporteService";
import { generarExcel, respuestaExcel } from "@/lib/excelExport";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const fechaInicio = params.get("fechaInicio");
  const fechaFin = params.get("fechaFin");
  const idsUsuarioParam = params.get("idsUsuario");

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
  }

  const idsUsuario =
    session.user.rol === "ADMIN"
      ? (idsUsuarioParam ?? "").split(",").filter(Boolean).map(Number)
      : [session.user.idUsuario];

  try {
    const filas = await reporteTiempoPorTarea(idsUsuario, fechaInicio, fechaFin, session.user.idEmpresa!);

    const buffer = await generarExcel([
      {
        nombre: "Por tarea",
        columnas: [
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Cliente", key: "cliente", width: 20 },
          { header: "Proyecto", key: "proyecto", width: 20 },
          { header: "Tarea", key: "tarea", width: 25 },
          { header: "Estado", key: "estado_tarea", width: 15 },
          { header: "Sesiones", key: "sesiones", width: 10 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
          { header: "Primer inicio", key: "primer_inicio", width: 20 },
          { header: "Ultimo fin", key: "ultimo_fin", width: 20 },
        ],
        filas: filas.map((f) => ({ ...f, horas: Number(f.horas) })),
      },
    ]);

    return respuestaExcel(buffer, `horas_por_tarea_${fechaInicio}_${fechaFin}.xlsx`);
  } catch (err) {
    return handleApiError(err);
  }
}
