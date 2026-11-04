import { BusinessError, executeProcedure } from "@/lib/db";
import { listarClientes } from "@/lib/services/clienteService";
import { reporteProyeccionCliente } from "@/lib/services/reporteService";
import { historialCostoTalento } from "@/lib/services/talentoCostoService";
import { listarTiposCambio } from "@/lib/services/tipoCambioService";
import {
  CodigoRol,
  ReporteTalentoMesRow,
  ReporteTalentoResponse,
  TalentoCostoHistorico,
  TalentoPerfilHistorico,
  TalentoTarifaHistorico,
  TipoCambio,
  Usuario,
} from "@/lib/types";

export function talentosPorCliente(idCliente: number, idEmpresaActor: number) {
  return executeProcedure<Usuario>("sp_talentos_por_cliente_listar", [idCliente, idEmpresaActor]);
}

export async function resolverProyectoDeTalento(idUsuario: number, idCliente: number, idEmpresaActor: number) {
  const rows = await executeProcedure<{ id_proyecto: number }>("sp_talento_proyecto_resolver", [
    idUsuario,
    idCliente,
    idEmpresaActor,
  ]);
  return rows[0]?.id_proyecto ?? null;
}

export function historialPerfilesTalento(idUsuario: number, idProyecto: number, idEmpresaActor: number) {
  return executeProcedure<TalentoPerfilHistorico>("sp_usuario_proyecto_perfil_historial", [
    idUsuario,
    idProyecto,
    idEmpresaActor,
  ]);
}

export function historialTarifasTalento(idUsuario: number, idProyecto: number, idEmpresaActor: number) {
  return executeProcedure<TalentoTarifaHistorico>("sp_talento_historial_tarifas", [
    idUsuario,
    idProyecto,
    idEmpresaActor,
  ]);
}

function indiceMes(anio: number, mes: number) {
  return anio * 12 + mes;
}

function costoVigenteEnMes(historialCosto: TalentoCostoHistorico[], anio: number, mes: number) {
  if (historialCosto.length === 0) return null;
  const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const exacto = historialCosto.find(
    (c) => c.fecha_desde <= primerDia && (!c.fecha_hasta || c.fecha_hasta >= primerDia)
  );
  if (exacto) return exacto;
  // El mes es anterior al primer costo jamas registrado -- no hay un
  // valor historico mejor, asi que se usa el mas antiguo conocido en vez
  // de dejar el margen vacio: la primera vez que se carga un sueldo debe
  // reflejarse tambien en los meses pasados del reporte.
  return historialCosto.reduce((masAntiguo, c) => (c.fecha_desde < masAntiguo.fecha_desde ? c : masAntiguo));
}

// Tasa a usar para convertir costoOrigen -> monedaDestino en un mes
// dado: la mas reciente conocida AL O ANTES de ese mes (igual criterio
// que la tarifa "vigente historicamente"); si no hay ninguna hasta ese
// mes, se usa la mas antigua conocida (mismo respaldo que el costo
// mensual, en vez de dejar el margen vacio por falta de dato historico).
function tasaVigenteEnMes(
  tiposCambio: TipoCambio[],
  codigoOrigen: string,
  codigoDestino: string,
  anio: number,
  mes: number
): number | null {
  const candidatos = tiposCambio.filter(
    (t) => t.codigo_moneda_origen === codigoOrigen && t.codigo_moneda_destino === codigoDestino
  );
  if (candidatos.length === 0) return null;
  const idx = indiceMes(anio, mes);
  const hastaEseMes = candidatos.filter((t) => indiceMes(t.anio, t.mes) <= idx);
  const elegido =
    hastaEseMes.length > 0
      ? hastaEseMes.reduce((masReciente, t) =>
          indiceMes(t.anio, t.mes) > indiceMes(masReciente.anio, masReciente.mes) ? t : masReciente
        )
      : candidatos.reduce((masAntiguo, t) =>
          indiceMes(t.anio, t.mes) < indiceMes(masAntiguo.anio, masAntiguo.mes) ? t : masAntiguo
        );
  return Number(elegido.tasa);
}

// Convierte el costo mensual a la moneda de facturacion de ese mes. Si
// coinciden las monedas, no hace falta tasa. Si no hay ninguna tasa
// cargada para ese par de monedas, devuelve null (el margen queda en
// "-" en vez de mostrar un numero calculado mezclando monedas distintas).
function convertirCostoAMoneda(
  costo: TalentoCostoHistorico,
  codigoDestino: string | null,
  tiposCambio: TipoCambio[],
  anio: number,
  mes: number
): number | null {
  const valor = Number(costo.costo_mensual);
  if (!codigoDestino || costo.codigo_moneda === codigoDestino) return valor;
  const tasa = tasaVigenteEnMes(tiposCambio, costo.codigo_moneda, codigoDestino, anio, mes);
  return tasa === null ? null : valor * tasa;
}

// Reutiliza sp_reporte_proyeccion_cliente (ya resuelve real/planificado
// mes a mes, respetando el congelado de un mes cerrado) filtrando por un
// solo talento, en vez de duplicar ese calculo. El costo/margen se
// agrega aca -- es aritmetica simple sobre datos que ya vienen de SPs,
// no una regla de negocio nueva. Compartido entre la ruta JSON y la de
// exportar a Excel para no duplicar esta orquestacion.
export async function construirReporteTalento(
  idCliente: number,
  idUsuario: number,
  anioDesde: number,
  mesDesde: number,
  anioHasta: number,
  mesHasta: number,
  idEmpresa: number,
  idUsuarioActor: number,
  rolActor: CodigoRol
): Promise<ReporteTalentoResponse> {
  const idxDesde = indiceMes(anioDesde, mesDesde);
  const idxHasta = indiceMes(anioHasta, mesHasta);
  if (idxHasta < idxDesde) {
    throw new BusinessError("El rango de meses no es valido");
  }

  const clientesPermitidos = await listarClientes(idUsuarioActor, rolActor, idEmpresa);
  const cliente = clientesPermitidos.find((c) => c.id_cliente === idCliente);
  if (!cliente) {
    throw new BusinessError("Cliente no encontrado");
  }

  const idProyecto = await resolverProyectoDeTalento(idUsuario, idCliente, idEmpresa);
  if (!idProyecto) {
    throw new BusinessError("Ese talento no tiene una asignacion activa a este cliente");
  }

  const hoy = new Date();
  const idxHoy = indiceMes(hoy.getFullYear(), hoy.getMonth() + 1);
  const mesesAtras = Math.max(0, idxHoy - idxDesde);
  const mesesAdelante = Math.max(0, idxHasta - idxHoy);

  const [proyeccion, historialCosto, historialPerfiles, historialTarifas, tiposCambio] = await Promise.all([
    reporteProyeccionCliente(idCliente, mesesAtras, mesesAdelante, idEmpresa),
    historialCostoTalento(idUsuario, idEmpresa),
    historialPerfilesTalento(idUsuario, idProyecto, idEmpresa),
    historialTarifasTalento(idUsuario, idProyecto, idEmpresa),
    listarTiposCambio(idEmpresa),
  ]);

  const filasTalento = proyeccion.filter(
    (r) => r.id_usuario === idUsuario && indiceMes(r.anio, r.mes) >= idxDesde && indiceMes(r.anio, r.mes) <= idxHasta
  );

  const meses: ReporteTalentoMesRow[] = filasTalento
    .sort((a, b) => indiceMes(a.anio, a.mes) - indiceMes(b.anio, b.mes))
    .map((r) => {
      const costo = costoVigenteEnMes(historialCosto, r.anio, r.mes);
      const costoMensual = costo ? convertirCostoAMoneda(costo, r.codigo_moneda, tiposCambio, r.anio, r.mes) : null;
      const ingresoReal = r.ingreso_real === null ? null : Number(r.ingreso_real);
      const margenDinero = ingresoReal !== null && costoMensual !== null ? ingresoReal - costoMensual : null;
      const margenPct =
        margenDinero !== null && ingresoReal !== null && ingresoReal !== 0 ? (margenDinero / ingresoReal) * 100 : null;
      return {
        anio: r.anio,
        mes: r.mes,
        es_ejecutado: r.es_ejecutado,
        horas_reales: r.horas_reales === null ? null : Number(r.horas_reales),
        ingreso_real: ingresoReal,
        horas_planificadas: Number(r.horas_planificadas),
        ingreso_planificado: Number(r.ingreso_planificado),
        codigo_moneda: r.codigo_moneda,
        moneda: r.moneda,
        costo_mensual: costoMensual,
        margen_dinero: margenDinero,
        margen_pct: margenPct,
      };
    });

  const mesesConHoras = meses.filter((m) => m.horas_reales !== null);
  const mesesConMonto = meses.filter((m) => m.ingreso_real !== null);
  const picoHoras =
    mesesConHoras.length > 0 ? mesesConHoras.reduce((max, m) => (m.horas_reales! > max.horas_reales! ? m : max)) : null;
  const picoMonto =
    mesesConMonto.length > 0 ? mesesConMonto.reduce((max, m) => (m.ingreso_real! > max.ingreso_real! ? m : max)) : null;

  return {
    colaborador: filasTalento[0]?.colaborador ?? "",
    cliente: cliente.nombre,
    meses,
    picoHoras,
    picoMonto,
    historialPerfiles,
    historialTarifas,
    historialCosto,
    tiposCambio,
  };
}
