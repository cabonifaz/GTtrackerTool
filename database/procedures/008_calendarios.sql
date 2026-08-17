-- =====================================================================
-- Stored Procedures: calendario de feriados
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_feriado_crear $$
CREATE PROCEDURE sp_feriado_crear(
  IN p_id_pais    INT UNSIGNED,
  IN p_fecha      DATE,
  IN p_nombre     VARCHAR(150),
  IN p_creado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM maestro WHERE id_maestro = p_id_pais AND tipo_maestro = 'PAIS_CALENDARIO' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pais de calendario invalido';
  END IF;

  IF p_nombre IS NULL OR TRIM(p_nombre) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre del feriado es obligatorio';
  END IF;

  INSERT INTO feriados (id_pais, fecha, nombre, creado_por)
  VALUES (p_id_pais, p_fecha, TRIM(p_nombre), p_creado_por)
  ON DUPLICATE KEY UPDATE
    nombre = TRIM(p_nombre),
    activo = 1,
    modificado_por = p_creado_por;

  SELECT LAST_INSERT_ID() AS id_feriado;
END $$

DROP PROCEDURE IF EXISTS sp_feriado_eliminar $$
CREATE PROCEDURE sp_feriado_eliminar(
  IN p_id_feriado     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM feriados WHERE id_feriado = p_id_feriado) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Feriado no encontrado';
  END IF;

  UPDATE feriados
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_feriado = p_id_feriado;
END $$

DROP PROCEDURE IF EXISTS sp_feriado_reemplazar_anio $$
CREATE PROCEDURE sp_feriado_reemplazar_anio(
  IN p_id_pais        INT UNSIGNED,
  IN p_anio           INT,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM maestro WHERE id_maestro = p_id_pais AND tipo_maestro = 'PAIS_CALENDARIO' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pais de calendario invalido';
  END IF;

  IF p_anio <= YEAR(CURDATE()) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se puede reemplazar el calendario de un anio que todavia no ha comenzado';
  END IF;

  UPDATE feriados
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_pais = p_id_pais
    AND activo = 1
    AND fecha >= MAKEDATE(p_anio, 1)
    AND fecha < MAKEDATE(p_anio + 1, 1);
END $$

DROP PROCEDURE IF EXISTS sp_feriado_listar_proximos $$
CREATE PROCEDURE sp_feriado_listar_proximos(
  IN p_id_pais INT UNSIGNED,
  IN p_limite  INT UNSIGNED
)
BEGIN
  SELECT id_feriado, fecha, nombre, DATEDIFF(fecha, CURDATE()) AS dias_faltantes
  FROM feriados
  WHERE id_pais = p_id_pais AND activo = 1 AND fecha >= CURDATE()
  ORDER BY fecha
  LIMIT p_limite;
END $$

DROP PROCEDURE IF EXISTS sp_feriado_listar_anio $$
CREATE PROCEDURE sp_feriado_listar_anio(
  IN p_id_pais INT UNSIGNED,
  IN p_anio    INT
)
BEGIN
  -- Rango de fechas en vez de YEAR(fecha)=p_anio para que el filtro sea
  -- sargable y pueda usar ix_feriados_fecha / uq_feriados_pais_fecha.
  DECLARE v_inicio DATE DEFAULT MAKEDATE(p_anio, 1);
  DECLARE v_fin DATE DEFAULT MAKEDATE(p_anio + 1, 1);

  SELECT id_feriado, fecha, nombre
  FROM feriados
  WHERE id_pais = p_id_pais AND activo = 1 AND fecha >= v_inicio AND fecha < v_fin
  ORDER BY fecha;
END $$

DROP PROCEDURE IF EXISTS sp_feriado_listar_todos $$
CREATE PROCEDURE sp_feriado_listar_todos()
BEGIN
  SELECT f.id_feriado, f.id_pais, m.valor AS pais, f.fecha, f.nombre
  FROM feriados f
  JOIN maestro m ON m.id_maestro = f.id_pais
  WHERE f.activo = 1
  ORDER BY f.fecha DESC;
END $$

DELIMITER ;
