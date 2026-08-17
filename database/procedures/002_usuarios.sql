-- =====================================================================
-- Stored Procedures: usuarios (Admin / Talento)
-- Convencion de errores de negocio: SIGNAL SQLSTATE '45000' con mensaje
-- legible; la capa de aplicacion propaga ese mensaje tal cual.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_usuario_crear $$
CREATE PROCEDURE sp_usuario_crear(
  IN p_nombres        VARCHAR(100),
  IN p_apellidos      VARCHAR(100),
  IN p_email          VARCHAR(150),
  IN p_password_hash  VARCHAR(255),
  IN p_codigo_rol     VARCHAR(50),
  IN p_creado_por     VARCHAR(150)
)
BEGIN
  DECLARE v_id_rol INT UNSIGNED;

  IF EXISTS (SELECT 1 FROM usuarios WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un usuario registrado con ese email';
  END IF;

  SELECT id_maestro INTO v_id_rol
  FROM maestro
  WHERE tipo_maestro = 'ROL' AND codigo = p_codigo_rol AND activo = 1
  LIMIT 1;

  IF v_id_rol IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol invalido';
  END IF;

  INSERT INTO usuarios (nombres, apellidos, email, password_hash, id_rol, creado_por)
  VALUES (p_nombres, p_apellidos, p_email, p_password_hash, v_id_rol, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_usuario;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_editar $$
CREATE PROCEDURE sp_usuario_editar(
  IN p_id_usuario     INT UNSIGNED,
  IN p_nombres        VARCHAR(100),
  IN p_apellidos      VARCHAR(100),
  IN p_codigo_rol     VARCHAR(50),
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_rol INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
  END IF;

  SELECT id_maestro INTO v_id_rol
  FROM maestro
  WHERE tipo_maestro = 'ROL' AND codigo = p_codigo_rol AND activo = 1
  LIMIT 1;

  IF v_id_rol IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rol invalido';
  END IF;

  UPDATE usuarios
  SET nombres = p_nombres,
      apellidos = p_apellidos,
      id_rol = v_id_rol,
      modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_activar $$
CREATE PROCEDURE sp_usuario_activar(
  IN p_id_usuario     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
  END IF;

  UPDATE usuarios
  SET activo = 1,
      modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_desactivar $$
CREATE PROCEDURE sp_usuario_desactivar(
  IN p_id_usuario     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
  END IF;

  UPDATE usuarios
  SET activo = 0,
      modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario;

  -- Detiene cualquier cronometro que el usuario dado de baja tuviera en curso
  UPDATE registros_tiempo rt
  JOIN maestro m_en_curso ON m_en_curso.id_maestro = rt.id_estado
                          AND m_en_curso.tipo_maestro = 'ESTADO_REGISTRO_TIEMPO'
                          AND m_en_curso.codigo = 'EN_CURSO'
  JOIN maestro m_detenido ON m_detenido.tipo_maestro = 'ESTADO_REGISTRO_TIEMPO'
                          AND m_detenido.codigo = 'DETENIDO'
  SET rt.fecha_fin = NOW(),
      rt.duracion_segundos = TIMESTAMPDIFF(SECOND, rt.fecha_inicio, NOW()),
      rt.id_estado = m_detenido.id_maestro,
      rt.modificado_por = p_modificado_por
  WHERE rt.id_usuario = p_id_usuario;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_listar $$
CREATE PROCEDURE sp_usuario_listar()
BEGIN
  SELECT u.id_usuario, u.nombres, u.apellidos, u.email,
         r.codigo AS codigo_rol, r.valor AS rol, u.activo,
         u.fecha_creacion
  FROM usuarios u
  JOIN maestro r ON r.id_maestro = u.id_rol
  ORDER BY u.nombres, u.apellidos;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_obtener_por_email $$
CREATE PROCEDURE sp_usuario_obtener_por_email(
  IN p_email VARCHAR(150)
)
BEGIN
  SELECT u.id_usuario, u.nombres, u.apellidos, u.email, u.password_hash,
         u.debe_cambiar_password,
         r.codigo AS codigo_rol, r.valor AS rol, u.activo
  FROM usuarios u
  JOIN maestro r ON r.id_maestro = u.id_rol
  WHERE u.email = p_email
  LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_cambiar_password $$
CREATE PROCEDURE sp_usuario_cambiar_password(
  IN p_id_usuario        INT UNSIGNED,
  IN p_nuevo_password_hash VARCHAR(255),
  IN p_modificado_por    VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado';
  END IF;

  UPDATE usuarios
  SET password_hash = p_nuevo_password_hash,
      debe_cambiar_password = 0,
      modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario;
END $$

DELIMITER ;
