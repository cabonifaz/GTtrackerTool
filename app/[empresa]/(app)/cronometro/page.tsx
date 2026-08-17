import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos, listarMisProyectos } from "@/lib/services/proyectoService";
import { listarTareas } from "@/lib/services/tareaService";
import { obtenerCronometroActivo, obtenerUltimaTarea } from "@/lib/services/cronometroService";
import { listarFeriadosProximos } from "@/lib/services/feriadoService";
import { Feriado } from "@/lib/types";
import CronometroClient from "./cronometro-client";

export default async function CronometroPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;

  const [proyectos, tareas, activoServidor, ultimaTarea, misProyectos] = await Promise.all([
    listarProyectos(idUsuario, rol, idEmpresa),
    listarTareas(null, idUsuario, rol, idEmpresa),
    obtenerCronometroActivo(idUsuario),
    obtenerUltimaTarea(idUsuario),
    listarMisProyectos(idUsuario),
  ]);

  const predeterminado = misProyectos.find((p) => p.predeterminado === 1);
  let feriadoProximo: Feriado | null = null;
  if (predeterminado?.id_pais_calendario) {
    try {
      const proximos = await listarFeriadosProximos(predeterminado.id_pais_calendario, 1);
      if (proximos[0] && proximos[0].dias_faltantes !== undefined && proximos[0].dias_faltantes <= 3) {
        feriadoProximo = proximos[0];
      }
    } catch {
      // el recordatorio de feriados es informativo, no bloquea la carga del cronometro
    }
  }

  return (
    <CronometroClient
      proyectosIniciales={proyectos.filter((p) => p.activo)}
      tareasIniciales={tareas.filter((t) => t.activo)}
      activoServidorInicial={activoServidor}
      ultimaTareaInicial={ultimaTarea}
      idProyectoInicial={predeterminado ? String(predeterminado.id_proyecto) : ""}
      feriadoProximoInicial={feriadoProximo}
    />
  );
}
