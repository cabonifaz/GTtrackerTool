import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarAsignaciones } from "@/lib/services/actividadService";
import ActividadesClient from "./actividades-client";

export default async function ActividadesPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;
  const esAdmin = rol === "ADMIN";

  const [proyectos, asignaciones] = await Promise.all([
    esAdmin ? listarProyectos(idUsuario, rol, idEmpresa) : Promise.resolve([]),
    listarAsignaciones(null, idUsuario, rol, idEmpresa),
  ]);

  return (
    <ActividadesClient
      esAdmin={esAdmin}
      idUsuario={idUsuario}
      proyectosActividadesIniciales={proyectos.filter((p) => p.codigo_tipo_proyecto === "ACTIVIDADES_EXCEL" && p.activo)}
      asignacionesIniciales={asignaciones}
    />
  );
}
