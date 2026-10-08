-- =====================================================================
-- Stored Procedure: proyeccion mensual de horas/ingresos para todos los
-- talentos de un cliente, desde N meses atras hasta N meses adelante.
--
-- Nota de diseno: a diferencia de sp_reporte_costos_mensual (que es el
-- documento de facturacion y por eso reconstruye la tarifa vigente
-- dia por dia), este reporte es de tendencia/proyeccion: tanto lo
-- planificado como lo real (de un mes NO cerrado) usan la tarifa
-- VIGENTE HOY de cada talento, de forma consistente. La excepcion es un
-- mes ya CERRADO en Facturacion (ver mas abajo): ahi el Real es el
-- monto congelado exacto, no un recalculo con tarifa vigente hoy.
--
-- Planificado = dias laborales del mes completo (calendario del
-- talento, menos feriados y ausencias APROBADAS) x 8h x tarifa vigente,
-- SOLO para talentos con asignacion activa HOY (no tiene sentido
-- proyectar horas futuras para alguien que ya no esta en el proyecto).
-- Real = horas realmente trabajadas hasta HOY-1 (NULL si el mes todavia
-- no empieza) x tarifa vigente, para CUALQUIER talento que haya
-- registrado horas ese mes -- si se desactivo su asignacion despues
-- (ej. salio del proyecto), sus horas YA TRABAJADAS en meses pasados no
-- deben desaparecer del reporte solo porque hoy ya no figura asignado.
--
-- Si el proyecto ya cerro ese mes en Facturacion (facturacion_cierres),
-- el Real de ese mes NO se recalcula: se toma tal cual del detalle
-- congelado (facturacion_cierre_detalle), para que coincida siempre con
-- el monto fijo ya facturado y no se mueva por cambios de tarifa/perfil
-- posteriores. Si el mes no esta cerrado, se sigue calculando en vivo
-- con la tarifa vigente hoy (como antes).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_proyeccion_cliente $$
CREATE PROCEDURE sp_reporte_proyeccion_cliente(
  IN p_id_cliente       INT UNSIGNED,
  IN p_meses_atras      INT UNSIGNED,
  IN p_meses_adelante   INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
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

  IF NOT EXISTS (SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente no encontrado';
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
    asignados_actuales AS (
      -- Para lo PLANIFICADO: solo asignaciones vigentes HOY (define a
      -- quien tiene sentido proyectarle horas futuras).
      SELECT up.id_usuario_proyecto, up.id_usuario, up.id_pais_calendario
      FROM usuarios_proyectos up
      JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
      WHERE pr.id_cliente = p_id_cliente AND up.activo = 1 AND pr.activo = 1
    ),
    asignados_historicos AS (
      -- Para tarifa y horas REALES: cualquier asignacion de este
      -- cliente, este activa o no -- si un talento se desactivo del
      -- proyecto despues de trabajar, sus horas ya trabajadas en un mes
      -- pasado no deben perderse ni perder con que tarifa resolverlas.
      SELECT up.id_usuario_proyecto, up.id_usuario, up.id_pais_calendario
      FROM usuarios_proyectos up
      JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
      WHERE pr.id_cliente = p_id_cliente
    ),
    proyectos_cerrados AS (
      -- Proyectos de este cliente que ya cerraron Facturacion para este
      -- mes especifico: su Real no se recalcula, se usa el congelado.
      SELECT c.id_proyecto
      FROM facturacion_cierres c
      JOIN proyectos pr ON pr.id_proyecto = c.id_proyecto
      WHERE pr.id_cliente = p_id_cliente
        AND c.anio = YEAR(v_inicio_mes) AND c.mes = MONTH(v_inicio_mes) AND c.cerrado = 1
    ),
    horas_congeladas AS (
      SELECT d.id_usuario,
             SUM(d.horas_trabajadas) AS horas,
             SUM(d.horas_trabajadas * COALESCE(d.tarifa, 0)) AS ingreso
      FROM facturacion_cierre_detalle d
      JOIN facturacion_cierres c ON c.id_cierre = d.id_cierre
      WHERE c.id_proyecto IN (SELECT id_proyecto FROM proyectos_cerrados)
        AND c.anio = YEAR(v_inicio_mes) AND c.mes = MONTH(v_inicio_mes) AND c.cerrado = 1
      GROUP BY d.id_usuario
    ),
    horas_reales AS (
      -- Solo de proyectos NO cerrados ese mes: lo de proyectos cerrados
      -- viene de horas_congeladas, no se vuelve a calcular.
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
        AND pr.id_proyecto NOT IN (SELECT id_proyecto FROM proyectos_cerrados)
      GROUP BY rt.id_usuario
    ),
    talentos AS (
      -- Cualquiera asignado hoy (para que aparezca con lo planificado),
      -- UNION cualquiera con horas reales (vivas o congeladas) este mes
      -- aunque ya no este asignado (para que no desaparezca su real
      -- historico).
      SELECT id_usuario FROM asignados_actuales
      UNION
      SELECT id_usuario FROM horas_reales
      UNION
      SELECT id_usuario FROM horas_congeladas
    ),
    dias_laborales AS (
      SELECT a.id_usuario, d.fecha
      FROM asignados_actuales a
      CROSS JOIN dias d
      WHERE DAYOFWEEK(d.fecha) NOT IN (1, 7)
        AND NOT EXISTS (
          SELECT 1 FROM feriados f
          WHERE f.id_pais = a.id_pais_calendario AND f.fecha = d.fecha AND f.activo = 1
            AND a.id_pais_calendario IS NOT NULL
        )
        AND NOT EXISTS (
          SELECT 1 FROM ausencias au
          JOIN maestro eau ON eau.id_maestro = au.id_estado AND eau.codigo = 'APROBADA'
          WHERE au.id_usuario = a.id_usuario AND au.activo = 1
            AND au.fecha_inicio <= d.fecha AND au.fecha_fin >= d.fecha
        )
    ),
    tarifa_actual AS (
      SELECT ah.id_usuario, MAX(pt.tarifa) AS tarifa, MAX(pt.id_moneda) AS id_moneda
      FROM asignados_historicos ah
      LEFT JOIN usuarios_proyectos_perfiles upp
             ON upp.id_usuario_proyecto = ah.id_usuario_proyecto AND upp.fecha_hasta IS NULL
      LEFT JOIN perfiles_tarifas pt ON pt.id_perfil = upp.id_perfil AND pt.fecha_hasta IS NULL
      GROUP BY ah.id_usuario
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
      CASE WHEN v_inicio_mes <= v_hoy
        THEN ROUND(COALESCE(hr.segundos, 0) / 3600 + COALESCE(hc.horas, 0), 2)
        ELSE NULL END,
      CASE WHEN v_inicio_mes <= v_hoy
        THEN ROUND((COALESCE(hr.segundos, 0) / 3600) * COALESCE(ta.tarifa, 0) + COALESCE(hc.ingreso, 0), 2)
        ELSE NULL END
    FROM talentos tl
    JOIN usuarios u ON u.id_usuario = tl.id_usuario
    LEFT JOIN tarifa_actual ta ON ta.id_usuario = tl.id_usuario
    LEFT JOIN maestro mon ON mon.id_maestro = ta.id_moneda
    LEFT JOIN horas_reales hr ON hr.id_usuario = tl.id_usuario
    LEFT JOIN horas_congeladas hc ON hc.id_usuario = tl.id_usuario
    WHERE u.activo = 1;

    SET v_mes_cursor = v_mes_cursor + INTERVAL 1 MONTH;
  END WHILE;

  SELECT * FROM tmp_proyeccion ORDER BY anio, mes, colaborador;
END $$

DELIMITER ;
