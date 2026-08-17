import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listarMaestro } from "@/lib/services/maestroService";
import {
  listarAusenciasPorUsuario,
  listarAusenciasTodas,
  obtenerSaldoVacaciones,
} from "@/lib/services/ausenciaService";
import { listarUsuarios } from "@/lib/services/usuarioService";
import DiasOffClient from "./dias-off-client";

export default async function DiasOffPage() {
  const session = await getServerSession(authOptions);
  const idUsuario = session!.user.idUsuario;
  const esAdmin = session!.user.rol === "ADMIN";
  const idEmpresa = session!.user.idEmpresa!;
  const anioActual = new Date().getFullYear();

  const [tipos, misAusencias, saldo, pendientes, talentos] = await Promise.all([
    listarMaestro("TIPO_AUSENCIA"),
    esAdmin ? Promise.resolve([]) : listarAusenciasPorUsuario(idUsuario),
    esAdmin ? Promise.resolve(null) : obtenerSaldoVacaciones(idUsuario, anioActual, idEmpresa),
    esAdmin ? listarAusenciasTodas(null, "PENDIENTE", idEmpresa) : Promise.resolve([]),
    esAdmin ? listarUsuarios(idEmpresa) : Promise.resolve([]),
  ]);

  return (
    <DiasOffClient
      esAdmin={esAdmin}
      tiposIniciales={tipos}
      misAusenciasIniciales={misAusencias}
      saldoInicial={saldo}
      pendientesIniciales={pendientes}
      talentosIniciales={talentos.filter((u) => u.codigo_rol === "TALENTO")}
      anioActual={anioActual}
    />
  );
}
