import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearEmpresa, listarEmpresas } from "@/lib/services/empresaService";

export async function GET() {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const empresas = await listarEmpresas();
    return NextResponse.json(empresas);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const {
    nombre,
    slug,
    colorPrimario,
    colorSecundario,
    codigoTipoPlan,
    limiteUsuarios,
    tarifaPorUsuario,
    codigoMoneda,
    publicidadActiva,
    ocultarNombre,
    ocultarCredito,
    dominioCorreo,
  } = await req.json();

  try {
    const result = await crearEmpresa(
      nombre,
      slug,
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
      !!ocultarCredito,
      dominioCorreo || null,
      session.user.email ?? ""
    );
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
