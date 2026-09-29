import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearHoraExtraAdmin } from "@/lib/services/horaExtraService";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idUsuario, fecha, horas, motivo } = await req.json();
  if (!idUsuario) {
    return NextResponse.json({ error: "Falta el talento" }, { status: 400 });
  }

  try {
    const result = await crearHoraExtraAdmin(
      Number(idUsuario),
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
