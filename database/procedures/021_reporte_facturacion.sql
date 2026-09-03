-- =====================================================================
-- Stored Procedure: reporte de facturacion mensual por proyecto, para el
-- export "Resumen" de Reportes. Formato pedido por el cliente (hoja de
-- detalle por talento + hoja de facturacion agrupada por perfil/rate),
-- replica un excel que ya manejaban a mano.
--
-- Por talento: horas trabajadas, perfil/tarifa vigente al corte, tiempo
-- en falta/extra contra el objetivo, dias de ausencia aprobada, y "dias
-- fault" = dias laborales (sin contar ausencias) en los que no registro
-- ninguna hora en este proyecto.
--
-- Horas objetivo (Hour Target) son las horas PLANIFICADAS de cada
-- talento: dias laborales del mes hasta la fecha de corte, segun SU
-- calendario de feriados, menos SUS dias de ausencia aprobada (Dias
-- Off) -- ya excluye vacaciones/licencias, por eso "Tiempo en Falta" no
-- penaliza los dias que estuvo de baja aprobada (esos dias ya no cuentan
-- en el objetivo).
--
-- Solo se debe exponer desde rutas requireAdmin() -- incluye tarifas.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_facturacion_mensual $$
CREATE PROCEDURE sp_reporte_facturacion_mensual(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_anio             INT,
  IN p_mes              INT,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;
  DECLARE v_fecha_corte DATE;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

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
  dias_habiles AS (
    -- Fin de semana/feriado afuera, SIN excluir ausencias todavia (eso
    -- se resta aparte para poder reportar "Dias Off" por su cuenta).
    SELECT a.id_usuario, d.fecha
    FROM asignados a
    CROSS JOIN dias d
    WHERE d.fecha <= v_fecha_corte
      AND DAYOFWEEK(d.fecha) NOT IN (1, 7)
      AND NOT EXISTS (
        SELECT 1 FROM feriados f
        WHERE a.id_pais_calendario IS NOT NULL
          AND f.id_pais = a.id_pais_calendario
          AND f.fecha = d.fecha
          AND f.activo = 1
      )
  ),
  dias_ausencia AS (
    SELECT dh.id_usuario, dh.fecha
    FROM dias_habiles dh
    WHERE EXISTS (
      SELECT 1 FROM ausencias au
      JOIN maestro eau ON eau.id_maestro = au.id_estado AND eau.codigo = 'APROBADA'
      WHERE au.id_usuario = dh.id_usuario
        AND au.activo = 1
        AND au.fecha_inicio <= dh.fecha
        AND au.fecha_fin >= dh.fecha
    )
  ),
  dias_laborales AS (
    SELECT dh.id_usuario, dh.fecha
    FROM dias_habiles dh
    WHERE NOT EXISTS (
      SELECT 1 FROM dias_ausencia da WHERE da.id_usuario = dh.id_usuario AND da.fecha = dh.fecha
    )
  ),
  dias_trabajados AS (
    SELECT DISTINCT dl.id_usuario, dl.fecha
    FROM dias_laborales dl
    WHERE EXISTS (
      SELECT 1 FROM registros_tiempo rt
      JOIN tareas t ON t.id_tarea = rt.id_tarea
      WHERE t.id_proyecto = p_id_proyecto
        AND rt.id_usuario = dl.id_usuario
        AND rt.activo = 1
        AND rt.duracion_segundos IS NOT NULL
        AND DATE(rt.fecha_inicio) = dl.fecha
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
  ),
  perfil_vigente AS (
    SELECT a.id_usuario, upp.id_perfil
    FROM asignados a
    JOIN usuarios_proyectos_perfiles upp
      ON upp.id_usuario_proyecto = a.id_usuario_proyecto
     AND upp.fecha_desde <= v_fecha_corte
     AND (upp.fecha_hasta IS NULL OR upp.fecha_hasta >= v_fecha_corte)
  ),
  tarifa_vigente AS (
    SELECT pv.id_usuario, pv.id_perfil, pt.tarifa, pt.id_moneda
    FROM perfil_vigente pv
    LEFT JOIN perfiles_tarifas pt
      ON pt.id_perfil = pv.id_perfil
     AND pt.fecha_desde <= v_fecha_corte
     AND (pt.fecha_hasta IS NULL OR pt.fecha_hasta >= v_fecha_corte)
  )
  SELECT
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    u.numero_documento AS dni,
    pf.id_perfil,
    pf.codigo_externo AS id_rate,
    pf.nombre AS rate_nombre,
    tv.tarifa,
    mon.codigo AS codigo_moneda,
    ROUND(COALESCE(ht.segundos, 0) / 3600, 2) AS horas_trabajadas,
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario) * 8 AS horas_objetivo,
    (SELECT COUNT(*) FROM dias_ausencia da WHERE da.id_usuario = a.id_usuario) AS dias_off,
    GREATEST(
      0,
      (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario)
        - (SELECT COUNT(*) FROM dias_trabajados dt WHERE dt.id_usuario = a.id_usuario)
    ) AS dias_fault,
    v_fecha_corte AS fecha_corte
  FROM asignados a
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  LEFT JOIN tarifa_vigente tv ON tv.id_usuario = a.id_usuario
  LEFT JOIN perfiles pf ON pf.id_perfil = tv.id_perfil
  LEFT JOIN maestro mon ON mon.id_maestro = tv.id_moneda
  LEFT JOIN horas_trabajadas ht ON ht.id_usuario = a.id_usuario
  WHERE u.activo = 1
  ORDER BY u.nombres, u.apellidos;
END $$

-- Detalle de los registros_tiempo individuales de este proyecto/mes --
-- de donde salen los totales de sp_reporte_facturacion_mensual, para
-- poder auditar/reconstruir cada numero fila por fila (hoja aparte del
-- export, como el "Detailed Report" que ya manejaban a mano).
DROP PROCEDURE IF EXISTS sp_reporte_facturacion_detalle_horas $$
CREATE PROCEDURE sp_reporte_facturacion_detalle_horas(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_anio             INT,
  IN p_mes              INT,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;
  DECLARE v_fecha_corte DATE;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  SET v_inicio_mes = MAKEDATE(p_anio, 1) + INTERVAL (p_mes - 1) MONTH;
  SET v_fin_mes = LAST_DAY(v_inicio_mes);
  SET v_fecha_corte = LEAST(v_fin_mes, CURDATE() - INTERVAL 1 DAY);
  IF v_fecha_corte < v_inicio_mes THEN
    SET v_fecha_corte = v_inicio_mes - INTERVAL 1 DAY;
  END IF;

  SELECT rt.id_registro, CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
         t.nombre AS tarea, rt.fecha_inicio, rt.fecha_fin,
         ROUND(rt.duracion_segundos / 3600, 2) AS horas, rt.descripcion
  FROM registros_tiempo rt
  JOIN usuarios u ON u.id_usuario = rt.id_usuario
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  WHERE t.id_proyecto = p_id_proyecto
    AND rt.activo = 1
    AND rt.duracion_segundos IS NOT NULL
    AND rt.fecha_inicio >= v_inicio_mes
    AND rt.fecha_inicio < v_fecha_corte + INTERVAL 1 DAY
  ORDER BY u.nombres, u.apellidos, rt.fecha_inicio;
END $$

DELIMITER ;
