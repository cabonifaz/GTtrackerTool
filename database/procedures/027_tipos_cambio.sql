-- =====================================================================
-- Stored Procedures: tipo de cambio mensual (para convertir costo/sueldo
-- a la moneda de facturacion al calcular margen). Un solo valor por
-- empresa+mes+par de monedas -- volver a cargar el mismo mes actualiza
-- la tasa en vez de duplicar.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_tipo_cambio_asignar $$
CREATE PROCEDURE sp_tipo_cambio_asignar(
  IN p_anio              INT UNSIGNED,
  IN p_mes               TINYINT UNSIGNED,
  IN p_id_moneda_origen  INT UNSIGNED,
  IN p_id_moneda_destino INT UNSIGNED,
  IN p_tasa              DECIMAL(14,6),
  IN p_id_empresa_actor  INT UNSIGNED,
  IN p_creado_por        VARCHAR(150)
)
BEGIN
  IF p_mes < 1 OR p_mes > 12 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mes invalido';
  END IF;

  IF p_tasa IS NULL OR p_tasa <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tasa debe ser mayor a cero';
  END IF;

  IF p_id_moneda_origen = p_id_moneda_destino THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La moneda de origen y destino deben ser distintas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM maestro WHERE id_maestro = p_id_moneda_origen AND tipo_maestro = 'MONEDA' AND activo = 1)
     OR NOT EXISTS (SELECT 1 FROM maestro WHERE id_maestro = p_id_moneda_destino AND tipo_maestro = 'MONEDA' AND activo = 1)
  THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
  END IF;

  INSERT INTO tipos_cambio (id_empresa, anio, mes, id_moneda_origen, id_moneda_destino, tasa, creado_por)
  VALUES (p_id_empresa_actor, p_anio, p_mes, p_id_moneda_origen, p_id_moneda_destino, p_tasa, p_creado_por)
  ON DUPLICATE KEY UPDATE tasa = p_tasa, modificado_por = p_creado_por;
END $$

DROP PROCEDURE IF EXISTS sp_tipo_cambio_listar $$
CREATE PROCEDURE sp_tipo_cambio_listar(
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT tc.id_tipo_cambio, tc.anio, tc.mes,
         tc.id_moneda_origen, mo.codigo AS codigo_moneda_origen,
         tc.id_moneda_destino, md.codigo AS codigo_moneda_destino,
         tc.tasa
  FROM tipos_cambio tc
  JOIN maestro mo ON mo.id_maestro = tc.id_moneda_origen
  JOIN maestro md ON md.id_maestro = tc.id_moneda_destino
  WHERE tc.id_empresa = p_id_empresa_actor
  ORDER BY tc.anio DESC, tc.mes DESC;
END $$

DELIMITER ;
