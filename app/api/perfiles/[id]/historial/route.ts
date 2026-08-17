import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { historialTarifasPerfil } from "@/lib/services/perfilService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const historial = await historialTarifasPerfil(Number(params.id), session.user.idEmpresa!);
    return NextResponse.json(historial);
  } catch (err) {
    return handleApiError(err);
  }
}
