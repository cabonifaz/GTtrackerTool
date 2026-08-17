-- =====================================================================
-- Stored Procedures: maestro
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_maestro_listar $$
CREATE PROCEDURE sp_maestro_listar(
  IN p_tipo_maestro VARCHAR(50)
)
BEGIN
  SELECT id_maestro, tipo_maestro, codigo, valor, descripcion, orden, id_padre
  FROM maestro
  WHERE tipo_maestro = p_tipo_maestro
    AND activo = 1
  ORDER BY orden, valor;
END $$

DELIMITER ;
