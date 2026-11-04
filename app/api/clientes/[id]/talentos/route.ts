import { NextResponse } from "next/server";
import { requireAdminOGestor, handleApiError } from "@/lib/apiHelpers";
import { listarClientes } from "@/lib/services/clienteService";
import { talentosPorCliente } from "@/lib/services/reporteTalentoService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdminOGestor();
  if (session instanceof NextResponse) return session;

  const idCliente = Number(params.id);

  try {
    const idEmpresa = session.user.idEmpresa!;
    const clientesPermitidos = await listarClientes(session.user.idUsuario, session.user.rol, idEmpresa);
    if (!clientesPermitidos.some((c) => c.id_cliente === idCliente)) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const talentos = await talentosPorCliente(idCliente, idEmpresa);
    return NextResponse.json(talentos);
  } catch (err) {
    return handleApiError(err);
  }
}
