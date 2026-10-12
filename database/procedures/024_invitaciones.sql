-- =====================================================================
-- Stored Procedures: invitaciones para alta de usuarios por link. El
-- usuario y su asignacion a proyecto ya se crean ANTES de generar la
-- invitacion (en sp_usuario_crear / sp_usuario_proyecto_asignar, desde
-- la capa de app) -- estos SPs solo manejan el ciclo de vida del link:
-- crearlo, listarlo, reenviarlo (nuevo token, invalida el anterior),
-- revocarlo, resolverlo publicamente por token, y aceptarlo (fija la
-- clave real y cierra la invitacion).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_invitacion_crear $$
CREATE PROCEDURE sp_invitacion_crear(
  IN p_id_usuario        INT UNSIGNED,
  IN p_id_proyecto       INT UNSIGNED,
  IN p_token             VARCHAR(64),
  IN p_dias_expiracion   INT UNSIGNED,
  IN p_id_empresa_actor  INT UNSIGNED,
  IN p_creado_por        VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_pendiente INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido';
  END IF;

  IF p_id_proyecto IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto invalido';
  END IF;

  SELECT id_maestro INTO v_id_estado_pendiente
  FROM maestro WHERE tipo_maestro = 'ESTADO_INVITACION' AND codigo = 'PENDIENTE' LIMIT 1;

  INSERT INTO invitaciones (id_usuario, id_proyecto, token, id_estado, fecha_expiracion, creado_por)
  VALUES (p_id_usuario, p_id_proyecto, p_token, v_id_estado_pendiente, NOW() + INTERVAL p_dias_expiracion DAY, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_invitacion, p_token AS token;
END $$

DROP PROCEDURE IF EXISTS sp_invitacion_listar $$
CREATE PROCEDURE sp_invitacion_listar(
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT
    i.id_invitacion, i.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    u.email, rol.codigo AS codigo_rol, rol.valor AS rol,
    i.id_proyecto, pr.nombre AS proyecto,
    e.codigo AS codigo_estado, e.valor AS estado,
    i.token, i.fecha_expiracion, i.fecha_aceptacion, i.fecha_creacion
  FROM invitaciones i
  JOIN usuarios u ON u.id_usuario = i.id_usuario
  JOIN maestro rol ON rol.id_maestro = u.id_rol
  JOIN maestro e ON e.id_maestro = i.id_estado
  LEFT JOIN proyectos pr ON pr.id_proyecto = i.id_proyecto
  WHERE u.id_empresa = p_id_empresa_actor
  ORDER BY i.fecha_creacion DESC;
END $$

DROP PROCEDURE IF EXISTS sp_invitacion_reenviar $$
CREATE PROCEDURE sp_invitacion_reenviar(
  IN p_id_invitacion     INT UNSIGNED,
  IN p_token_nuevo       VARCHAR(64),
  IN p_dias_expiracion   INT UNSIGNED,
  IN p_id_empresa_actor  INT UNSIGNED,
  IN p_modificado_por    VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM invitaciones i
    JOIN usuarios u ON u.id_usuario = i.id_usuario
    JOIN maestro e ON e.id_maestro = i.id_estado
    WHERE i.id_invitacion = p_id_invitacion AND u.id_empresa = p_id_empresa_actor AND e.codigo = 'PENDIENTE'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invitacion no encontrada o ya no esta pendiente';
  END IF;

  UPDATE invitaciones
  SET token = p_token_nuevo,
      fecha_expiracion = NOW() + INTERVAL p_dias_expiracion DAY,
      modificado_por = p_modificado_por
  WHERE id_invitacion = p_id_invitacion;

  SELECT p_token_nuevo AS token;
END $$

DROP PROCEDURE IF EXISTS sp_invitacion_revocar $$
CREATE PROCEDURE sp_invitacion_revocar(
  IN p_id_invitacion    INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_revocada INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM invitaciones i
    JOIN usuarios u ON u.id_usuario = i.id_usuario
    JOIN maestro e ON e.id_maestro = i.id_estado
    WHERE i.id_invitacion = p_id_invitacion AND u.id_empresa = p_id_empresa_actor AND e.codigo = 'PENDIENTE'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invitacion no encontrada o ya no esta pendiente';
  END IF;

  SELECT id_maestro INTO v_id_estado_revocada
  FROM maestro WHERE tipo_maestro = 'ESTADO_INVITACION' AND codigo = 'REVOCADA' LIMIT 1;

  UPDATE invitaciones
  SET id_estado = v_id_estado_revocada, modificado_por = p_modificado_por
  WHERE id_invitacion = p_id_invitacion;
END $$

-- Publica (sin empresa_actor): la pagina de invitacion resuelve el token
-- antes de que la persona tenga sesion. No revela nada si el token no
-- existe -- el llamador simplemente recibe cero filas.
DROP PROCEDURE IF EXISTS sp_invitacion_obtener_por_token $$
CREATE PROCEDURE sp_invitacion_obtener_por_token(
  IN p_token VARCHAR(64)
)
BEGIN
  SELECT
    u.nombres, u.apellidos, u.email,
    emp.nombre AS empresa, emp.slug AS empresa_slug,
    emp.color_primario, (emp.logo IS NOT NULL) AS tiene_logo,
    pr.nombre AS proyecto,
    est.codigo AS codigo_estado,
    i.fecha_expiracion
  FROM invitaciones i
  JOIN usuarios u ON u.id_usuario = i.id_usuario
  JOIN empresas emp ON emp.id_empresa = u.id_empresa
  JOIN maestro est ON est.id_maestro = i.id_estado
  LEFT JOIN proyectos pr ON pr.id_proyecto = i.id_proyecto
  WHERE i.token = p_token;
END $$

-- Publica (sin empresa_actor): fija la clave elegida y cierra la
-- invitacion. Revalida todo de nuevo (pendiente + no vencida) porque la
-- pagina pudo haberse quedado abierta mucho tiempo antes de enviar.
DROP PROCEDURE IF EXISTS sp_invitacion_aceptar $$
CREATE PROCEDURE sp_invitacion_aceptar(
  IN p_token         VARCHAR(64),
  IN p_password_hash VARCHAR(255)
)
BEGIN
  DECLARE v_id_invitacion INT UNSIGNED;
  DECLARE v_id_usuario INT UNSIGNED;
  DECLARE v_codigo_estado VARCHAR(50);
  DECLARE v_fecha_expiracion DATETIME;
  DECLARE v_id_estado_aceptada INT UNSIGNED;
  DECLARE v_empresa_slug VARCHAR(100);
  DECLARE v_email VARCHAR(150);

  SELECT i.id_invitacion, i.id_usuario, est.codigo, i.fecha_expiracion, emp.slug, u.email
  INTO v_id_invitacion, v_id_usuario, v_codigo_estado, v_fecha_expiracion, v_empresa_slug, v_email
  FROM invitaciones i
  JOIN usuarios u ON u.id_usuario = i.id_usuario
  JOIN empresas emp ON emp.id_empresa = u.id_empresa
  JOIN maestro est ON est.id_maestro = i.id_estado
  WHERE i.token = p_token
  LIMIT 1;

  IF v_id_invitacion IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invitacion no encontrada';
  END IF;

  IF v_codigo_estado <> 'PENDIENTE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta invitacion ya no esta disponible';
  END IF;

  IF v_fecha_expiracion < NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta invitacion vencio, pide que te envien una nueva';
  END IF;

  SELECT id_maestro INTO v_id_estado_aceptada
  FROM maestro WHERE tipo_maestro = 'ESTADO_INVITACION' AND codigo = 'ACEPTADA' LIMIT 1;

  UPDATE usuarios SET password_hash = p_password_hash, debe_cambiar_password = 0 WHERE id_usuario = v_id_usuario;

  UPDATE invitaciones SET id_estado = v_id_estado_aceptada, fecha_aceptacion = NOW() WHERE id_invitacion = v_id_invitacion;

  SELECT v_empresa_slug AS empresa_slug, v_email AS email;
END $$

DELIMITER ;
