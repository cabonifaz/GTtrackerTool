-- =====================================================================
-- Stored Procedures: asignacion de clientes a Gestores de Servicio
-- (relacion N:M clientes_gestores). Un Gestor de Servicio funciona como
-- un Admin, pero acotado a los clientes que tiene asignados aca.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cliente_gestor_asignar $$
CREATE PROCEDURE sp_cliente_gestor_asignar(
  IN p_id_cliente       INT UNSIGNED,
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND id_empresa = p_id_empresa_actor AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN maestro r ON r.id_maestro = u.id_rol
    WHERE u.id_usuario = p_id_usuario AND u.id_empresa = p_id_empresa_actor
      AND u.activo = 1 AND r.codigo = 'GESTOR_SERVICIO'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario indicado no es un Gestor de Servicio activo';
  END IF;

  INSERT INTO clientes_gestores (id_cliente, id_usuario, creado_por)
  VALUES (p_id_cliente, p_id_usuario, p_creado_por)
  ON DUPLICATE KEY UPDATE activo = 1, modificado_por = p_creado_por;
END $$

DROP PROCEDURE IF EXISTS sp_cliente_gestor_quitar $$
CREATE PROCEDURE sp_cliente_gestor_quitar(
  IN p_id_cliente       INT UNSIGNED,
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  UPDATE clientes_gestores cg
  JOIN clientes c ON c.id_cliente = cg.id_cliente
  SET cg.activo = 0, cg.modificado_por = p_modificado_por
  WHERE cg.id_cliente = p_id_cliente AND cg.id_usuario = p_id_usuario AND c.id_empresa = p_id_empresa_actor;
END $$

DROP PROCEDURE IF EXISTS sp_cliente_gestor_listar_por_usuario $$
CREATE PROCEDURE sp_cliente_gestor_listar_por_usuario(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT c.id_cliente, c.nombre AS cliente
  FROM clientes_gestores cg
  JOIN clientes c ON c.id_cliente = cg.id_cliente
  WHERE cg.id_usuario = p_id_usuario AND cg.activo = 1 AND c.id_empresa = p_id_empresa_actor
  ORDER BY c.nombre;
END $$

DELIMITER ;
