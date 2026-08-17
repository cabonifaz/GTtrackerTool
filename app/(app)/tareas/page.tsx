import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarClientes } from "@/lib/services/clienteService";
import { listarProyectos } from "@/lib/services/proyectoService";
import { listarTareas } from "@/lib/services/tareaService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import { listarMaestro } from "@/lib/services/maestroService";
import { listarPerfiles } from "@/lib/services/perfilService";
import TareasClient from "./tareas-client";

export default async function TareasPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const rol = session!.user.rol;
  const esAdmin = rol === "ADMIN";

  const [clientes, proyectos, tareas, talentos, paisesCalendario, monedas, perfiles] = await Promise.all([
    listarClientes(idUsuario, rol),
    listarProyectos(idUsuario, rol),
    listarTareas(null, idUsuario, rol),
    esAdmin ? listarUsuarios() : Promise.resolve([]),
    esAdmin ? listarMaestro("PAIS_CALENDARIO") : Promise.resolve([]),
    esAdmin ? listarMaestro("MONEDA") : Promise.resolve([]),
    esAdmin ? listarPerfiles(null) : Promise.resolve([]),
  ]);

  return (
    <TareasClient
      esAdmin={esAdmin}
      clientesIniciales={clientes}
      proyectosIniciales={proyectos}
      tareasIniciales={tareas}
      talentosIniciales={talentos}
      paisesCalendarioIniciales={paisesCalendario}
      monedasIniciales={monedas}
      perfilesIniciales={perfiles}
    />
  );
}
