-- =====================================================================
-- Stored Procedure: reporte de costos mensual por proyecto.
-- Calcula, por cada talento asignado al proyecto: horas trabajadas en
-- el mes (hasta HOY-1, nunca el dia de hoy porque aun no cierra), el
-- costo resultante de multiplicar esas horas por la tarifa que estaba
-- VIGENTE cada dia (el perfil/tarifa puede haber cambiado a mitad de
-- mes), y los dias laborales del mes segun el calendario de feriados
-- del talento para ese proyecto.
--
-- Solo se debe exponer desde rutas requireAdmin() -- incluye montos de
-- dinero que un Talento nunca debe poder ver.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_costos_mensual $$
CREATE PROCEDURE sp_reporte_costos_mensual(
  IN p_id_proyecto INT UNSIGNED,
  IN p_anio        INT,
  IN p_mes         INT
)
BEGIN
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;
  DECLARE v_fecha_corte DATE;

  SET v_inicio_mes = MAKEDATE(p_anio, 1) + INTERVAL (p_mes - 1) MONTH;
  SET v_fin_mes = LAST_DAY(v_inicio_mes);
  SET v_fecha_corte = LEAST(v_fin_mes, CURDATE() - INTERVAL 1 DAY);

  IF v_fecha_corte < v_inicio_mes THEN
    -- Mes que recien empieza (se pidio el mes actual el dia 1): todavia
    -- no hay ningun dia cerrado que reportar.
    SET v_fecha_corte = v_inicio_mes - INTERVAL 1 DAY;
  END IF;

  WITH RECURSIVE dias AS (
    SELECT v_inicio_mes AS fecha
    UNION ALL
    SELECT fecha + INTERVAL 1 DAY FROM dias WHERE fecha < v_fin_mes
  ),
  asignados AS (
    SELECT up.id_usuario_proyecto, up.id_usuario, up.id_pais_calendario
    FROM usuarios_proyectos up
    WHERE up.id_proyecto = p_id_proyecto AND up.activo = 1
  ),
  dias_laborales AS (
    SELECT a.id_usuario, d.fecha
    FROM asignados a
    CROSS JOIN dias d
    WHERE DAYOFWEEK(d.fecha) NOT IN (1, 7)
      AND NOT EXISTS (
        SELECT 1 FROM feriados f
        WHERE a.id_pais_calendario IS NOT NULL
          AND f.id_pais = a.id_pais_calendario
          AND f.fecha = d.fecha
          AND f.activo = 1
      )
  ),
  horas_por_dia AS (
    SELECT rt.id_usuario, DATE(rt.fecha_inicio) AS fecha, SUM(rt.duracion_segundos) AS segundos
    FROM registros_tiempo rt
    JOIN tareas t ON t.id_tarea = rt.id_tarea
    WHERE t.id_proyecto = p_id_proyecto
      AND rt.activo = 1
      AND rt.duracion_segundos IS NOT NULL
      AND rt.fecha_inicio >= v_inicio_mes
      AND rt.fecha_inicio < v_fecha_corte + INTERVAL 1 DAY
    GROUP BY rt.id_usuario, DATE(rt.fecha_inicio)
  ),
  costo_por_dia AS (
    SELECT
      h.id_usuario,
      h.fecha,
      h.segundos,
      pt.tarifa,
      pt.id_moneda,
      mon.codigo AS codigo_moneda,
      mon.valor AS moneda
    FROM horas_por_dia h
    JOIN asignados a ON a.id_usuario = h.id_usuario
    LEFT JOIN usuarios_proyectos_perfiles upp
           ON upp.id_usuario_proyecto = a.id_usuario_proyecto
          AND upp.fecha_desde <= h.fecha
          AND (upp.fecha_hasta IS NULL OR upp.fecha_hasta >= h.fecha)
    LEFT JOIN perfiles_tarifas pt
           ON pt.id_perfil = upp.id_perfil
          AND pt.fecha_desde <= h.fecha
          AND (pt.fecha_hasta IS NULL OR pt.fecha_hasta >= h.fecha)
    LEFT JOIN maestro mon ON mon.id_maestro = pt.id_moneda
  )
  SELECT
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    paism.valor AS pais_calendario,
    v_inicio_mes AS fecha_inicio_mes,
    v_fin_mes AS fecha_fin_mes,
    v_fecha_corte AS fecha_corte,
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario) AS dias_laborales_totales_mes,
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte)
      AS dias_laborales_a_fecha,
    ROUND(COALESCE(SUM(cpd.segundos), 0) / 3600, 2) AS horas_trabajadas,
    ROUND(COALESCE(SUM(CASE WHEN cpd.tarifa IS NULL THEN cpd.segundos ELSE 0 END), 0) / 3600, 2)
      AS horas_sin_tarifa,
    cpd.codigo_moneda,
    cpd.moneda,
    ROUND(COALESCE(SUM(CASE WHEN cpd.tarifa IS NOT NULL THEN (cpd.segundos / 3600) * cpd.tarifa ELSE 0 END), 0), 2)
      AS costo_total
  FROM asignados a
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  LEFT JOIN maestro paism ON paism.id_maestro = a.id_pais_calendario
  LEFT JOIN costo_por_dia cpd ON cpd.id_usuario = a.id_usuario
  WHERE u.activo = 1
  GROUP BY u.id_usuario, u.nombres, u.apellidos, paism.valor, cpd.codigo_moneda, cpd.moneda
  ORDER BY u.nombres, u.apellidos;
END $$

DELIMITER ;
