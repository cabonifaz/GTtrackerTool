import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { editarEmpresa } from "@/lib/services/empresaService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const {
    nombre,
    colorPrimario,
    colorSecundario,
    codigoTipoPlan,
    limiteUsuarios,
    tarifaPorUsuario,
    codigoMoneda,
    publicidadActiva,
    ocultarNombre,
  } = await req.json();

  try {
    await editarEmpresa(
      Number(params.id),
      nombre,
      colorPrimario ?? null,
      colorSecundario ?? null,
      {
        codigoTipoPlan,
        limiteUsuarios: limiteUsuarios ? Number(limiteUsuarios) : null,
        tarifaPorUsuario: tarifaPorUsuario ? Number(tarifaPorUsuario) : null,
        codigoMoneda: codigoMoneda ?? null,
        publicidadActiva: !!publicidadActiva,
      },
      !!ocultarNombre,
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
