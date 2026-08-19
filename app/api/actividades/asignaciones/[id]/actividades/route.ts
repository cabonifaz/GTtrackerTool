import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { agregarActividad, listarActividades } from "@/lib/services/actividadService";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const actividades = await listarActividades(
      Number(params.id),
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!
    );
    return NextResponse.json(actividades);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { descripcion } = await req.json();

  try {
    const result = await agregarActividad(
      Number(params.id),
      descripcion,
      session.user.idUsuario,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
