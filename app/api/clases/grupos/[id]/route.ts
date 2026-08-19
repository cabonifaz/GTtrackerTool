import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { desactivarGrupoClase, editarGrupoClase } from "@/lib/services/claseService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombre, idProfesor } = await req.json();

  try {
    await editarGrupoClase(
      Number(params.id),
      nombre,
      Number(idProfesor),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await desactivarGrupoClase(Number(params.id), session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
