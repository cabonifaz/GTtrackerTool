import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { reprogramarSesionClase } from "@/lib/services/claseService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nuevaFecha, nuevaHoraInicio, nuevaHoraFin, tema } = await req.json();

  try {
    await reprogramarSesionClase(
      Number(params.id),
      nuevaFecha,
      nuevaHoraInicio,
      nuevaHoraFin,
      tema || null,
      session.user.rol,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
