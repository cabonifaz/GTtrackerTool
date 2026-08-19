import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, handleApiError } from "@/lib/apiHelpers";
import { definirHorarioGrupo, listarHorarioGrupo } from "@/lib/services/claseService";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const horarios = await listarHorarioGrupo(Number(params.id), session.user.idEmpresa!);
    return NextResponse.json(horarios);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { diaSemana, horaInicio, horaFin } = await req.json();

  try {
    await definirHorarioGrupo(
      Number(params.id),
      Number(diaSemana),
      horaInicio,
      horaFin,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
