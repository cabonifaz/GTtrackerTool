import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import {
  actualizarPaisCalendarioAsignacion,
  asignarTalento,
  desasignarTalento,
  listarMisProyectos,
} from "@/lib/services/proyectoService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idUsuario = Number(params.id);
  if (!idUsuario || isNaN(idUsuario)) {
    return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
  }

  try {
    const proyectos = await listarMisProyectos(idUsuario);
    return NextResponse.json(proyectos);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idUsuario = Number(params.id);
  if (!idUsuario || isNaN(idUsuario)) {
    return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
  }

  const { idProyecto, idPaisCalendario } = await req.json();
  if (!idProyecto) {
    return NextResponse.json({ error: "Falta el parametro idProyecto" }, { status: 400 });
  }

  try {
    await asignarTalento(
      idUsuario,
      Number(idProyecto),
      idPaisCalendario ? Number(idPaisCalendario) : null,
      session.user.idEmpresa!,
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

  const idUsuario = Number(params.id);
  if (!idUsuario || isNaN(idUsuario)) {
    return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
  }

  const { idProyecto, idPaisCalendario } = await req.json();
  if (!idProyecto) {
    return NextResponse.json({ error: "Falta el parametro idProyecto" }, { status: 400 });
  }

  try {
    await actualizarPaisCalendarioAsignacion(
      idUsuario,
      Number(idProyecto),
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

  const idUsuario = Number(params.id);
  if (!idUsuario || isNaN(idUsuario)) {
    return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
  }

  const idProyecto = req.nextUrl.searchParams.get("idProyecto");
  if (!idProyecto) {
    return NextResponse.json({ error: "Falta el parametro idProyecto" }, { status: 400 });
  }

  try {
    await desasignarTalento(
      idUsuario,
      Number(idProyecto),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
