import { BusinessError, executeProcedure } from "@/lib/db";
import { obtenerTipoCambioSolPorDolarBcrp } from "@/lib/services/bcrpService";
import { listarClientes } from "@/lib/services/clienteService";
import { listarMaestro } from "@/lib/services/maestroService";
import { reporteProyeccionCliente } from "@/lib/services/reporteService";
import { historialCostoTalento } from "@/lib/services/talentoCostoService";
import { asignarTipoCambio, listarTiposCambio } from "@/lib/services/tipoCambioService";
import {
  CodigoRol,
  ProyeccionRow,
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

const CREADO_POR_BCRP = "BCRP (automatico)";

// Unico par que cubre la serie del BCRP que usamos (Sol/Dolar). "tasa"
// siempre es "unidades de destino por 1 de origen".
function tasaDesdeBcrp(codigoOrigen: string, codigoDestino: string, solPorDolar: number): number | null {
  if (codigoOrigen === "USD" && codigoDestino === "PEN") return solPorDolar;
  if (codigoOrigen === "PEN" && codigoDestino === "USD") return 1 / solPorDolar;
  return null;
}

function parSoportadoPorBcrp(codigoOrigen: string, codigoDestino: string): boolean {
  return (codigoOrigen === "USD" && codigoDestino === "PEN") || (codigoOrigen === "PEN" && codigoDestino === "USD");
}

// Si a algun mes del reporte le falta el tipo de cambio exacto (costo
// en una moneda distinta a la facturada, sin tasa cargada para ese mes
// puntual), se intenta traer el TC de cierre de ese mes de la API
// publica del BCRP y se guarda en tipos_cambio -- la proxima vez que se
// pida este mismo mes ya esta en BD y no se vuelve a consultar la API.
// Si el par no es Sol/Dolar o el BCRP no responde, se sigue sin tasa (el
// calculo de margen tiene su propio respaldo con la tasa mas cercana
// conocida).
async function completarTiposCambioFaltantesDesdeBcrp(
  filasTalento: ProyeccionRow[],
  historialCosto: TalentoCostoHistorico[],
  tiposCambio: TipoCambio[],
  idEmpresa: number
): Promise<TipoCambio[]> {
  const faltantes = new Map<string, { anio: number; mes: number; codigoOrigen: string; codigoDestino: string }>();
  for (const r of filasTalento) {
    const costo = costoVigenteEnMes(historialCosto, r.anio, r.mes);
    if (!costo || !r.codigo_moneda || costo.codigo_moneda === r.codigo_moneda) continue;
    if (!parSoportadoPorBcrp(costo.codigo_moneda, r.codigo_moneda)) continue;
    const yaExacto = tiposCambio.some(
      (t) =>
        t.codigo_moneda_origen === costo.codigo_moneda &&
        t.codigo_moneda_destino === r.codigo_moneda &&
        t.anio === r.anio &&
        t.mes === r.mes
    );
    if (yaExacto) continue;
    faltantes.set(`${r.anio}-${r.mes}-${costo.codigo_moneda}-${r.codigo_moneda}`, {
      anio: r.anio,
      mes: r.mes,
      codigoOrigen: costo.codigo_moneda,
      codigoDestino: r.codigo_moneda,
    });
  }
  if (faltantes.size === 0) return tiposCambio;

  const monedas = await listarMaestro("MONEDA");
  const idPorCodigo = new Map(monedas.map((m) => [m.codigo, m.id_maestro]));

  const nuevas: TipoCambio[] = [];
  await Promise.all(
    Array.from(faltantes.values()).map(async (f) => {
      const solPorDolar = await obtenerTipoCambioSolPorDolarBcrp(f.anio, f.mes);
      if (solPorDolar === null) return;
      const tasa = tasaDesdeBcrp(f.codigoOrigen, f.codigoDestino, solPorDolar);
      const idOrigen = idPorCodigo.get(f.codigoOrigen);
      const idDestino = idPorCodigo.get(f.codigoDestino);
      if (tasa === null || !idOrigen || !idDestino) return;
      try {
        await asignarTipoCambio(f.anio, f.mes, idOrigen, idDestino, tasa, idEmpresa, CREADO_POR_BCRP);
        nuevas.push({
          id_tipo_cambio: 0,
          anio: f.anio,
          mes: f.mes,
          id_moneda_origen: idOrigen,
          codigo_moneda_origen: f.codigoOrigen,
          id_moneda_destino: idDestino,
          codigo_moneda_destino: f.codigoDestino,
          tasa,
        });
      } catch {
        // Si falla el guardado (ej. otra solicitud concurrente lo guardo
        // primero), no es grave: el calculo de este request igual tiene
        // la tasa en memoria, y la proxima consulta la encuentra en BD.
      }
    })
  );

  return [...tiposCambio, ...nuevas];
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

  const tiposCambioCompletos = await completarTiposCambioFaltantesDesdeBcrp(
    filasTalento,
    historialCosto,
    tiposCambio,
    idEmpresa
  );

  const meses: ReporteTalentoMesRow[] = filasTalento
    .sort((a, b) => indiceMes(a.anio, a.mes) - indiceMes(b.anio, b.mes))
    .map((r) => {
      const costo = costoVigenteEnMes(historialCosto, r.anio, r.mes);
      const costoMensual = costo
        ? convertirCostoAMoneda(costo, r.codigo_moneda, tiposCambioCompletos, r.anio, r.mes)
        : null;
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
    tiposCambio: tiposCambioCompletos,
  };
}
