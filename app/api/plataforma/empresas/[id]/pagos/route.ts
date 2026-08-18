import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearPagoEmpresa, listarPagosPorEmpresa } from "@/lib/services/pagoEmpresaService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const pagos = await listarPagosPorEmpresa(Number(params.id));
    return NextResponse.json(pagos);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { monto, codigoMoneda, fechaPago, periodoDesde, periodoHasta, referencia, notas } = await req.json();

  try {
    const result = await crearPagoEmpresa(
      Number(params.id),
      Number(monto),
      codigoMoneda,
      fechaPago,
      periodoDesde || null,
      periodoHasta || null,
      referencia || null,
      notas || null,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
