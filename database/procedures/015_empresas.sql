-- =====================================================================
-- Stored Procedures: empresas (tenants). Solo las consume el area
-- app/plataforma/* (Super Admin), gateada por rol en la capa de app --
-- pero el diseno queda reutilizable para una futura pantalla de
-- membresias (self-service), por eso no reciben ningun parametro de
-- "actor" ligado a un rol especifico.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_empresa_crear $$
CREATE PROCEDURE sp_empresa_crear(
  IN p_nombre           VARCHAR(150),
  IN p_slug             VARCHAR(50),
  IN p_color_primario   VARCHAR(7),
  IN p_color_secundario VARCHAR(7),
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  IF p_slug IS NULL OR p_slug NOT REGEXP '^[a-z0-9-]+$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El slug solo puede tener minusculas, numeros y guiones';
  END IF;

  IF p_slug IN ('plataforma', 'api', '_next', 'public', 'login', 'favicon.ico', 'robots.txt', 'sitemap.xml') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese slug esta reservado, elige otro';
  END IF;

  IF EXISTS (SELECT 1 FROM empresas WHERE slug = p_slug) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe una empresa con ese slug';
  END IF;

  INSERT INTO empresas (nombre, slug, color_primario, color_secundario, creado_por)
  VALUES (p_nombre, p_slug, COALESCE(p_color_primario, '#111827'), COALESCE(p_color_secundario, '#374151'), p_creado_por);

  SELECT LAST_INSERT_ID() AS id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_editar $$
CREATE PROCEDURE sp_empresa_editar(
  IN p_id_empresa       INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_color_primario   VARCHAR(7),
  IN p_color_secundario VARCHAR(7),
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  UPDATE empresas
  SET nombre = p_nombre,
      color_primario = COALESCE(p_color_primario, color_primario),
      color_secundario = COALESCE(p_color_secundario, color_secundario),
      modificado_por = p_modificado_por
  WHERE id_empresa = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_logo_actualizar $$
CREATE PROCEDURE sp_empresa_logo_actualizar(
  IN p_id_empresa     INT UNSIGNED,
  IN p_logo           LONGBLOB,
  IN p_logo_tipo      VARCHAR(100),
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  UPDATE empresas
  SET logo = p_logo,
      logo_tipo = p_logo_tipo,
      modificado_por = p_modificado_por
  WHERE id_empresa = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_obtener_logo $$
CREATE PROCEDURE sp_empresa_obtener_logo(
  IN p_slug VARCHAR(50)
)
BEGIN
  SELECT logo, logo_tipo FROM empresas WHERE slug = p_slug AND activo = 1;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_suspender $$
CREATE PROCEDURE sp_empresa_suspender(
  IN p_id_empresa     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  UPDATE empresas
  SET suspendida = 1, modificado_por = p_modificado_por
  WHERE id_empresa = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_reactivar $$
CREATE PROCEDURE sp_empresa_reactivar(
  IN p_id_empresa     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  UPDATE empresas
  SET suspendida = 0, modificado_por = p_modificado_por
  WHERE id_empresa = p_id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_listar $$
CREATE PROCEDURE sp_empresa_listar()
BEGIN
  SELECT id_empresa, nombre, slug, (logo IS NOT NULL) AS tiene_logo,
         color_primario, color_secundario, suspendida, activo, fecha_creacion
  FROM empresas
  ORDER BY nombre;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_obtener_por_slug $$
CREATE PROCEDURE sp_empresa_obtener_por_slug(
  IN p_slug VARCHAR(50)
)
BEGIN
  SELECT id_empresa, nombre, slug, (logo IS NOT NULL) AS tiene_logo,
         color_primario, color_secundario, suspendida, activo
  FROM empresas
  WHERE slug = p_slug AND activo = 1
  LIMIT 1;
END $$

DELIMITER ;
