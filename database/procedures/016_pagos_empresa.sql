-- =====================================================================
-- Stored Procedures: historial de pagos de membresia por empresa.
-- Solo las consume el area app/plataforma/* (Super Admin).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_pago_empresa_crear $$
CREATE PROCEDURE sp_pago_empresa_crear(
  IN p_id_empresa    INT UNSIGNED,
  IN p_monto         DECIMAL(10,2),
  IN p_codigo_moneda VARCHAR(10),
  IN p_fecha_pago    DATE,
  IN p_periodo_desde DATE,
  IN p_periodo_hasta DATE,
  IN p_referencia    VARCHAR(150),
  IN p_notas         VARCHAR(255),
  IN p_creado_por    VARCHAR(150)
)
BEGIN
  DECLARE v_id_moneda INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto debe ser mayor a cero';
  END IF;

  SELECT id_maestro INTO v_id_moneda
  FROM maestro WHERE tipo_maestro = 'MONEDA' AND codigo = p_codigo_moneda AND activo = 1
  LIMIT 1;

  IF v_id_moneda IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
  END IF;

  IF p_fecha_pago IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la fecha de pago';
  END IF;

  IF p_periodo_desde IS NOT NULL AND p_periodo_hasta IS NOT NULL AND p_periodo_hasta < p_periodo_desde THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El periodo hasta debe ser posterior al periodo desde';
  END IF;

  INSERT INTO pagos_empresa (
    id_empresa, monto, id_moneda, fecha_pago, periodo_desde, periodo_hasta, referencia, notas, creado_por
  )
  VALUES (
    p_id_empresa, p_monto, v_id_moneda, p_fecha_pago, p_periodo_desde, p_periodo_hasta, p_referencia, p_notas, p_creado_por
  );

  SELECT LAST_INSERT_ID() AS id_pago;
END $$

DROP PROCEDURE IF EXISTS sp_pago_empresa_eliminar $$
CREATE PROCEDURE sp_pago_empresa_eliminar(
  IN p_id_pago        INT UNSIGNED,
  IN p_id_empresa     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pagos_empresa WHERE id_pago = p_id_pago AND id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pago no encontrado';
  END IF;

  UPDATE pagos_empresa
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_pago = p_id_pago;
END $$

DROP PROCEDURE IF EXISTS sp_pago_empresa_listar_por_empresa $$
CREATE PROCEDURE sp_pago_empresa_listar_por_empresa(
  IN p_id_empresa INT UNSIGNED
)
BEGIN
  SELECT p.id_pago, p.id_empresa, p.monto,
         mon.codigo AS codigo_moneda, mon.valor AS moneda,
         p.fecha_pago, p.periodo_desde, p.periodo_hasta, p.referencia, p.notas,
         p.creado_por, p.fecha_creacion
  FROM pagos_empresa p
  JOIN maestro mon ON mon.id_maestro = p.id_moneda
  WHERE p.id_empresa = p_id_empresa AND p.activo = 1
  ORDER BY p.fecha_pago DESC, p.id_pago DESC;
END $$

DELIMITER ;
