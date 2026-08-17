import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarTareas } from "@/lib/services/tareaService";
import { reporteHorasDetalle } from "@/lib/services/reporteService";
import RegistrosClient from "./registros-client";

function primerDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default async function RegistrosPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;
  const fechaInicio = primerDiaMes();
  const fechaFin = hoy();

  const [proyectos, tareas, filas] = await Promise.all([
    listarProyectos(idUsuario, rol, idEmpresa),
    listarTareas(null, idUsuario, rol, idEmpresa),
    reporteHorasDetalle([idUsuario], fechaInicio, fechaFin, idEmpresa),
  ]);

  return (
    <RegistrosClient
      idUsuario={idUsuario}
      proyectosIniciales={proyectos}
      tareasIniciales={tareas}
      filasIniciales={filas}
      fechaInicioInicial={fechaInicio}
      fechaFinInicial={fechaFin}
    />
  );
}
