export type CodigoRol = "SUPER_ADMIN" | "ADMIN" | "TALENTO";

export type CodigoTipoPlanEmpresa = "PAGO_USUARIO" | "GRATIS_PUBLICIDAD";

export interface Empresa {
  id_empresa: number;
  nombre: string;
  slug: string;
  tiene_logo: number;
  color_primario: string;
  color_secundario: string;
  suspendida: number;
  activo: number;
  fecha_creacion: string;
  id_tipo_plan: number | null;
  codigo_tipo_plan: CodigoTipoPlanEmpresa | null;
  tipo_plan: string | null;
  limite_usuarios: number | null;
  tarifa_por_usuario: number | null;
  id_moneda: number | null;
  codigo_moneda: string | null;
  moneda: string | null;
  publicidad_activa: number;
  usuarios_activos?: number;
}

export interface MaestroItem {
  id_maestro: number;
  tipo_maestro: string;
  codigo: string;
  valor: string;
  descripcion: string | null;
  orden: number;
  id_padre: number | null;
}

export interface Usuario {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  codigo_rol: CodigoRol;
  rol: string;
  activo: number;
  fecha_creacion: string;
  id_empresa: number | null;
  empresa: string | null;
  empresa_slug: string | null;
}

export interface UsuarioConHash extends Usuario {
  password_hash: string;
  debe_cambiar_password: number;
  empresa_nombre: string | null;
  empresa_suspendida: number | null;
}

export interface UsuarioSistema {
  id_usuario_sistema: number;
  nombre_sistema: string;
  api_key: string;
  activo: number;
  fecha_creacion: string;
}

export interface Cliente {
  id_cliente: number;
  nombre: string;
  activo: number;
  fecha_creacion: string;
}

export interface Proyecto {
  id_proyecto: number;
  id_cliente: number | null;
  cliente: string | null;
  nombre: string;
  descripcion: string | null;
  codigo_estado: string;
  estado: string;
  activo: number;
  fecha_creacion: string;
}

export interface MiProyecto {
  id_proyecto: number;
  proyecto: string;
  predeterminado: number;
  id_pais_calendario: number | null;
  codigo_pais: string | null;
  pais: string | null;
}

export interface Feriado {
  id_feriado: number;
  fecha: string;
  nombre: string;
  dias_faltantes?: number;
}

export interface FeriadoAdmin {
  id_feriado: number;
  id_pais: number;
  pais: string;
  fecha: string;
  nombre: string;
}

export interface Tarea {
  id_tarea: number;
  id_proyecto: number;
  proyecto: string;
  nombre: string;
  descripcion: string | null;
  codigo_estado: string;
  estado: string;
  activo: number;
  fecha_creacion: string;
  total_segundos: number;
}

export interface RegistroActivo {
  id_registro: number;
  id_tarea: number;
  tarea: string;
  fecha_inicio: string;
  descripcion: string | null;
}

export interface UltimaTarea {
  id_tarea: number;
  tarea: string;
  proyecto: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  total_segundos: number;
}

export interface UsuarioAsignado {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  id_pais_calendario: number | null;
  codigo_pais: string | null;
  pais: string | null;
  id_perfil: number | null;
  perfil: string | null;
  tarifa: number | null;
  codigo_moneda: string | null;
  moneda: string | null;
}

export interface Perfil {
  id_perfil: number;
  id_cliente: number;
  cliente: string;
  nombre: string;
  tarifa: number | null;
  id_moneda: number | null;
  codigo_moneda: string | null;
  moneda: string | null;
  fecha_creacion: string;
}

export interface PerfilTarifaHistorico {
  id_perfil_tarifa: number;
  tarifa: number;
  codigo_moneda: string;
  moneda: string;
  fecha_desde: string;
  fecha_hasta: string | null;
}

export interface ReporteCostoRow {
  id_usuario: number;
  colaborador: string;
  pais_calendario: string | null;
  fecha_inicio_mes: string;
  fecha_fin_mes: string;
  fecha_corte: string;
  dias_laborales_totales_mes: number;
  dias_laborales_a_fecha: number;
  horas_trabajadas: number;
  horas_sin_tarifa: number;
  codigo_moneda: string | null;
  moneda: string | null;
  costo_total: number;
}

export interface ReporteDetalleRow {
  id_registro: number;
  id_usuario: number;
  colaborador: string;
  cliente: string | null;
  proyecto: string;
  tarea: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_segundos: number;
  horas: number;
  descripcion: string | null;
}

export interface ReporteTareaRow {
  id_tarea: number;
  colaborador: string;
  cliente: string | null;
  proyecto: string;
  tarea: string;
  estado_tarea: string;
  sesiones: number;
  duracion_segundos: number;
  horas: number;
  primer_inicio: string;
  ultimo_fin: string;
}

export interface ResumenAvanceRow {
  id_usuario: number;
  colaborador: string;
  usuario_activo: number;
  pais_calendario: string | null;
  fecha_corte: string;
  dias_laborales_totales_mes: number;
  dias_laborales_a_fecha: number;
  horas_trabajadas: number;
  horas_planificadas_a_fecha: number;
  semaforo: "VERDE" | "AMARILLO" | "ROJO";
}

export interface Ausencia {
  id_ausencia: number;
  codigo_tipo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  codigo_estado: string;
  estado: string;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  motivo_rechazo: string | null;
  tiene_evidencia: number;
  fecha_creacion: string;
}

export interface AusenciaAdmin extends Ausencia {
  id_usuario: number;
  colaborador: string;
}

export interface SaldoVacaciones {
  id_usuario: number;
  anio: number;
  dias_asignados: number;
  dias_usados: number;
}

export interface ProyeccionRow {
  anio: number;
  mes: number;
  id_usuario: number;
  colaborador: string;
  es_ejecutado: number;
  dias_laborales: number;
  horas_planificadas: number;
  codigo_moneda: string | null;
  moneda: string | null;
  ingreso_planificado: number;
  horas_reales: number | null;
  ingreso_real: number | null;
}

export interface ImportarFilaResultado {
  fila: number;
  ok: boolean;
  mensaje: string;
  proyecto: string;
  tarea: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}
