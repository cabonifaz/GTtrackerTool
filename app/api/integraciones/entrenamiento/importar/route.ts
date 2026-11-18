import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { importarHorasDictadas } from "@/lib/services/entrenamientoService";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { idProyecto, programId, from, to } = await req.json();

  if (!idProyecto || !programId || !from || !to) {
    return NextResponse.json({ error: "idProyecto, programId, from y to son requeridos" }, { status: 400 });
  }

  try {
    const resultados = await importarHorasDictadas(
      Number(idProyecto),
      Number(programId),
      String(from),
      String(to),
      session.user.idEmpresa!,
      session.user.email ?? ""
    );
    return NextResponse.json(resultados);
  } catch (err) {
    return handleApiError(err);
  }
}
