import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { editarRegistroTiempo, eliminarRegistroTiempo } from "@/lib/services/cronometroService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { fechaInicio, fechaFin, descripcion } = await req.json();

  try {
    await editarRegistroTiempo(
      Number(params.id),
      fechaInicio,
      fechaFin ?? null,
      descripcion ?? null,
      session.user.email ?? "",
      session.user.idUsuario,
      session.user.rol
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    await eliminarRegistroTiempo(
      Number(params.id),
      session.user.email ?? "",
      session.user.idUsuario,
      session.user.rol
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
