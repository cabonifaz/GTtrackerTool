import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearCliente, listarClientes } from "@/lib/services/clienteService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const clientes = await listarClientes(session.user.idUsuario, session.user.rol);
    return NextResponse.json(clientes);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombre } = await req.json();

  try {
    const result = await crearCliente(nombre, session.user.email ?? session.user.name ?? "");
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
