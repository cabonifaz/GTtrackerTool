import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { editarActividad, eliminarActividad } from "@/lib/services/actividadService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { descripcion } = await req.json();

  try {
    await editarActividad(
      Number(params.id),
      descripcion,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await eliminarActividad(
      Number(params.id),
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
