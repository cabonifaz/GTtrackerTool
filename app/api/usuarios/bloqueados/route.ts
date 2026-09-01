import { NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/apiHelpers";
import { listarBloqueados } from "@/lib/rateLimiter";
import { listarUsuarios } from "@/lib/services/usuarioService";

// Usuarios de ESTA empresa actualmente bloqueados por intentos fallidos
// de login (15 min tras 5 fallos seguidos). El bloqueo vive en memoria
// del proceso -- se cruza contra los usuarios de la empresa del Admin
// que consulta, para no filtrar bloqueos de otras empresas.
export async function GET() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  try {
    const bloqueados = listarBloqueados();
    if (bloqueados.length === 0) return NextResponse.json([]);

    const bloqueadosPorEmail = new Map(bloqueados.map((b) => [b.email, b.bloqueadoHasta]));
    const usuarios = await listarUsuarios(session.user.idEmpresa!);

    const resultado = usuarios
      .filter((u) => bloqueadosPorEmail.has(u.email.trim().toLowerCase()))
      .map((u) => ({
        id_usuario: u.id_usuario,
        nombres: u.nombres,
        apellidos: u.apellidos,
        email: u.email,
        bloqueado_hasta: new Date(bloqueadosPorEmail.get(u.email.trim().toLowerCase())!).toISOString(),
      }));

    return NextResponse.json(resultado);
  } catch (err) {
    return handleApiError(err);
  }
}
