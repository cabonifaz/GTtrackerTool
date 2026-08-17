import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarMaestro } from "@/lib/services/maestroService";
import { listarFeriadosTodos, listarFeriadosProximos, listarFeriadosAnio } from "@/lib/services/feriadoService";
import { listarMisProyectos } from "@/lib/services/proyectoService";
import { Feriado, FeriadoAdmin, MaestroItem, MiProyecto } from "@/lib/types";
import CalendarioClient from "./calendario-client";

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "ADMIN";
  const anioActual = new Date().getFullYear();

  let paises: MaestroItem[] = [];
  let feriadosTodos: FeriadoAdmin[] = [];
  let misProyectos: MiProyecto[] = [];
  let idPaisInicial: number | null = null;
  let proximos: Feriado[] = [];
  let anioCompleto: Feriado[] = [];

  if (esAdmin) {
    [paises, feriadosTodos] = await Promise.all([
      listarMaestro("PAIS_CALENDARIO"),
      listarFeriadosTodos(),
    ]);
    if (paises.length > 0) {
      idPaisInicial = paises[0].id_maestro;
      [proximos, anioCompleto] = await Promise.all([
        listarFeriadosProximos(idPaisInicial, 5),
        listarFeriadosAnio(idPaisInicial, anioActual),
      ]);
    }
  } else {
    misProyectos = await listarMisProyectos(session!.user.idUsuario);
    const predeterminado = misProyectos.find((p) => p.predeterminado);
    if (predeterminado?.id_pais_calendario) {
      idPaisInicial = predeterminado.id_pais_calendario;
      [proximos, anioCompleto] = await Promise.all([
        listarFeriadosProximos(idPaisInicial, 5),
        listarFeriadosAnio(idPaisInicial, anioActual),
      ]);
    }
  }

  return (
    <CalendarioClient
      esAdmin={esAdmin}
      paisesIniciales={paises}
      feriadosTodosIniciales={feriadosTodos}
      idPaisAdminInicial={esAdmin && idPaisInicial ? String(idPaisInicial) : ""}
      misProyectosIniciales={misProyectos}
      proximosIniciales={proximos}
      anioCompletoIniciales={anioCompleto}
    />
  );
}
