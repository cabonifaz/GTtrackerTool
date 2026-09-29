import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/apiHelpers";
import { crearHoraExtra, listarHorasExtraPorUsuario } from "@/lib/services/horaExtraService";

export async function GET() {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const horasExtra = await listarHorasExtraPorUsuario(session.user.idUsuario);
    return NextResponse.json(horasExtra);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { fecha, horas, motivo } = await req.json();

  try {
    const result = await crearHoraExtra(
      session.user.idUsuario,
      fecha,
      Number(horas),
      motivo || null,
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
