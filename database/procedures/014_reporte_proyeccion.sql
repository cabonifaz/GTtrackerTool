-- =====================================================================
-- Stored Procedure: proyeccion mensual de horas/ingresos para todos los
-- talentos de un cliente, desde N meses atras hasta N meses adelante.
--
-- Nota de diseno: a diferencia de sp_reporte_costos_mensual (que es el
-- documento de facturacion y por eso reconstruye la tarifa vigente
-- dia por dia), este reporte es de tendencia/proyeccion: tanto lo
-- planificado como lo real usan la tarifa VIGENTE HOY de cada talento,
-- de forma consistente en todos los meses (pasados y futuros). Para el
-- monto exacto a facturar de un mes ya cerrado, usar el reporte de
-- Costos.
--
-- Planificado = dias laborales del mes completo (calendario del
-- talento, menos feriados y ausencias APROBADAS) x 8h x tarifa vigente.
-- Real = horas realmente trabajadas hasta HOY-1 (NULL si el mes todavia
-- no empieza) x tarifa vigente.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_proyeccion_cliente $$
CREATE PROCEDURE sp_reporte_proyeccion_cliente(
  IN p_id_cliente     INT UNSIGNED,
  IN p_meses_atras    INT UNSIGNED,
  IN p_meses_adelante INT UNSIGNED
)
BEGIN
  DECLARE v_mes_cursor DATE;
  DECLARE v_mes_final DATE;
  DECLARE v_hoy DATE DEFAULT CURDATE();
  DECLARE v_mes_actual DATE DEFAULT MAKEDATE(YEAR(CURDATE()), 1) + INTERVAL (MONTH(CURDATE()) - 1) MONTH;
  DECLARE v_horas_jornada DECIMAL(4,2) DEFAULT 8.00;
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;
  DECLARE v_fecha_corte DATE;

  IF p_meses_atras + p_meses_adelante > 36 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango de meses no puede superar 36';
  END IF;

  DROP TEMPORARY TABLE IF EXISTS tmp_proyeccion;
  CREATE TEMPORARY TABLE tmp_proyeccion (
    anio                INT,
    mes                 INT,
    id_usuario          INT UNSIGNED,
    colaborador         VARCHAR(200),
    es_ejecutado        TINYINT(1),
    dias_laborales      INT,
    horas_planificadas  DECIMAL(10,2),
    codigo_moneda       VARCHAR(10),
    moneda              VARCHAR(50),
    ingreso_planificado DECIMAL(12,2),
    horas_reales        DECIMAL(10,2),
    ingreso_real        DECIMAL(12,2)
  );

  SET v_mes_cursor = v_mes_actual - INTERVAL p_meses_atras MONTH;
  SET v_mes_final = v_mes_actual + INTERVAL p_meses_adelante MONTH;

  WHILE v_mes_cursor <= v_mes_final DO
    SET v_inicio_mes = v_mes_cursor;
    SET v_fin_mes = LAST_DAY(v_mes_cursor);
    SET v_fecha_corte = LEAST(v_fin_mes, v_hoy - INTERVAL 1 DAY);
    IF v_fecha_corte < v_inicio_mes THEN
      SET v_fecha_corte = v_inicio_mes - INTERVAL 1 DAY;
    END IF;

    INSERT INTO tmp_proyeccion (
      anio, mes, id_usuario, colaborador, es_ejecutado, dias_laborales,
      horas_planificadas, codigo_moneda, moneda, ingreso_planificado, horas_reales, ingreso_real
    )
    WITH RECURSIVE dias AS (
      SELECT v_inicio_mes AS fecha
      UNION ALL
      SELECT fecha + INTERVAL 1 DAY FROM dias WHERE fecha < v_fin_mes
    ),
    asignados AS (
      SELECT up.id_usuario_proyecto, up.id_usuario, up.id_pais_calendario
      FROM usuarios_proyectos up
      JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
      WHERE pr.id_cliente = p_id_cliente AND up.activo = 1 AND pr.activo = 1
    ),
    talentos AS (
      SELECT DISTINCT id_usuario FROM asignados
    ),
    dias_laborales AS (
      SELECT t.id_usuario, d.fecha
      FROM talentos t
      CROSS JOIN dias d
      WHERE DAYOFWEEK(d.fecha) NOT IN (1, 7)
        AND NOT EXISTS (
          SELECT 1 FROM asignados a
          JOIN feriados f ON f.id_pais = a.id_pais_calendario AND f.fecha = d.fecha AND f.activo = 1
          WHERE a.id_usuario = t.id_usuario AND a.id_pais_calendario IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM ausencias au
          JOIN maestro eau ON eau.id_maestro = au.id_estado AND eau.codigo = 'APROBADA'
          WHERE au.id_usuario = t.id_usuario AND au.activo = 1
            AND au.fecha_inicio <= d.fecha AND au.fecha_fin >= d.fecha
        )
    ),
    tarifa_actual AS (
      SELECT a.id_usuario, MAX(pt.tarifa) AS tarifa, MAX(pt.id_moneda) AS id_moneda
      FROM asignados a
      LEFT JOIN usuarios_proyectos_perfiles upp
             ON upp.id_usuario_proyecto = a.id_usuario_proyecto AND upp.fecha_hasta IS NULL
      LEFT JOIN perfiles_tarifas pt ON pt.id_perfil = upp.id_perfil AND pt.fecha_hasta IS NULL
      GROUP BY a.id_usuario
    ),
    horas_reales AS (
      SELECT rt.id_usuario, SUM(rt.duracion_segundos) AS segundos
      FROM registros_tiempo rt
      JOIN tareas t ON t.id_tarea = rt.id_tarea
      JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
      WHERE pr.id_cliente = p_id_cliente
        AND rt.activo = 1
        AND rt.duracion_segundos IS NOT NULL
        AND rt.fecha_inicio >= v_inicio_mes
        AND rt.fecha_inicio < v_fecha_corte + INTERVAL 1 DAY
        AND v_inicio_mes <= v_hoy
      GROUP BY rt.id_usuario
    )
    SELECT
      YEAR(v_inicio_mes),
      MONTH(v_inicio_mes),
      u.id_usuario,
      CONCAT(u.nombres, ' ', u.apellidos),
      IF(v_fin_mes < v_hoy, 1, 0),
      (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = u.id_usuario),
      ROUND((SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = u.id_usuario) * v_horas_jornada, 2),
      mon.codigo,
      mon.valor,
      ROUND(
        (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = u.id_usuario)
          * v_horas_jornada * COALESCE(ta.tarifa, 0),
        2
      ),
      CASE WHEN v_inicio_mes <= v_hoy THEN ROUND(COALESCE(hr.segundos, 0) / 3600, 2) ELSE NULL END,
      CASE WHEN v_inicio_mes <= v_hoy
        THEN ROUND((COALESCE(hr.segundos, 0) / 3600) * COALESCE(ta.tarifa, 0), 2)
        ELSE NULL END
    FROM talentos tl
    JOIN usuarios u ON u.id_usuario = tl.id_usuario
    LEFT JOIN tarifa_actual ta ON ta.id_usuario = tl.id_usuario
    LEFT JOIN maestro mon ON mon.id_maestro = ta.id_moneda
    LEFT JOIN horas_reales hr ON hr.id_usuario = tl.id_usuario
    WHERE u.activo = 1;

    SET v_mes_cursor = v_mes_cursor + INTERVAL 1 MONTH;
  END WHILE;

  SELECT * FROM tmp_proyeccion ORDER BY anio, mes, colaborador;
END $$

DELIMITER ;
