import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarGruposClase, listarSesionesClase, obtenerSesionClaseActiva } from "@/lib/services/claseService";
import ClasesClient from "./clases-client";

function aFechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ClasesPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;
  const esAdmin = rol === "ADMIN";

  const hoy = new Date();
  const en14Dias = new Date();
  en14Dias.setDate(hoy.getDate() + 14);
  const fechaDesde = aFechaISO(hoy);
  const fechaHasta = aFechaISO(en14Dias);

  const [proyectos, grupos, talentos, sesiones, sesionActiva] = await Promise.all([
    esAdmin ? listarProyectos(idUsuario, rol, idEmpresa) : Promise.resolve([]),
    listarGruposClase(idUsuario, rol, idEmpresa),
    esAdmin ? listarUsuarios(idEmpresa) : Promise.resolve([]),
    listarSesionesClase(null, fechaDesde, fechaHasta, idUsuario, rol, idEmpresa),
    obtenerSesionClaseActiva(idUsuario),
  ]);

  return (
    <ClasesClient
      esAdmin={esAdmin}
      idUsuario={idUsuario}
      proyectosClasesIniciales={proyectos.filter((p) => p.codigo_tipo_proyecto === "CLASES" && p.activo)}
      gruposIniciales={grupos}
      talentosIniciales={talentos}
      sesionesIniciales={sesiones}
      sesionActivaInicial={sesionActiva[0] ?? null}
      fechaDesdeInicial={fechaDesde}
      fechaHastaInicial={fechaHasta}
    />
  );
}
