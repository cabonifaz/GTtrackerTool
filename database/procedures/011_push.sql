-- =====================================================================
-- Stored Procedures: suscripciones a push notifications.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_push_suscripcion_guardar $$
CREATE PROCEDURE sp_push_suscripcion_guardar(
  IN p_id_usuario INT UNSIGNED,
  IN p_endpoint   VARCHAR(500),
  IN p_p256dh     VARCHAR(255),
  IN p_auth       VARCHAR(255),
  IN p_creado_por VARCHAR(150)
)
BEGIN
  INSERT INTO push_suscripciones (id_usuario, endpoint, p256dh, auth, creado_por)
  VALUES (p_id_usuario, p_endpoint, p_p256dh, p_auth, p_creado_por)
  ON DUPLICATE KEY UPDATE
    id_usuario = p_id_usuario,
    p256dh = p_p256dh,
    auth = p_auth,
    activo = 1,
    modificado_por = p_creado_por;
END $$

DROP PROCEDURE IF EXISTS sp_push_suscripcion_eliminar $$
CREATE PROCEDURE sp_push_suscripcion_eliminar(
  IN p_endpoint VARCHAR(500)
)
BEGIN
  UPDATE push_suscripciones SET activo = 0 WHERE endpoint = p_endpoint;
END $$

DROP PROCEDURE IF EXISTS sp_push_suscripcion_listar_por_usuario $$
CREATE PROCEDURE sp_push_suscripcion_listar_por_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT id_push_suscripcion, endpoint, p256dh, auth
  FROM push_suscripciones
  WHERE id_usuario = p_id_usuario AND activo = 1;
END $$

DELIMITER ;
