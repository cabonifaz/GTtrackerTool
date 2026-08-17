import { NextResponse } from "next/server";
import { requireSuperAdmin, handleApiError } from "@/lib/apiHelpers";
import { reactivarEmpresa } from "@/lib/services/empresaService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireSuperAdmin();
  if (session instanceof NextResponse) return session;

  try {
    await reactivarEmpresa(Number(params.id), session.user.email ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
