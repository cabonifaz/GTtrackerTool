import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { reporteHorasDetalle } from "@/lib/services/reporteService";
import { listarProyectos, tieneProyectoDeTipo } from "@/lib/services/proyectoService";
import ReportesClient from "./reportes-client";

function primerDiaMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default async function ReportesPage() {
  const session = await getServerSession(authOptions);
  const esAdmin = session?.user?.rol === "ADMIN";
  const idEmpresa = session!.user.idEmpresa!;
  const fechaInicio = primerDiaMes();
  const fechaFin = hoy();

  const [usuarios, filas, proyectos, tieneClases] = await Promise.all([
    esAdmin ? listarUsuarios(idEmpresa) : Promise.resolve([]),
    reporteHorasDetalle(esAdmin ? [] : [session!.user.idUsuario], fechaInicio, fechaFin, idEmpresa),
    esAdmin ? listarProyectos(session!.user.idUsuario, session!.user.rol, idEmpresa) : Promise.resolve([]),
    esAdmin ? tieneProyectoDeTipo("CLASES", idEmpresa) : Promise.resolve([]),
  ]);

  return (
    <ReportesClient
      esAdmin={esAdmin}
      usuariosIniciales={usuarios}
      filasIniciales={filas}
      fechaInicioInicial={fechaInicio}
      fechaFinInicial={fechaFin}
      proyectosIniciales={proyectos}
      tieneClases={tieneClases.length > 0}
    />
  );
}
