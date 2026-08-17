-- =====================================================================
-- Stored Procedures: solicitudes de dias off (vacaciones/enfermedad),
-- su aprobacion, y el saldo de vacaciones por talento.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_ausencia_crear $$
CREATE PROCEDURE sp_ausencia_crear(
  IN p_id_usuario     INT UNSIGNED,
  IN p_id_tipo        INT UNSIGNED,
  IN p_fecha_inicio   DATE,
  IN p_fecha_fin      DATE,
  IN p_motivo         VARCHAR(255),
  IN p_evidencia      LONGBLOB,
  IN p_evidencia_tipo VARCHAR(100),
  IN p_creado_por     VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_pendiente INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido o inactivo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM maestro WHERE id_maestro = p_id_tipo AND tipo_maestro = 'TIPO_AUSENCIA' AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de ausencia invalido';
  END IF;

  IF p_fecha_inicio IS NULL OR p_fecha_fin IS NULL OR p_fecha_fin < p_fecha_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango de fechas es invalido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ausencias
    WHERE id_usuario = p_id_usuario
      AND activo = 1
      AND id_estado IN (
        SELECT id_maestro FROM maestro WHERE tipo_maestro = 'ESTADO_AUSENCIA' AND codigo IN ('PENDIENTE', 'APROBADA')
      )
      AND fecha_inicio <= p_fecha_fin
      AND fecha_fin >= p_fecha_inicio
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya tienes una ausencia pendiente o aprobada que se cruza con esas fechas';
  END IF;

  SELECT id_maestro INTO v_id_estado_pendiente
  FROM maestro WHERE tipo_maestro = 'ESTADO_AUSENCIA' AND codigo = 'PENDIENTE' LIMIT 1;

  INSERT INTO ausencias (id_usuario, id_tipo, fecha_inicio, fecha_fin, motivo, evidencia, evidencia_tipo, id_estado, creado_por)
  VALUES (p_id_usuario, p_id_tipo, p_fecha_inicio, p_fecha_fin, p_motivo, p_evidencia, p_evidencia_tipo, v_id_estado_pendiente, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_ausencia;
END $$

DROP PROCEDURE IF EXISTS sp_ausencia_listar_por_usuario $$
CREATE PROCEDURE sp_ausencia_listar_por_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT a.id_ausencia, t.codigo AS codigo_tipo, t.valor AS tipo,
         a.fecha_inicio, a.fecha_fin, a.motivo,
         e.codigo AS codigo_estado, e.valor AS estado,
         a.aprobado_por, a.fecha_aprobacion, a.motivo_rechazo,
         (a.evidencia IS NOT NULL) AS tiene_evidencia,
         a.fecha_creacion
  FROM ausencias a
  JOIN maestro t ON t.id_maestro = a.id_tipo
  JOIN maestro e ON e.id_maestro = a.id_estado
  WHERE a.id_usuario = p_id_usuario AND a.activo = 1
  ORDER BY a.fecha_inicio DESC;
END $$

DROP PROCEDURE IF EXISTS sp_ausencia_listar_todas $$
CREATE PROCEDURE sp_ausencia_listar_todas(
  IN p_id_usuario  INT UNSIGNED,
  IN p_codigo_estado VARCHAR(50)
)
BEGIN
  SELECT a.id_ausencia, a.id_usuario, CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
         t.codigo AS codigo_tipo, t.valor AS tipo,
         a.fecha_inicio, a.fecha_fin, a.motivo,
         e.codigo AS codigo_estado, e.valor AS estado,
         a.aprobado_por, a.fecha_aprobacion, a.motivo_rechazo,
         (a.evidencia IS NOT NULL) AS tiene_evidencia,
         a.fecha_creacion
  FROM ausencias a
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  JOIN maestro t ON t.id_maestro = a.id_tipo
  JOIN maestro e ON e.id_maestro = a.id_estado
  WHERE a.activo = 1
    AND (p_id_usuario IS NULL OR a.id_usuario = p_id_usuario)
    AND (p_codigo_estado IS NULL OR e.codigo = p_codigo_estado)
  ORDER BY a.fecha_creacion DESC;
END $$

DROP PROCEDURE IF EXISTS sp_ausencia_obtener_evidencia $$
CREATE PROCEDURE sp_ausencia_obtener_evidencia(
  IN p_id_ausencia INT UNSIGNED
)
BEGIN
  SELECT id_usuario, evidencia, evidencia_tipo FROM ausencias WHERE id_ausencia = p_id_ausencia;
END $$

DROP PROCEDURE IF EXISTS sp_ausencia_aprobar $$
CREATE PROCEDURE sp_ausencia_aprobar(
  IN p_id_ausencia    INT UNSIGNED,
  IN p_evidencia      LONGBLOB,
  IN p_evidencia_tipo VARCHAR(100),
  IN p_aprobado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_aprobada INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM ausencias WHERE id_ausencia = p_id_ausencia AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ausencia no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado_aprobada
  FROM maestro WHERE tipo_maestro = 'ESTADO_AUSENCIA' AND codigo = 'APROBADA' LIMIT 1;

  UPDATE ausencias
  SET id_estado = v_id_estado_aprobada,
      aprobado_por = p_aprobado_por,
      fecha_aprobacion = NOW(),
      motivo_rechazo = NULL,
      evidencia = COALESCE(p_evidencia, evidencia),
      evidencia_tipo = COALESCE(p_evidencia_tipo, evidencia_tipo),
      modificado_por = p_aprobado_por
  WHERE id_ausencia = p_id_ausencia;
END $$

DROP PROCEDURE IF EXISTS sp_ausencia_rechazar $$
CREATE PROCEDURE sp_ausencia_rechazar(
  IN p_id_ausencia    INT UNSIGNED,
  IN p_motivo_rechazo VARCHAR(255),
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_rechazada INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM ausencias WHERE id_ausencia = p_id_ausencia AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ausencia no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado_rechazada
  FROM maestro WHERE tipo_maestro = 'ESTADO_AUSENCIA' AND codigo = 'RECHAZADA' LIMIT 1;

  UPDATE ausencias
  SET id_estado = v_id_estado_rechazada,
      aprobado_por = p_modificado_por,
      fecha_aprobacion = NOW(),
      motivo_rechazo = p_motivo_rechazo,
      modificado_por = p_modificado_por
  WHERE id_ausencia = p_id_ausencia;
END $$

DROP PROCEDURE IF EXISTS sp_saldo_vacaciones_asignar $$
CREATE PROCEDURE sp_saldo_vacaciones_asignar(
  IN p_id_usuario     INT UNSIGNED,
  IN p_anio           INT,
  IN p_dias_asignados DECIMAL(5,2),
  IN p_creado_por     VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido o inactivo';
  END IF;

  IF p_dias_asignados IS NULL OR p_dias_asignados < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los dias asignados no pueden ser negativos';
  END IF;

  INSERT INTO saldos_vacaciones (id_usuario, anio, dias_asignados, creado_por)
  VALUES (p_id_usuario, p_anio, p_dias_asignados, p_creado_por)
  ON DUPLICATE KEY UPDATE
    dias_asignados = p_dias_asignados,
    modificado_por = p_creado_por;
END $$

-- Saldo de vacaciones de un talento en un anio: asignados, usados (dias
-- de calendario dentro de ausencias APROBADAS de tipo VACACIONES que
-- caen en ese anio) y pendientes.
DROP PROCEDURE IF EXISTS sp_saldo_vacaciones_listar $$
CREATE PROCEDURE sp_saldo_vacaciones_listar(
  IN p_id_usuario INT UNSIGNED,
  IN p_anio       INT
)
BEGIN
  SELECT
    p_id_usuario AS id_usuario,
    p_anio AS anio,
    COALESCE(sv.dias_asignados, 0) AS dias_asignados,
    COALESCE((
      SELECT SUM(DATEDIFF(
        LEAST(a.fecha_fin, MAKEDATE(p_anio + 1, 1) - INTERVAL 1 DAY),
        GREATEST(a.fecha_inicio, MAKEDATE(p_anio, 1))
      ) + 1)
      FROM ausencias a
      JOIN maestro t ON t.id_maestro = a.id_tipo AND t.codigo = 'VACACIONES'
      JOIN maestro e ON e.id_maestro = a.id_estado AND e.codigo = 'APROBADA'
      WHERE a.id_usuario = p_id_usuario
        AND a.activo = 1
        AND a.fecha_inicio <= MAKEDATE(p_anio + 1, 1) - INTERVAL 1 DAY
        AND a.fecha_fin >= MAKEDATE(p_anio, 1)
    ), 0) AS dias_usados
  FROM (SELECT 1) dummy
  LEFT JOIN saldos_vacaciones sv ON sv.id_usuario = p_id_usuario AND sv.anio = p_anio;
END $$

DELIMITER ;
