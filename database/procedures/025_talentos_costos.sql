-- =====================================================================
-- Stored Procedures: costo mensual (sueldo) por talento, con historial
-- por periodos de vigencia (mismo patron que
-- sp_usuario_proyecto_asignar_perfil): un cambio el mismo dia que ya se
-- habia editado actualiza esa fila; un cambio en otro dia cierra la
-- vigente y abre una nueva desde hoy; la primera asignacion honra
-- p_fecha_desde (no futura).
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_talento_costo_asignar $$
CREATE PROCEDURE sp_talento_costo_asignar(
  IN p_id_usuario       INT UNSIGNED,
  IN p_costo_mensual    DECIMAL(10,2),
  IN p_id_moneda        INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150),
  IN p_fecha_desde      DATE
)
BEGIN
  DECLARE v_id_vigente INT UNSIGNED;
  DECLARE v_fecha_desde_vigente DATE;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido';
  END IF;

  IF p_costo_mensual IS NULL OR p_costo_mensual <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El costo mensual debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM maestro WHERE id_maestro = p_id_moneda AND tipo_maestro = 'MONEDA' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
  END IF;

  SELECT id_talento_costo, fecha_desde INTO v_id_vigente, v_fecha_desde_vigente
  FROM talentos_costos
  WHERE id_usuario = p_id_usuario AND fecha_hasta IS NULL
  LIMIT 1;

  IF v_id_vigente IS NOT NULL THEN
    IF v_fecha_desde_vigente = CURDATE() THEN
      UPDATE talentos_costos
      SET costo_mensual = p_costo_mensual, id_moneda = p_id_moneda, modificado_por = p_modificado_por
      WHERE id_talento_costo = v_id_vigente;
    ELSE
      UPDATE talentos_costos
      SET fecha_hasta = CURDATE() - INTERVAL 1 DAY, modificado_por = p_modificado_por
      WHERE id_talento_costo = v_id_vigente;

      INSERT INTO talentos_costos (id_usuario, costo_mensual, id_moneda, fecha_desde, creado_por)
      VALUES (p_id_usuario, p_costo_mensual, p_id_moneda, CURDATE(), p_modificado_por);
    END IF;
  ELSE
    IF p_fecha_desde IS NOT NULL AND p_fecha_desde > CURDATE() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La fecha de vigencia no puede ser futura';
    END IF;
    INSERT INTO talentos_costos (id_usuario, costo_mensual, id_moneda, fecha_desde, creado_por)
    VALUES (p_id_usuario, p_costo_mensual, p_id_moneda, COALESCE(p_fecha_desde, CURDATE()), p_modificado_por);
  END IF;
END $$

DROP PROCEDURE IF EXISTS sp_talento_costo_historial $$
CREATE PROCEDURE sp_talento_costo_historial(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT tc.id_talento_costo, tc.costo_mensual, mon.codigo AS codigo_moneda, mon.valor AS moneda,
         tc.fecha_desde, tc.fecha_hasta
  FROM talentos_costos tc
  JOIN usuarios u ON u.id_usuario = tc.id_usuario
  JOIN maestro mon ON mon.id_maestro = tc.id_moneda
  WHERE tc.id_usuario = p_id_usuario AND u.id_empresa = p_id_empresa_actor
  ORDER BY tc.fecha_desde DESC;
END $$

DELIMITER ;
