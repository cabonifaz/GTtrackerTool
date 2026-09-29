-- =====================================================================
-- Stored Procedures: solicitudes de horas extra, su aprobacion, y el
-- saldo compensatorio derivado (horas extra aprobadas menos dias
-- COMPENSATORIO ya consumidos via ausencias). Mismo patron que
-- 013_ausencias.sql (solicitud propia en PENDIENTE, registro directo del
-- Admin en APROBADA, aprobar/rechazar).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_hora_extra_crear $$
CREATE PROCEDURE sp_hora_extra_crear(
  IN p_id_usuario       INT UNSIGNED,
  IN p_fecha            DATE,
  IN p_horas            DECIMAL(5,2),
  IN p_motivo           VARCHAR(255),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_pendiente INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND activo = 1 AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido o inactivo';
  END IF;

  IF p_fecha IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la fecha de las horas extra';
  END IF;

  IF p_horas IS NULL OR p_horas <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las horas extra deben ser mayor a cero';
  END IF;

  SELECT id_maestro INTO v_id_estado_pendiente
  FROM maestro WHERE tipo_maestro = 'ESTADO_HORA_EXTRA' AND codigo = 'PENDIENTE' LIMIT 1;

  INSERT INTO horas_extra (id_usuario, fecha, horas, motivo, id_estado, creado_por)
  VALUES (p_id_usuario, p_fecha, p_horas, p_motivo, v_id_estado_pendiente, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_hora_extra;
END $$

DROP PROCEDURE IF EXISTS sp_hora_extra_crear_admin $$
CREATE PROCEDURE sp_hora_extra_crear_admin(
  IN p_id_usuario       INT UNSIGNED,
  IN p_fecha            DATE,
  IN p_horas            DECIMAL(5,2),
  IN p_motivo           VARCHAR(255),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  -- El Admin registra horas extra ya coordinadas/reconocidas -- directo
  -- en APROBADA, sin pasar por el flujo de aprobacion normal.
  DECLARE v_id_estado_aprobada INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND activo = 1 AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido o inactivo';
  END IF;

  IF p_fecha IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la fecha de las horas extra';
  END IF;

  IF p_horas IS NULL OR p_horas <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las horas extra deben ser mayor a cero';
  END IF;

  SELECT id_maestro INTO v_id_estado_aprobada
  FROM maestro WHERE tipo_maestro = 'ESTADO_HORA_EXTRA' AND codigo = 'APROBADA' LIMIT 1;

  INSERT INTO horas_extra (id_usuario, fecha, horas, motivo, id_estado, aprobado_por, fecha_aprobacion, creado_por)
  VALUES (p_id_usuario, p_fecha, p_horas, p_motivo, v_id_estado_aprobada, p_creado_por, NOW(), p_creado_por);

  SELECT LAST_INSERT_ID() AS id_hora_extra;
END $$

DROP PROCEDURE IF EXISTS sp_hora_extra_listar_por_usuario $$
CREATE PROCEDURE sp_hora_extra_listar_por_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT h.id_hora_extra, h.fecha, h.horas, h.motivo,
         e.codigo AS codigo_estado, e.valor AS estado,
         h.aprobado_por, h.fecha_aprobacion, h.motivo_rechazo, h.fecha_creacion
  FROM horas_extra h
  JOIN maestro e ON e.id_maestro = h.id_estado
  WHERE h.id_usuario = p_id_usuario AND h.activo = 1
  ORDER BY h.fecha DESC;
END $$

DROP PROCEDURE IF EXISTS sp_hora_extra_listar_todas $$
CREATE PROCEDURE sp_hora_extra_listar_todas(
  IN p_ids_usuario      VARCHAR(2000),
  IN p_codigo_estado    VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT h.id_hora_extra, h.id_usuario, CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
         h.fecha, h.horas, h.motivo,
         e.codigo AS codigo_estado, e.valor AS estado,
         h.aprobado_por, h.fecha_aprobacion, h.motivo_rechazo, h.fecha_creacion
  FROM horas_extra h
  JOIN usuarios u ON u.id_usuario = h.id_usuario
  JOIN maestro e ON e.id_maestro = h.id_estado
  WHERE h.activo = 1
    AND u.id_empresa = p_id_empresa_actor
    AND (p_ids_usuario IS NULL OR p_ids_usuario = '' OR FIND_IN_SET(h.id_usuario, p_ids_usuario) > 0)
    AND (p_codigo_estado IS NULL OR e.codigo = p_codigo_estado)
  ORDER BY h.fecha_creacion DESC;
END $$

DROP PROCEDURE IF EXISTS sp_hora_extra_aprobar $$
CREATE PROCEDURE sp_hora_extra_aprobar(
  IN p_id_hora_extra    INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_aprobado_por     VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_aprobada INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM horas_extra h
    JOIN usuarios u ON u.id_usuario = h.id_usuario
    WHERE h.id_hora_extra = p_id_hora_extra AND h.activo = 1 AND u.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitud de horas extra no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado_aprobada
  FROM maestro WHERE tipo_maestro = 'ESTADO_HORA_EXTRA' AND codigo = 'APROBADA' LIMIT 1;

  UPDATE horas_extra
  SET id_estado = v_id_estado_aprobada,
      aprobado_por = p_aprobado_por,
      fecha_aprobacion = NOW(),
      motivo_rechazo = NULL,
      modificado_por = p_aprobado_por
  WHERE id_hora_extra = p_id_hora_extra;
END $$

DROP PROCEDURE IF EXISTS sp_hora_extra_rechazar $$
CREATE PROCEDURE sp_hora_extra_rechazar(
  IN p_id_hora_extra    INT UNSIGNED,
  IN p_motivo_rechazo   VARCHAR(255),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_rechazada INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM horas_extra h
    JOIN usuarios u ON u.id_usuario = h.id_usuario
    WHERE h.id_hora_extra = p_id_hora_extra AND h.activo = 1 AND u.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitud de horas extra no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado_rechazada
  FROM maestro WHERE tipo_maestro = 'ESTADO_HORA_EXTRA' AND codigo = 'RECHAZADA' LIMIT 1;

  UPDATE horas_extra
  SET id_estado = v_id_estado_rechazada,
      aprobado_por = p_modificado_por,
      fecha_aprobacion = NOW(),
      motivo_rechazo = p_motivo_rechazo,
      modificado_por = p_modificado_por
  WHERE id_hora_extra = p_id_hora_extra;
END $$

-- Saldo compensatorio de un talento: horas extra APROBADAS acumuladas,
-- menos las horas ya consumidas por ausencias tipo COMPENSATORIO
-- APROBADAS (a razon de 8h por dia de calendario del rango). Puede dar
-- negativo -- eso es la deuda si se aprobo un dia libre por adelantado
-- contra horas extra que todavia no se trabajaron.
DROP PROCEDURE IF EXISTS sp_saldo_compensatorio_listar $$
CREATE PROCEDURE sp_saldo_compensatorio_listar(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido';
  END IF;

  SELECT
    p_id_usuario AS id_usuario,
    x.horas_acumuladas,
    x.horas_consumidas,
    (x.horas_acumuladas - x.horas_consumidas) AS horas_disponibles,
    (x.horas_acumuladas - x.horas_consumidas) / 8 AS dias_disponibles
  FROM (
    SELECT
      COALESCE((
        SELECT SUM(h.horas)
        FROM horas_extra h
        JOIN maestro e ON e.id_maestro = h.id_estado AND e.codigo = 'APROBADA'
        WHERE h.id_usuario = p_id_usuario AND h.activo = 1
      ), 0) AS horas_acumuladas,
      COALESCE((
        SELECT SUM((DATEDIFF(a.fecha_fin, a.fecha_inicio) + 1) * 8)
        FROM ausencias a
        JOIN maestro t ON t.id_maestro = a.id_tipo AND t.codigo = 'COMPENSATORIO'
        JOIN maestro e ON e.id_maestro = a.id_estado AND e.codigo = 'APROBADA'
        WHERE a.id_usuario = p_id_usuario AND a.activo = 1
      ), 0) AS horas_consumidas
  ) x;
END $$

DELIMITER ;
