import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { relacionarInstructorExterno } from "@/lib/services/entrenamientoService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario } = await req.json();
  if (!idUsuario) {
    return NextResponse.json({ error: "idUsuario es requerido" }, { status: 400 });
  }

  try {
    const resultado = await relacionarInstructorExterno(
      Number(params.id),
      Number(idUsuario),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(resultado);
  } catch (err) {
    return handleApiError(err);
  }
}
