import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import {
  actualizarPaisCalendarioAsignacion,
  asignarTalento,
  desasignarTalento,
  listarAsignados,
} from "@/lib/services/proyectoService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const asignados = await listarAsignados(Number(params.id));
    return NextResponse.json(asignados);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario, idPaisCalendario } = await req.json();

  try {
    await asignarTalento(
      idUsuario,
      Number(params.id),
      idPaisCalendario ? Number(idPaisCalendario) : null,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario, idPaisCalendario } = await req.json();

  try {
    await actualizarPaisCalendarioAsignacion(
      Number(idUsuario),
      Number(params.id),
      idPaisCalendario ? Number(idPaisCalendario) : null,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idUsuario = req.nextUrl.searchParams.get("idUsuario");
  if (!idUsuario) {
    return NextResponse.json({ error: "Falta el parametro idUsuario" }, { status: 400 });
  }

  try {
    await desasignarTalento(Number(idUsuario), Number(params.id), session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
