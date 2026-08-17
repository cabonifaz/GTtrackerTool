import { NextResponse } from "next/server";
import { obtenerLogoEmpresa } from "@/lib/services/empresaService";

// Sin autenticacion a proposito: el logo debe poder cargar en el nav y en
// la propia pantalla de login, antes de que exista una sesion.
export async function GET(_req: Request, { params }: { params: { empresa: string } }) {
  const fila = await obtenerLogoEmpresa(params.empresa);
  if (!fila || !fila.logo) {
    return NextResponse.json({ error: "Sin logo" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fila.logo), {
    status: 200,
    headers: {
      "Content-Type": fila.logo_tipo ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
