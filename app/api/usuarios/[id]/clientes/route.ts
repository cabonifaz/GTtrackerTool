import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { asignarClienteGestor, listarClientesGestor, quitarClienteGestor } from "@/lib/services/clienteService";

// Clientes gestionados por un usuario con rol Gestor de Servicio. Solo
// Admin puede tocar esto -- que un Gestor gestione clientes es una
// decision de la organizacion, no algo que el propio Gestor se otorgue.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idUsuario = Number(params.id);
  if (!idUsuario || isNaN(idUsuario)) {
    return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
  }

  try {
    const clientes = await listarClientesGestor(idUsuario, session.user.idEmpresa!);
    return NextResponse.json(clientes);
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

  const { idCliente } = await req.json();
  if (!idCliente) {
    return NextResponse.json({ error: "Falta el parametro idCliente" }, { status: 400 });
  }

  try {
    await asignarClienteGestor(Number(idCliente), idUsuario, session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true }, { status: 201 });
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

  const idCliente = req.nextUrl.searchParams.get("idCliente");
  if (!idCliente) {
    return NextResponse.json({ error: "Falta el parametro idCliente" }, { status: 400 });
  }

  try {
    await quitarClienteGestor(Number(idCliente), idUsuario, session.user.idEmpresa!, session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
