-- =====================================================================
-- Cierre de mes del reporte de facturacion: congela el detalle por
-- talento tal como estaba al momento del cierre (mismo calculo que
-- sp_reporte_facturacion_mensual, pero persistido), para que una
-- correccion posterior de tarifa/perfil no cambie retroactivamente un
-- mes ya facturado/cerrado. Reabrir descongela (vuelve a calcular en
-- vivo la proxima vez que se pida el reporte).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_facturacion_mes_estado $$
CREATE PROCEDURE sp_facturacion_mes_estado(
  IN p_id_proyecto INT UNSIGNED,
  IN p_anio        INT,
  IN p_mes         INT
)
BEGIN
  SELECT cerrado, creado_por AS cerrado_por, fecha_creacion AS fecha_cierre
  FROM facturacion_cierres
  WHERE id_proyecto = p_id_proyecto AND anio = p_anio AND mes = p_mes;
END $$

DROP PROCEDURE IF EXISTS sp_facturacion_mes_cerrar $$
CREATE PROCEDURE sp_facturacion_mes_cerrar(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_anio             INT,
  IN p_mes              INT,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_cerrado_por      VARCHAR(150)
)
BEGIN
  DECLARE v_id_cierre INT UNSIGNED;
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

  INSERT INTO facturacion_cierres (id_proyecto, anio, mes, cerrado, creado_por)
  VALUES (p_id_proyecto, p_anio, p_mes, 1, p_cerrado_por)
  ON DUPLICATE KEY UPDATE cerrado = 1, modificado_por = p_cerrado_por;

  SELECT id_cierre INTO v_id_cierre
  FROM facturacion_cierres
  WHERE id_proyecto = p_id_proyecto AND anio = p_anio AND mes = p_mes;

  -- Recalcula desde cero -- si ya estaba cerrado antes y se reabrio y se
  -- vuelve a cerrar, el snapshot viejo se descarta y se congela el
  -- estado actual.
  DELETE FROM facturacion_cierre_detalle WHERE id_cierre = v_id_cierre;

  -- Mismo calculo que sp_reporte_facturacion_mensual, pero insertando en
  -- vez de devolver filas (no se puede hacer INSERT...SELECT desde un
  -- CALL a otro procedimiento en MySQL, asi que se duplica la query).
  INSERT INTO facturacion_cierre_detalle (
    id_cierre, id_usuario, colaborador, dni, id_perfil, id_rate, rate_nombre,
    tarifa, codigo_moneda, horas_trabajadas, horas_objetivo, dias_off, dias_fault
  )
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
    v_id_cierre,
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos),
    u.numero_documento,
    pf.id_perfil,
    pf.codigo_externo,
    pf.nombre,
    tv.tarifa,
    mon.codigo,
    ROUND(COALESCE(ht.segundos, 0) / 3600, 2),
    (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario) * 8,
    (SELECT COUNT(*) FROM dias_ausencia da WHERE da.id_usuario = a.id_usuario),
    GREATEST(
      0,
      (SELECT COUNT(*) FROM dias_laborales dl WHERE dl.id_usuario = a.id_usuario)
        - (SELECT COUNT(*) FROM dias_trabajados dt WHERE dt.id_usuario = a.id_usuario)
    )
  FROM asignados a
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  LEFT JOIN tarifa_vigente tv ON tv.id_usuario = a.id_usuario
  LEFT JOIN perfiles pf ON pf.id_perfil = tv.id_perfil
  LEFT JOIN maestro mon ON mon.id_maestro = tv.id_moneda
  LEFT JOIN horas_trabajadas ht ON ht.id_usuario = a.id_usuario
  WHERE u.activo = 1;

  SELECT v_id_cierre AS id_cierre;
END $$

DROP PROCEDURE IF EXISTS sp_facturacion_mes_reabrir $$
CREATE PROCEDURE sp_facturacion_mes_reabrir(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_anio             INT,
  IN p_mes              INT,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  UPDATE facturacion_cierres
  SET cerrado = 0, modificado_por = p_modificado_por
  WHERE id_proyecto = p_id_proyecto AND anio = p_anio AND mes = p_mes;
END $$

DROP PROCEDURE IF EXISTS sp_facturacion_cierre_detalle_listar $$
CREATE PROCEDURE sp_facturacion_cierre_detalle_listar(
  IN p_id_proyecto INT UNSIGNED,
  IN p_anio        INT,
  IN p_mes         INT
)
BEGIN
  SELECT cd.id_usuario, cd.colaborador, cd.dni, cd.id_perfil, cd.id_rate, cd.rate_nombre,
         cd.tarifa, cd.codigo_moneda, cd.horas_trabajadas, cd.horas_objetivo, cd.dias_off, cd.dias_fault
  FROM facturacion_cierre_detalle cd
  JOIN facturacion_cierres c ON c.id_cierre = cd.id_cierre
  WHERE c.id_proyecto = p_id_proyecto AND c.anio = p_anio AND c.mes = p_mes AND c.cerrado = 1
  ORDER BY cd.colaborador;
END $$

DELIMITER ;
