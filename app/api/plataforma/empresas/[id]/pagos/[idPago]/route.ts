import { NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { eliminarPagoEmpresa } from "@/lib/services/pagoEmpresaService";

export async function DELETE(_req: Request, { params }: { params: { id: string; idPago: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await eliminarPagoEmpresa(Number(params.idPago), Number(params.id), session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
