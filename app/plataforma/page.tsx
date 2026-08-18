import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { listarEmpresas } from "@/lib/services/empresaService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarMaestro } from "@/lib/services/maestroService";
import PlataformaClient from "./plataforma-client";

export default async function PlataformaPage() {
  const session = await getServerSession(authOptions);
  const [empresas, usuarios, tiposPlan, monedas] = await Promise.all([
    listarEmpresas(),
    listarUsuarios(null),
    listarMaestro("TIPO_PLAN_EMPRESA"),
    listarMaestro("MONEDA"),
  ]);

  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocolo = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origen = `${protocolo}://${host}`;

  return (
    <PlataformaClient
      nombre={session?.user?.name ?? ""}
      empresasIniciales={empresas}
      usuariosIniciales={usuarios}
      tiposPlan={tiposPlan}
      monedas={monedas}
      origen={origen}
    />
  );
}
