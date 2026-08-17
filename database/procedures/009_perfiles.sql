-- =====================================================================
-- Stored Procedures: perfiles de cobro por cliente y su historial de
-- tarifas. Toda esta informacion es sensible (dinero) -- las rutas que
-- consumen estas SPs deben ser requireAdmin() siempre.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_perfil_crear $$
CREATE PROCEDURE sp_perfil_crear(
  IN p_id_cliente INT UNSIGNED,
  IN p_nombre     VARCHAR(150),
  IN p_tarifa     DECIMAL(10,2),
  IN p_id_moneda  INT UNSIGNED,
  IN p_creado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_perfil INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente invalido o inactivo';
  END IF;

  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre del perfil es obligatorio';
  END IF;

  IF EXISTS (
    SELECT 1 FROM perfiles WHERE id_cliente = p_id_cliente AND activo = 1 AND nombre = TRIM(p_nombre)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un perfil activo con ese nombre para este cliente';
  END IF;

  IF p_tarifa IS NULL OR p_tarifa <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tarifa debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM maestro WHERE id_maestro = p_id_moneda AND tipo_maestro = 'MONEDA' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
  END IF;

  INSERT INTO perfiles (id_cliente, nombre, creado_por)
  VALUES (p_id_cliente, TRIM(p_nombre), p_creado_por);
  SET v_id_perfil = LAST_INSERT_ID();

  INSERT INTO perfiles_tarifas (id_perfil, tarifa, id_moneda, fecha_desde, creado_por)
  VALUES (v_id_perfil, p_tarifa, p_id_moneda, CURDATE(), p_creado_por);

  SELECT v_id_perfil AS id_perfil;
END $$

-- Cambia la tarifa/moneda vigente de un perfil, versionando el
-- historial (cierra la fila vigente y abre una nueva desde hoy; si ya
-- se habia cambiado hoy mismo, actualiza esa fila en vez de duplicar).
DROP PROCEDURE IF EXISTS sp_perfil_editar_tarifa $$
CREATE PROCEDURE sp_perfil_editar_tarifa(
  IN p_id_perfil      INT UNSIGNED,
  IN p_tarifa         DECIMAL(10,2),
  IN p_id_moneda      INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_vigente INT UNSIGNED;
  DECLARE v_fecha_desde_vigente DATE;

  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id_perfil = p_id_perfil AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Perfil no encontrado o inactivo';
  END IF;

  IF p_tarifa IS NULL OR p_tarifa <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tarifa debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM maestro WHERE id_maestro = p_id_moneda AND tipo_maestro = 'MONEDA' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
  END IF;

  SELECT id_perfil_tarifa, fecha_desde INTO v_id_vigente, v_fecha_desde_vigente
  FROM perfiles_tarifas
  WHERE id_perfil = p_id_perfil AND fecha_hasta IS NULL
  LIMIT 1;

  IF v_id_vigente IS NOT NULL AND v_fecha_desde_vigente = CURDATE() THEN
    UPDATE perfiles_tarifas
    SET tarifa = p_tarifa, id_moneda = p_id_moneda, modificado_por = p_modificado_por
    WHERE id_perfil_tarifa = v_id_vigente;
  ELSE
    IF v_id_vigente IS NOT NULL THEN
      UPDATE perfiles_tarifas
      SET fecha_hasta = CURDATE() - INTERVAL 1 DAY, modificado_por = p_modificado_por
      WHERE id_perfil_tarifa = v_id_vigente;
    END IF;

    INSERT INTO perfiles_tarifas (id_perfil, tarifa, id_moneda, fecha_desde, creado_por)
    VALUES (p_id_perfil, p_tarifa, p_id_moneda, CURDATE(), p_modificado_por);
  END IF;
END $$

DROP PROCEDURE IF EXISTS sp_perfil_editar_nombre $$
CREATE PROCEDURE sp_perfil_editar_nombre(
  IN p_id_perfil      INT UNSIGNED,
  IN p_nombre         VARCHAR(150),
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_cliente INT UNSIGNED;

  SELECT id_cliente INTO v_id_cliente FROM perfiles WHERE id_perfil = p_id_perfil AND activo = 1;

  IF v_id_cliente IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Perfil no encontrado o inactivo';
  END IF;

  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre del perfil es obligatorio';
  END IF;

  IF EXISTS (
    SELECT 1 FROM perfiles
    WHERE id_cliente = v_id_cliente AND activo = 1 AND nombre = TRIM(p_nombre) AND id_perfil <> p_id_perfil
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un perfil activo con ese nombre para este cliente';
  END IF;

  UPDATE perfiles
  SET nombre = TRIM(p_nombre), modificado_por = p_modificado_por
  WHERE id_perfil = p_id_perfil;
END $$

DROP PROCEDURE IF EXISTS sp_perfil_desactivar $$
CREATE PROCEDURE sp_perfil_desactivar(
  IN p_id_perfil      INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id_perfil = p_id_perfil) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Perfil no encontrado';
  END IF;

  UPDATE perfiles
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_perfil = p_id_perfil;
END $$

-- Perfiles activos de un cliente con su tarifa/moneda vigente.
DROP PROCEDURE IF EXISTS sp_perfil_listar $$
CREATE PROCEDURE sp_perfil_listar(
  IN p_id_cliente INT UNSIGNED
)
BEGIN
  SELECT p.id_perfil, p.id_cliente, c.nombre AS cliente, p.nombre,
         pt.tarifa, pt.id_moneda, mon.codigo AS codigo_moneda, mon.valor AS moneda,
         p.fecha_creacion
  FROM perfiles p
  JOIN clientes c ON c.id_cliente = p.id_cliente
  LEFT JOIN perfiles_tarifas pt ON pt.id_perfil = p.id_perfil AND pt.fecha_hasta IS NULL
  LEFT JOIN maestro mon ON mon.id_maestro = pt.id_moneda
  WHERE p.activo = 1
    AND (p_id_cliente IS NULL OR p.id_cliente = p_id_cliente)
  ORDER BY c.nombre, p.nombre;
END $$

-- Historial completo de tarifas de un perfil (auditoria).
DROP PROCEDURE IF EXISTS sp_perfil_historial_tarifas $$
CREATE PROCEDURE sp_perfil_historial_tarifas(
  IN p_id_perfil INT UNSIGNED
)
BEGIN
  SELECT pt.id_perfil_tarifa, pt.tarifa, mon.codigo AS codigo_moneda, mon.valor AS moneda,
         pt.fecha_desde, pt.fecha_hasta
  FROM perfiles_tarifas pt
  JOIN maestro mon ON mon.id_maestro = pt.id_moneda
  WHERE pt.id_perfil = p_id_perfil
  ORDER BY pt.fecha_desde DESC;
END $$

DELIMITER ;
