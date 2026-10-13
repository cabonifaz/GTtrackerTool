import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { crearUsuario } from "@/lib/services/usuarioService";
import { asignarTalento } from "@/lib/services/proyectoService";
import { crearInvitacion } from "@/lib/services/invitacionService";

const DIAS_EXPIRACION = 7;

// Crea el usuario (con un password_hash aleatorio e inutilizable -- no
// se le entrega a nadie), lo autoasigna al proyecto si se indico uno, y
// genera el link de invitacion. La persona recien queda con una clave
// usable cuando acepta el link (sp_invitacion_aceptar).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const { nombres, apellidos, email, codigoRol, numeroDocumento, idProyecto } = await req.json();

  try {
    const passwordAleatoria = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(passwordAleatoria, 10);
    const creadoPor = session.user.email ?? "";

    const [usuarioCreado] = await crearUsuario(
      nombres,
      apellidos,
      email,
      passwordHash,
      codigoRol,
      session.user.idEmpresa,
      numeroDocumento || null,
      creadoPor
    );
    const idUsuario = usuarioCreado.id_usuario;

    if (idProyecto) {
      await asignarTalento(idUsuario, Number(idProyecto), null, session.user.idEmpresa!, creadoPor);
    }

    const token = crypto.randomBytes(32).toString("hex");
    await crearInvitacion(idUsuario, idProyecto ? Number(idProyecto) : null, token, DIAS_EXPIRACION, session.user.idEmpresa!, creadoPor);

    // NEXTAUTH_URL (no req.nextUrl.origin) porque es la URL publica ya
    // configurada a mano por entorno -- req.nextUrl.origin puede salir
    // mal si hay un proxy/balanceador que no reenvia el Host real.
    const link = `${process.env.NEXTAUTH_URL}/${session.user.empresaSlug}/invitacion/${token}`;
    return NextResponse.json({ idUsuario, link }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
