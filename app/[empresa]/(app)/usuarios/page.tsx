import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarUsuariosSistema } from "@/lib/services/usuarioSistemaService";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  const idEmpresa = session!.user.idEmpresa!;
  const [usuarios, sistemas] = await Promise.all([
    listarUsuarios(idEmpresa),
    listarUsuariosSistema(idEmpresa),
  ]);
  return <UsuariosClient usuariosIniciales={usuarios} sistemasIniciales={sistemas} />;
}
