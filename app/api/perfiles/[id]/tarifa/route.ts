import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { editarTarifaPerfil } from "@/lib/services/perfilService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { tarifa, idMoneda } = await req.json();

  try {
    await editarTarifaPerfil(
      Number(params.id),
      Number(tarifa),
      Number(idMoneda),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
