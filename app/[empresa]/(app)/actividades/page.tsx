import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarAsignaciones } from "@/lib/services/actividadService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { obtenerEmpresaPorSlug } from "@/lib/services/empresaService";
import ActividadesClient from "./actividades-client";

export default async function ActividadesPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const idEmpresa = session!.user.idEmpresa!;
  const esAdmin = rol === "ADMIN";

  const [proyectos, asignaciones, talentos, empresa] = await Promise.all([
    esAdmin ? listarProyectos(idUsuario, rol, idEmpresa) : Promise.resolve([]),
    // El Admin puede tener cientos de talentos con asignaciones -- no se
    // trae todo de una al entrar a la pantalla, se busca a pedido (ver
    // buscarAsignaciones en actividades-client.tsx). El talento si carga
    // sus propias asignaciones de una, son pocas por definicion.
    esAdmin ? Promise.resolve([]) : listarAsignaciones(null, idUsuario, rol, idEmpresa),
    esAdmin ? listarUsuarios(idEmpresa) : Promise.resolve([]),
    esAdmin ? obtenerEmpresaPorSlug(session!.user.empresaSlug!) : Promise.resolve(null),
  ]);

  return (
    <ActividadesClient
      esAdmin={esAdmin}
      idUsuario={idUsuario}
      proyectosActividadesIniciales={proyectos.filter((p) => p.codigo_tipo_proyecto === "ACTIVIDADES_EXCEL" && p.activo)}
      asignacionesIniciales={asignaciones}
      talentosIniciales={talentos.filter((u) => u.activo)}
      dominioCorreoSugerido={empresa?.dominio_correo || `${session!.user.empresaSlug}.local`}
    />
  );
}
