-- =====================================================================
-- Stored Procedures: usuarios_sistema (cuentas de API)
-- Nota: la generacion/hash del secreto es tecnica y se resuelve en la
-- capa de aplicacion (bcrypt); el SP solo persiste y valida.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_usuario_sistema_crear $$
CREATE PROCEDURE sp_usuario_sistema_crear(
  IN p_nombre_sistema  VARCHAR(150),
  IN p_api_key         VARCHAR(64),
  IN p_api_secret_hash VARCHAR(255),
  IN p_creado_por      VARCHAR(150)
)
BEGIN
  IF EXISTS (SELECT 1 FROM usuarios_sistema WHERE api_key = p_api_key) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La api_key generada ya existe, reintente';
  END IF;

  INSERT INTO usuarios_sistema (nombre_sistema, api_key, api_secret_hash, creado_por)
  VALUES (p_nombre_sistema, p_api_key, p_api_secret_hash, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_usuario_sistema;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_sistema_revocar $$
CREATE PROCEDURE sp_usuario_sistema_revocar(
  IN p_id_usuario_sistema INT UNSIGNED,
  IN p_modificado_por     VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE id_usuario_sistema = p_id_usuario_sistema) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario de sistema no encontrado';
  END IF;

  UPDATE usuarios_sistema
  SET activo = 0,
      modificado_por = p_modificado_por
  WHERE id_usuario_sistema = p_id_usuario_sistema;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_sistema_listar $$
CREATE PROCEDURE sp_usuario_sistema_listar()
BEGIN
  SELECT id_usuario_sistema, nombre_sistema, api_key, activo, fecha_creacion
  FROM usuarios_sistema
  ORDER BY fecha_creacion DESC;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_sistema_validar $$
CREATE PROCEDURE sp_usuario_sistema_validar(
  IN p_api_key VARCHAR(64)
)
BEGIN
  SELECT id_usuario_sistema, nombre_sistema, api_key, api_secret_hash, activo
  FROM usuarios_sistema
  WHERE api_key = p_api_key
    AND activo = 1
  LIMIT 1;
END $$

DELIMITER ;
