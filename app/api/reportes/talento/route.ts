import { NextRequest, NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { construirReporteTalento } from "@/lib/services/reporteTalentoService";

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
    return NextResponse.json(reporte);
  } catch (err) {
    return handleApiError(err);
  }
}
