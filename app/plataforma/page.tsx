import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarEmpresas } from "@/lib/services/empresaService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import PlataformaClient from "./plataforma-client";

export default async function PlataformaPage() {
  const session = await getServerSession(authOptions);
  const [empresas, usuarios] = await Promise.all([listarEmpresas(), listarUsuarios(null)]);

  return (
    <PlataformaClient
      nombre={session?.user?.name ?? ""}
      empresasIniciales={empresas}
      usuariosIniciales={usuarios}
    />
  );
}
