import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { asignarCostoTalento, historialCostoTalento } from "@/lib/services/talentoCostoService";

// Dato sensible (sueldo) -- solo el Admin lo ve/edita desde aca. El
// reporte de Talento (que si lo muestra a Admin y Gestor) lo lee por su
// propia ruta, ya acotada por cliente.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const historial = await historialCostoTalento(Number(params.id), session.user.idEmpresa!);
    return NextResponse.json(historial);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { costoMensual, idMoneda, fechaDesde } = await req.json();

  try {
    await asignarCostoTalento(
      Number(params.id),
      Number(costoMensual),
      Number(idMoneda),
      session.user.idEmpresa!,
      session.user.email ?? "",
      fechaDesde || null
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
