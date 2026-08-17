import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import NavBar from "./nav-bar";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { empresa: string };
}) {
  const empresa = await obtenerEmpresaPorSlug(params.empresa);
  if (!empresa) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rol === "SUPER_ADMIN") {
    redirect(`/${params.empresa}/login`);
  }
  if (session.user.empresaSlug !== params.empresa) {
    // El usuario logueado pertenece a otra empresa: lo mandamos a la suya,
    // no a la URL ajena que intento visitar.
    redirect(`/${session.user.empresaSlug}/cronometro`);
  }

  if (empresa.suspendida) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-semibold">Cuenta suspendida</h1>
          <p className="text-sm text-gray-500">
            El acceso de {empresa.nombre} esta suspendido. Contacta a soporte para reactivarlo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`:root{--color-primario:${empresa.color_primario};--color-secundario:${empresa.color_secundario};}`}</style>
      <NavBar
        nombre={session.user.name ?? ""}
        rol={session.user.rol}
        empresaSlug={params.empresa}
        empresaNombre={empresa.nombre}
        tieneLogo={!!empresa.tiene_logo}
      />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
