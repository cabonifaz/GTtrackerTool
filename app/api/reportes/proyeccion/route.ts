import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reporteProyeccionCliente } from "@/lib/services/reporteService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const params = req.nextUrl.searchParams;
  const idCliente = params.get("idCliente");
  const mesesAtras = params.get("mesesAtras") ?? "3";
  const mesesAdelante = params.get("mesesAdelante") ?? "6";

  if (!idCliente) {
    return NextResponse.json({ error: "idCliente es requerido" }, { status: 400 });
  }

  try {
    const filas = await reporteProyeccionCliente(
      Number(idCliente),
      Number(mesesAtras),
      Number(mesesAdelante),
      session.user.idEmpresa!
    );
    return NextResponse.json(filas);
  } catch (err) {
    return handleApiError(err);
  }
}
