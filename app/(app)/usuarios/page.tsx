import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarUsuariosSistema } from "@/lib/services/usuarioSistemaService";
import UsuariosClient from "./usuarios-client";

export default async function UsuariosPage() {
  const [usuarios, sistemas] = await Promise.all([listarUsuarios(), listarUsuariosSistema()]);
  return <UsuariosClient usuariosIniciales={usuarios} sistemasIniciales={sistemas} />;
}
