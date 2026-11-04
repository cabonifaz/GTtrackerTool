import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { asignarTipoCambio, listarTiposCambio } from "@/lib/services/tipoCambioService";

// Dato de configuracion (no es por talento) usado para convertir un
// costo/sueldo a la moneda de facturacion al calcular margen. Solo el
// Admin lo edita -- el reporte de Talento (que si lo ve el Gestor) lo
// trae embebido en su propia respuesta, de solo lectura.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const tiposCambio = await listarTiposCambio(session.user.idEmpresa!);
    return NextResponse.json(tiposCambio);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { anio, mes, idMonedaOrigen, idMonedaDestino, tasa } = await req.json();

  try {
    await asignarTipoCambio(
      Number(anio),
      Number(mes),
      Number(idMonedaOrigen),
      Number(idMonedaDestino),
      Number(tasa),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
