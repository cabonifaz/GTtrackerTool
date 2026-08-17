import { NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { actualizarLogoEmpresa } from "@/lib/services/empresaService";

const MAX_LOGO_BYTES = 1 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  const form = await req.formData();
  const archivo = form.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Falta el archivo del logo" }, { status: 400 });
  }
  if (archivo.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "El logo no puede superar 1MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    await actualizarLogoEmpresa(
      Number(params.id),
      buffer,
      archivo.type || "application/octet-stream",
      session.user.email ?? ""
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
