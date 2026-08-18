import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos, listarMisProyectos } from "@/lib/services/proyectoService";
import { listarTareas } from "@/lib/services/tareaService";
import { obtenerCronometroActivo, obtenerUltimaTarea } from "@/lib/services/cronometroService";
import { listarFeriadosProximos } from "@/lib/services/feriadoService";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import { Feriado } from "@/lib/types";
import CronometroClient from "./cronometro-client";

export default async function CronometroPage({ params }: { params: { empresa: string } }) {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;

  const [proyectos, tareas, activoServidor, ultimaTarea, misProyectos, empresa] = await Promise.all([
    listarProyectos(idUsuario, rol, idEmpresa),
    listarTareas(null, idUsuario, rol, idEmpresa),
    obtenerCronometroActivo(idUsuario),
    obtenerUltimaTarea(idUsuario),
    listarMisProyectos(idUsuario),
    obtenerEmpresaPorSlug(params.empresa),
  ]);

  const proyectosActivos = proyectos.filter((p) => p.activo);
  const predeterminado = misProyectos.find((p) => p.predeterminado === 1);
  // Si el talento no marco ninguno como predeterminado pero solo tiene un
  // proyecto disponible, no tiene sentido obligarlo a elegirlo cada vez.
  const idProyectoInicial = predeterminado
    ? String(predeterminado.id_proyecto)
    : proyectosActivos.length === 1
      ? String(proyectosActivos[0].id_proyecto)
      : "";
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
      proyectosIniciales={proyectosActivos}
      tareasIniciales={tareas.filter((t) => t.activo)}
      activoServidorInicial={activoServidor}
      ultimaTareaInicial={ultimaTarea}
      idProyectoInicial={idProyectoInicial}
      feriadoProximoInicial={feriadoProximo}
      publicidadActiva={empresa?.publicidad_activa === 1}
    />
  );
}
