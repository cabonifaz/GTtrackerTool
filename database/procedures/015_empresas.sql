-- =====================================================================
-- Stored Procedures: empresas (tenants). Solo las consume el area
-- app/plataforma/* (Super Admin), gateada por rol en la capa de app --
-- pero el diseno queda reutilizable para una futura pantalla de
-- membresias (self-service), por eso no reciben ningun parametro de
-- "actor" ligado a un rol especifico.
--
-- Plan comercial: PAGO_USUARIO exige tarifa+moneda y opcionalmente un
-- limite de usuarios activos (que sp_usuario_crear/sp_usuario_activar
-- hacen cumplir); GRATIS_PUBLICIDAD nunca tiene limite ni tarifa. El
-- toggle de publicidad es independiente del plan y queda disponible
-- para cualquier empresa.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_empresa_crear $$
CREATE PROCEDURE sp_empresa_crear(
  IN p_nombre             VARCHAR(150),
  IN p_slug               VARCHAR(50),
  IN p_color_primario     VARCHAR(7),
  IN p_color_secundario   VARCHAR(7),
  IN p_codigo_tipo_plan   VARCHAR(50),
  IN p_limite_usuarios    INT UNSIGNED,
  IN p_tarifa_por_usuario DECIMAL(10,2),
  IN p_codigo_moneda      VARCHAR(10),
  IN p_publicidad_activa  TINYINT(1),
  IN p_creado_por         VARCHAR(150)
)
BEGIN
  DECLARE v_id_tipo_plan INT UNSIGNED;
  DECLARE v_id_moneda INT UNSIGNED;
  DECLARE v_limite_usuarios INT UNSIGNED DEFAULT p_limite_usuarios;
  DECLARE v_tarifa_por_usuario DECIMAL(10,2) DEFAULT p_tarifa_por_usuario;

  IF p_slug IS NULL OR p_slug NOT REGEXP '^[a-z0-9-]+$' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El slug solo puede tener minusculas, numeros y guiones';
  END IF;

  IF p_slug IN ('plataforma', 'api', '_next', 'public', 'login', 'favicon.ico', 'robots.txt', 'sitemap.xml') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese slug esta reservado, elige otro';
  END IF;

  IF EXISTS (SELECT 1 FROM empresas WHERE slug = p_slug) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe una empresa con ese slug';
  END IF;

  SELECT id_maestro INTO v_id_tipo_plan
  FROM maestro WHERE tipo_maestro = 'TIPO_PLAN_EMPRESA' AND codigo = p_codigo_tipo_plan AND activo = 1
  LIMIT 1;

  IF v_id_tipo_plan IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de plan invalido';
  END IF;

  IF p_codigo_tipo_plan = 'PAGO_USUARIO' THEN
    IF p_tarifa_por_usuario IS NULL OR p_tarifa_por_usuario <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Indica una tarifa por usuario mayor a cero';
    END IF;

    SELECT id_maestro INTO v_id_moneda
    FROM maestro WHERE tipo_maestro = 'MONEDA' AND codigo = p_codigo_moneda AND activo = 1
    LIMIT 1;

    IF v_id_moneda IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
    END IF;
  ELSE
    -- GRATIS_PUBLICIDAD nunca tiene limite ni tarifa, aunque llegaran
    -- valores (se ignoran en vez de fallar, por si el formulario los
    -- dejo cargados de un cambio de plan anterior).
    SET v_limite_usuarios = NULL;
    SET v_tarifa_por_usuario = NULL;
    SET v_id_moneda = NULL;
  END IF;

  INSERT INTO empresas (
    nombre, slug, color_primario, color_secundario,
    id_tipo_plan, limite_usuarios, tarifa_por_usuario, id_moneda, publicidad_activa,
    creado_por
  )
  VALUES (
    p_nombre, p_slug, COALESCE(p_color_primario, '#111827'), COALESCE(p_color_secundario, '#374151'),
    v_id_tipo_plan, v_limite_usuarios, v_tarifa_por_usuario, v_id_moneda, COALESCE(p_publicidad_activa, 0),
    p_creado_por
  );

  SELECT LAST_INSERT_ID() AS id_empresa;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_editar $$
CREATE PROCEDURE sp_empresa_editar(
  IN p_id_empresa         INT UNSIGNED,
  IN p_nombre             VARCHAR(150),
  IN p_color_primario     VARCHAR(7),
  IN p_color_secundario   VARCHAR(7),
  IN p_codigo_tipo_plan   VARCHAR(50),
  IN p_limite_usuarios    INT UNSIGNED,
  IN p_tarifa_por_usuario DECIMAL(10,2),
  IN p_codigo_moneda      VARCHAR(10),
  IN p_publicidad_activa  TINYINT(1),
  IN p_modificado_por     VARCHAR(150)
)
BEGIN
  DECLARE v_id_tipo_plan INT UNSIGNED;
  DECLARE v_id_moneda INT UNSIGNED;
  DECLARE v_limite_usuarios INT UNSIGNED DEFAULT p_limite_usuarios;
  DECLARE v_tarifa_por_usuario DECIMAL(10,2) DEFAULT p_tarifa_por_usuario;

  IF NOT EXISTS (SELECT 1 FROM empresas WHERE id_empresa = p_id_empresa) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empresa no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_tipo_plan
  FROM maestro WHERE tipo_maestro = 'TIPO_PLAN_EMPRESA' AND codigo = p_codigo_tipo_plan AND activo = 1
  LIMIT 1;

  IF v_id_tipo_plan IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de plan invalido';
  END IF;

  IF p_codigo_tipo_plan = 'PAGO_USUARIO' THEN
    IF p_tarifa_por_usuario IS NULL OR p_tarifa_por_usuario <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Indica una tarifa por usuario mayor a cero';
    END IF;

    SELECT id_maestro INTO v_id_moneda
    FROM maestro WHERE tipo_maestro = 'MONEDA' AND codigo = p_codigo_moneda AND activo = 1
    LIMIT 1;

    IF v_id_moneda IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Moneda invalida';
    END IF;
  ELSE
    SET v_limite_usuarios = NULL;
    SET v_tarifa_por_usuario = NULL;
    SET v_id_moneda = NULL;
  END IF;

  UPDATE empresas
  SET nombre = p_nombre,
      color_primario = COALESCE(p_color_primario, color_primario),
      color_secundario = COALESCE(p_color_secundario, color_secundario),
      id_tipo_plan = v_id_tipo_plan,
      limite_usuarios = v_limite_usuarios,
      tarifa_por_usuario = v_tarifa_por_usuario,
      id_moneda = v_id_moneda,
      publicidad_activa = COALESCE(p_publicidad_activa, 0),
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
  SELECT e.id_empresa, e.nombre, e.slug, (e.logo IS NOT NULL) AS tiene_logo,
         e.color_primario, e.color_secundario, e.suspendida, e.activo, e.fecha_creacion,
         e.id_tipo_plan, tp.codigo AS codigo_tipo_plan, tp.valor AS tipo_plan,
         e.limite_usuarios, e.tarifa_por_usuario,
         e.id_moneda, mon.codigo AS codigo_moneda, mon.valor AS moneda,
         e.publicidad_activa,
         (SELECT COUNT(*) FROM usuarios u WHERE u.id_empresa = e.id_empresa AND u.activo = 1) AS usuarios_activos
  FROM empresas e
  LEFT JOIN maestro tp ON tp.id_maestro = e.id_tipo_plan
  LEFT JOIN maestro mon ON mon.id_maestro = e.id_moneda
  ORDER BY e.nombre;
END $$

DROP PROCEDURE IF EXISTS sp_empresa_obtener_por_slug $$
CREATE PROCEDURE sp_empresa_obtener_por_slug(
  IN p_slug VARCHAR(50)
)
BEGIN
  SELECT e.id_empresa, e.nombre, e.slug, (e.logo IS NOT NULL) AS tiene_logo,
         e.color_primario, e.color_secundario, e.suspendida, e.activo,
         e.id_tipo_plan, tp.codigo AS codigo_tipo_plan, tp.valor AS tipo_plan,
         e.limite_usuarios, e.tarifa_por_usuario,
         e.id_moneda, mon.codigo AS codigo_moneda, mon.valor AS moneda,
         e.publicidad_activa
  FROM empresas e
  LEFT JOIN maestro tp ON tp.id_maestro = e.id_tipo_plan
  LEFT JOIN maestro mon ON mon.id_maestro = e.id_moneda
  WHERE e.slug = p_slug AND e.activo = 1
  LIMIT 1;
END $$

DELIMITER ;
