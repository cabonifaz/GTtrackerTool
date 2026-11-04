import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { reporteHorasDetalle } from "@/lib/services/reporteService";
import { listarProyectos, tieneProyectoDeTipo } from "@/lib/services/proyectoService";
import { listarMaestro } from "@/lib/services/maestroService";
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
  const esGestor = session?.user?.rol === "GESTOR_SERVICIO";
  // El reporte de Talento (evolucion mensual + costo/margen) tambien es
  // visible para el Gestor de Servicio, acotado a sus clientes
  // asignados -- el resto de tabs (Monto a facturar, Resumen,
  // Proyeccion, Clases) siguen siendo exclusivas de Admin.
  const puedeVerTalento = esAdmin || esGestor;
  const idEmpresa = session!.user.idEmpresa!;
  const fechaInicio = primerDiaMes();
  const fechaFin = hoy();

  const [usuarios, filas, proyectos, tieneClases, monedas] = await Promise.all([
    esAdmin ? listarUsuarios(idEmpresa) : Promise.resolve([]),
    reporteHorasDetalle(esAdmin ? [] : [session!.user.idUsuario], fechaInicio, fechaFin, idEmpresa),
    puedeVerTalento ? listarProyectos(session!.user.idUsuario, session!.user.rol, idEmpresa) : Promise.resolve([]),
    esAdmin ? tieneProyectoDeTipo("CLASES", idEmpresa) : Promise.resolve([]),
    // Solo el Admin edita el costo mensual, por eso solo el necesita el
    // catalogo de monedas (el Gestor ve el reporte pero no el formulario).
    esAdmin ? listarMaestro("MONEDA") : Promise.resolve([]),
  ]);

  return (
    <ReportesClient
      esAdmin={esAdmin}
      puedeVerTalento={puedeVerTalento}
      usuariosIniciales={usuarios}
      filasIniciales={filas}
      fechaInicioInicial={fechaInicio}
      fechaFinInicial={fechaFin}
      proyectosIniciales={proyectos}
      monedasIniciales={monedas}
      tieneClases={tieneClases.length > 0}
    />
  );
}
