import { notFound } from "next/navigation";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import LoginForm from "./login-form";

export default async function LoginPage({ params }: { params: { empresa: string } }) {
  const empresa = await obtenerEmpresaPorSlug(params.empresa);
  if (!empresa) {
    notFound();
  }

  return (
    <LoginForm
      slug={params.empresa}
      empresaNombre={empresa.nombre}
      tieneLogo={!!empresa.tiene_logo}
      ocultarNombre={!!empresa.ocultar_nombre}
      ocultarCredito={!!empresa.ocultar_credito}
      colorPrimario={empresa.color_primario}
      suspendida={!!empresa.suspendida}
    />
  );
}
