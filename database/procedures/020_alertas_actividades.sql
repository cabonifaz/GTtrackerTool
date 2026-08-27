-- =====================================================================
-- Motor de alertas de vencimiento para asignaciones de proyectos tipo
-- Actividades por Excel:
--   - sp_actividades_alerta_talento: para el banner dentro de la app
--     (calculado en vivo en cada carga, no depende del job periodico).
--   - sp_alerta_actividades_slots_pendientes: candidatos a push que el
--     job periodico (ver app/api/cron/alertas-actividades) todavia no
--     mando -- T-3 dias antes del vencimiento, y cada slot horario del
--     dia de vencimiento (9,11,13,15,16,17,18,20,22h) que ya paso.
--   - sp_alerta_actividades_marcar_enviada: registra el envio de un slot
--     (INSERT IGNORE via ON DUPLICATE KEY, hace de lock natural contra
--     doble envio si el job se solapa).
--   - sp_asignacion_cerrar_automatico_vencidas: cierra solas las
--     asignaciones cuyo periodo ya termino y el talento ya cargo las 5
--     actividades (si no llego a 5, se queda Pendiente para revision
--     manual, no se cierra sola).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_actividades_alerta_talento $$
CREATE PROCEDURE sp_actividades_alerta_talento(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  -- Asignaciones del talento, vigentes, sin enviar/cerrar, con menos de 5
  -- actividades, cuyo vencimiento ya esta a 3 dias o menos (incluye
  -- vencidas que el job de cierre automatico todavia no proceso).
  SELECT a.id_asignacion, pr.nombre AS proyecto, cl.nombre AS cliente,
         a.nombre_iniciativa, a.periodo_hasta,
         (SELECT COUNT(*) FROM proyecto_actividades ac WHERE ac.id_asignacion = a.id_asignacion AND ac.activo = 1)
           AS actividades_cargadas,
         DATEDIFF(a.periodo_hasta, CURDATE()) AS dias_restantes
  FROM proyecto_asignaciones a
  JOIN proyectos pr ON pr.id_proyecto = a.id_proyecto
  LEFT JOIN clientes cl ON cl.id_cliente = pr.id_cliente
  JOIN maestro e ON e.id_maestro = a.id_estado
  WHERE a.id_usuario = p_id_usuario
    AND pr.id_empresa = p_id_empresa_actor
    AND a.activo = 1
    AND e.codigo NOT IN ('ENVIADO', 'CERRADO')
    AND a.periodo_hasta <= CURDATE() + INTERVAL 3 DAY
    AND (SELECT COUNT(*) FROM proyecto_actividades ac WHERE ac.id_asignacion = a.id_asignacion AND ac.activo = 1) < 5
  ORDER BY a.periodo_hasta;
END $$

DROP PROCEDURE IF EXISTS sp_alerta_actividades_slots_pendientes $$
CREATE PROCEDURE sp_alerta_actividades_slots_pendientes()
BEGIN
  SELECT a.id_asignacion, a.id_usuario, emp.slug AS empresa_slug,
         pr.nombre AS proyecto, a.nombre_iniciativa, a.periodo_hasta,
         COALESCE(ac.cnt, 0) AS actividades_cargadas,
         'T3' AS clave_alerta
  FROM proyecto_asignaciones a
  JOIN proyectos pr ON pr.id_proyecto = a.id_proyecto
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  JOIN empresas emp ON emp.id_empresa = u.id_empresa
  JOIN maestro e ON e.id_maestro = a.id_estado
  LEFT JOIN (
    SELECT id_asignacion, COUNT(*) AS cnt FROM proyecto_actividades WHERE activo = 1 GROUP BY id_asignacion
  ) ac ON ac.id_asignacion = a.id_asignacion
  WHERE a.activo = 1
    AND e.codigo NOT IN ('ENVIADO', 'CERRADO')
    AND a.periodo_hasta = CURDATE() + INTERVAL 3 DAY
    AND COALESCE(ac.cnt, 0) < 5
    AND NOT EXISTS (
      SELECT 1 FROM proyecto_asignacion_alertas_enviadas al
      WHERE al.id_asignacion = a.id_asignacion AND al.clave_alerta = 'T3'
    )

  UNION ALL

  SELECT a.id_asignacion, a.id_usuario, emp.slug,
         pr.nombre, a.nombre_iniciativa, a.periodo_hasta,
         COALESCE(ac.cnt, 0),
         s.clave
  FROM proyecto_asignaciones a
  JOIN proyectos pr ON pr.id_proyecto = a.id_proyecto
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  JOIN empresas emp ON emp.id_empresa = u.id_empresa
  JOIN maestro e ON e.id_maestro = a.id_estado
  LEFT JOIN (
    SELECT id_asignacion, COUNT(*) AS cnt FROM proyecto_actividades WHERE activo = 1 GROUP BY id_asignacion
  ) ac ON ac.id_asignacion = a.id_asignacion
  CROSS JOIN (
    SELECT 'DIA_09' AS clave, 9 AS hora UNION ALL SELECT 'DIA_11', 11 UNION ALL SELECT 'DIA_13', 13
    UNION ALL SELECT 'DIA_15', 15 UNION ALL SELECT 'DIA_16', 16 UNION ALL SELECT 'DIA_17', 17
    UNION ALL SELECT 'DIA_18', 18 UNION ALL SELECT 'DIA_20', 20 UNION ALL SELECT 'DIA_22', 22
  ) s
  WHERE a.activo = 1
    AND e.codigo NOT IN ('ENVIADO', 'CERRADO')
    AND a.periodo_hasta = CURDATE()
    AND s.hora <= HOUR(NOW())
    AND COALESCE(ac.cnt, 0) < 5
    AND NOT EXISTS (
      SELECT 1 FROM proyecto_asignacion_alertas_enviadas al
      WHERE al.id_asignacion = a.id_asignacion AND al.clave_alerta = s.clave
    );
END $$

DROP PROCEDURE IF EXISTS sp_alerta_actividades_marcar_enviada $$
CREATE PROCEDURE sp_alerta_actividades_marcar_enviada(
  IN p_id_asignacion INT UNSIGNED,
  IN p_clave_alerta  VARCHAR(20)
)
BEGIN
  -- INSERT IGNORE: si dos corridas del job se solapan y ambas ven el
  -- mismo slot como pendiente, solo una gana la insercion (por el UNIQUE
  -- de la tabla) -- ROW_COUNT() le dice a quien llamo si de verdad debe
  -- mandar el push o si otra corrida ya se encargo.
  INSERT IGNORE INTO proyecto_asignacion_alertas_enviadas (id_asignacion, clave_alerta)
  VALUES (p_id_asignacion, p_clave_alerta);

  SELECT ROW_COUNT() AS insertada;
END $$

DROP PROCEDURE IF EXISTS sp_asignacion_cerrar_automatico_vencidas $$
CREATE PROCEDURE sp_asignacion_cerrar_automatico_vencidas()
BEGIN
  UPDATE proyecto_asignaciones a
  JOIN maestro e ON e.id_maestro = a.id_estado
  JOIN maestro ec ON ec.tipo_maestro = 'ESTADO_ASIGNACION_ACTIVIDAD' AND ec.codigo = 'CERRADO'
  SET a.id_estado = ec.id_maestro, a.modificado_por = 'SYSTEM (cierre automatico)'
  WHERE a.activo = 1
    AND e.codigo <> 'CERRADO'
    AND a.periodo_hasta < CURDATE()
    AND (SELECT COUNT(*) FROM proyecto_actividades ac WHERE ac.id_asignacion = a.id_asignacion AND ac.activo = 1) >= 5;

  SELECT ROW_COUNT() AS asignaciones_cerradas;
END $$

DELIMITER ;
