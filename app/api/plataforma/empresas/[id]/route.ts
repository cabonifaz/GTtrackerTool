import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { editarEmpresa } from "@/lib/services/empresaService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const { nombre, colorPrimario, colorSecundario } = await req.json();

  try {
    await editarEmpresa(
      Number(params.id),
      nombre,
      colorPrimario ?? null,
      colorSecundario ?? null,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
