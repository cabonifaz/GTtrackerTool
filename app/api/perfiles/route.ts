import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearPerfil, listarPerfiles } from "@/lib/services/perfilService";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const idClienteParam = req.nextUrl.searchParams.get("idCliente");
  const idCliente = idClienteParam ? Number(idClienteParam) : null;

  try {
    const perfiles = await listarPerfiles(idCliente, session.user.idEmpresa!);
    return NextResponse.json(perfiles);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idCliente, nombre, codigoExterno, tarifa, idMoneda } = await req.json();

  try {
    const result = await crearPerfil(
      Number(idCliente),
      nombre,
      codigoExterno || null,
      Number(tarifa),
      Number(idMoneda),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
