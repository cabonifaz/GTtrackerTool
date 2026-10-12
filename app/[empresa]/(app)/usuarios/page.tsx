import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarUsuariosSistema } from "@/lib/services/usuarioSistemaService";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarMaestro } from "@/lib/services/maestroService";
import { listarClientes } from "@/lib/services/clienteService";
import { listarInvitaciones } from "@/lib/services/invitacionService";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage({ params }: { params: { empresa: string } }) {
  const session = await getServerSession(authOptions);
  const idEmpresa = session!.user.idEmpresa!;
  const idUsuario = session!.user.idUsuario;
  const [usuarios, sistemas, proyectos, paisesCalendario, clientes, invitaciones] = await Promise.all([
    listarUsuarios(idEmpresa),
    listarUsuariosSistema(idEmpresa),
    listarProyectos(idUsuario, "ADMIN", idEmpresa),
    listarMaestro("PAIS_CALENDARIO"),
    listarClientes(idUsuario, "ADMIN", idEmpresa),
    listarInvitaciones(idEmpresa),
  ]);
  return (
    <UsuariosClient
      usuariosIniciales={usuarios}
      sistemasIniciales={sistemas}
      proyectosIniciales={proyectos.filter((p) => p.activo)}
      paisesCalendarioIniciales={paisesCalendario}
      clientesIniciales={clientes.filter((c) => c.activo)}
      invitacionesIniciales={invitaciones}
      empresaSlug={params.empresa}
    />
  );
}
