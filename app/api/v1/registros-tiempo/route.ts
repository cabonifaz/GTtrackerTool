import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/apiKeyAuth";
import { handleApiError } from "@/lib/apiHelpers";
import { reporteHorasDetalle } from "@/lib/services/reporteService";

/**
 * Endpoint publico para integraciones externas autenticadas por API key
 * (usuarios de sistema). GET /api/v1/registros-tiempo?fechaInicio=&fechaFin=&idsUsuario=
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const params = req.nextUrl.searchParams;
  const fechaInicio = params.get("fechaInicio");
  const fechaFin = params.get("fechaFin");
  const idsUsuarioParam = params.get("idsUsuario");

  if (!fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "fechaInicio y fechaFin son requeridos" }, { status: 400 });
  }

  const idsUsuario = (idsUsuarioParam ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);

  try {
    const detalle = await reporteHorasDetalle(idsUsuario, fechaInicio, fechaFin, auth.idEmpresa);
    return NextResponse.json(detalle);
  } catch (err) {
    return handleApiError(err);
  }
}
