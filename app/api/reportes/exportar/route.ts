import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { reporteHorasDetalle } from "@/lib/services/reporteService";
import { generarExcel, nombreArchivoReporte, respuestaExcel } from "@/lib/excelExport";

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
      ? (idsUsuarioParam ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number)
      : [session.user.idUsuario];

  try {
    const detalle = await reporteHorasDetalle(idsUsuario, fechaInicio, fechaFin, session.user.idEmpresa!);

    const buffer = await generarExcel([
      {
        nombre: "Horas",
        columnas: [
          { header: "Colaborador", key: "colaborador", width: 25 },
          { header: "Cliente", key: "cliente", width: 20 },
          { header: "Proyecto", key: "proyecto", width: 20 },
          { header: "Tarea", key: "tarea", width: 25 },
          { header: "Inicio", key: "fecha_inicio", width: 20 },
          { header: "Fin", key: "fecha_fin", width: 20 },
          { header: "Horas", key: "horas", width: 10, numFmt: "0.00" },
          { header: "Descripcion", key: "descripcion", width: 30 },
        ],
        filas: detalle.map((fila) => ({ ...fila, horas: Number(fila.horas) })),
      },
    ]);

    return respuestaExcel(buffer, nombreArchivoReporte("Detailed", fechaInicio, fechaFin));
  } catch (err) {
    return handleApiError(err);
  }
}
