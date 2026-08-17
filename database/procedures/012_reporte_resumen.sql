-- =====================================================================
-- Stored Procedure: resumen de avance de horas por talento en un
-- proyecto, para un mes dado. Compara horas realmente trabajadas hasta
-- HOY-1 contra las horas "planificadas" hasta esa misma fecha (dias
-- laborales transcurridos, segun el calendario de feriados del talento
-- para ese proyecto, x una jornada estandar) y arma un semaforo de
-- avance para que el Admin decida a quien recordarle que actualice sus
-- horas.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_resumen_avance $$
CREATE PROCEDURE sp_reporte_resumen_avance(
  IN p_id_proyecto INT UNSIGNED,
  IN p_anio        INT,
  IN p_mes         INT
)
BEGIN
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;
  DECLARE v_fecha_corte DATE;
  DECLARE v_horas_jornada DECIMAL(4,2) DEFAULT 8.00;

  SET v_inicio_mes = MAKEDATE(p_anio, 1) + INTERVAL (p_mes - 1) MONTH;
  SET v_fin_mes = LAST_DAY(v_inicio_mes);
  SET v_fecha_corte = LEAST(v_fin_mes, CURDATE() - INTERVAL 1 DAY);

  IF v_fecha_corte < v_inicio_mes THEN
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
    -- Dia laboral = no es fin de semana, no es feriado del calendario del
    -- talento, y no tiene una ausencia APROBADA (vacaciones/enfermedad)
    -- ese dia -- no queremos que el semaforo lo castigue por dias off.
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
      AND NOT EXISTS (
        SELECT 1 FROM ausencias au
        JOIN maestro eau ON eau.id_maestro = au.id_estado AND eau.codigo = 'APROBADA'
        WHERE au.id_usuario = a.id_usuario
          AND au.activo = 1
          AND au.fecha_inicio <= d.fecha
          AND au.fecha_fin >= d.fecha
      )
  ),
  horas_trabajadas AS (
    SELECT rt.id_usuario, SUM(rt.duracion_segundos) AS segundos
    FROM registros_tiempo rt
    JOIN tareas t ON t.id_tarea = rt.id_tarea
    WHERE t.id_proyecto = p_id_proyecto
      AND rt.activo = 1
      AND rt.duracion_segundos IS NOT NULL
      AND rt.fecha_inicio >= v_inicio_mes
      AND rt.fecha_inicio < v_fecha_corte + INTERVAL 1 DAY
    GROUP BY rt.id_usuario
  )
  SELECT
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    u.activo AS usuario_activo,
    paism.valor AS pais_calendario,
    v_fecha_corte AS fecha_corte,
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario) AS dias_laborales_totales_mes,
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte)
      AS dias_laborales_a_fecha,
    ROUND(COALESCE(ht.segundos, 0) / 3600, 2) AS horas_trabajadas,
    ROUND(
      (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte)
        * v_horas_jornada,
      2
    ) AS horas_planificadas_a_fecha,
    CASE
      WHEN (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte) = 0
        THEN 'VERDE'
      WHEN (COALESCE(ht.segundos, 0) / 3600) / (
        (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte)
          * v_horas_jornada
      ) >= 0.9 THEN 'VERDE'
      WHEN (COALESCE(ht.segundos, 0) / 3600) / (
        (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario AND dl.fecha <= v_fecha_corte)
          * v_horas_jornada
      ) >= 0.7 THEN 'AMARILLO'
      ELSE 'ROJO'
    END AS semaforo
  FROM asignados a
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  LEFT JOIN maestro paism ON paism.id_maestro = a.id_pais_calendario
  LEFT JOIN horas_trabajadas ht ON ht.id_usuario = a.id_usuario
  ORDER BY u.nombres, u.apellidos;
END $$

DELIMITER ;
