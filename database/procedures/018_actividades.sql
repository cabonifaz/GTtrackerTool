-- =====================================================================
-- Stored Procedures: proyectos tipo Actividades por Excel (asignaciones
-- cargadas masivamente + actividades del talento sobre cada una).
-- Archivo propio, sin tocar tareas/registros_tiempo/cronometro.
-- =====================================================================
USE trackerTime;

DELIMITER $$

-- --------------------------- ASIGNACIONES ----------------------------
DROP PROCEDURE IF EXISTS sp_proyecto_asignacion_upsert $$
CREATE PROCEDURE sp_proyecto_asignacion_upsert(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_usuario       INT UNSIGNED,
  IN p_proveedor        VARCHAR(150),
  IN p_oc_os            VARCHAR(50),
  IN p_nombre_iniciativa VARCHAR(255),
  IN p_periodo_desde    DATE,
  IN p_periodo_hasta    DATE,
  IN p_periodo_referencia VARCHAR(50),
  IN p_lider_tecnico    VARCHAR(150),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_codigo_tipo VARCHAR(50);

  SELECT m.codigo INTO v_codigo_tipo
  FROM proyectos p
  JOIN maestro m ON m.id_maestro = p.id_tipo_proyecto
  WHERE p.id_proyecto = p_id_proyecto AND p.id_empresa = p_id_empresa_actor AND p.activo = 1;

  IF v_codigo_tipo IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  IF v_codigo_tipo <> 'ACTIVIDADES_EXCEL' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto no es de tipo Actividades por Excel';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND id_empresa = p_id_empresa_actor AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Recurso invalido';
  END IF;

  IF p_periodo_desde IS NULL OR p_periodo_hasta IS NULL OR p_periodo_hasta < p_periodo_desde THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Periodo invalido';
  END IF;

  INSERT INTO proyecto_asignaciones (
    id_proyecto, id_usuario, proveedor, oc_os, nombre_iniciativa,
    periodo_desde, periodo_hasta, periodo_referencia, lider_tecnico_asociado, creado_por
  )
  VALUES (
    p_id_proyecto, p_id_usuario, p_proveedor, p_oc_os, p_nombre_iniciativa,
    p_periodo_desde, p_periodo_hasta, p_periodo_referencia, p_lider_tecnico, p_creado_por
  )
  ON DUPLICATE KEY UPDATE
    proveedor = VALUES(proveedor),
    oc_os = VALUES(oc_os),
    nombre_iniciativa = VALUES(nombre_iniciativa),
    periodo_referencia = VALUES(periodo_referencia),
    lider_tecnico_asociado = VALUES(lider_tecnico_asociado),
    activo = 1,
    modificado_por = p_creado_por;

  SELECT id_asignacion FROM proyecto_asignaciones
  WHERE id_proyecto = p_id_proyecto AND id_usuario = p_id_usuario
    AND periodo_desde = p_periodo_desde AND periodo_hasta = p_periodo_hasta;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_asignacion_desactivar $$
CREATE PROCEDURE sp_proyecto_asignacion_desactivar(
  IN p_id_asignacion    INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM proyecto_asignaciones a
    JOIN proyectos p ON p.id_proyecto = a.id_proyecto
    WHERE a.id_asignacion = p_id_asignacion AND p.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asignacion no encontrada';
  END IF;

  UPDATE proyecto_asignaciones SET activo = 0, modificado_por = p_modificado_por WHERE id_asignacion = p_id_asignacion;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_asignacion_listar $$
CREATE PROCEDURE sp_proyecto_asignacion_listar(
  IN p_id_proyecto       INT UNSIGNED,
  IN p_id_usuario_actor  INT UNSIGNED,
  IN p_codigo_rol_actor  VARCHAR(50),
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  -- p_id_proyecto NULL = todos los proyectos tipo Actividades de la empresa.
  SELECT a.id_asignacion, a.id_proyecto, pr.nombre AS proyecto,
         a.id_usuario, CONCAT(u.nombres, ' ', u.apellidos) AS recurso,
         a.proveedor, a.oc_os, a.nombre_iniciativa,
         a.periodo_desde, a.periodo_hasta, a.periodo_referencia, a.lider_tecnico_asociado,
         (a.activo = 1) AS vigente,
         (SELECT COUNT(*) FROM proyecto_actividades ac WHERE ac.id_asignacion = a.id_asignacion AND ac.activo = 1) AS actividades_cargadas,
         a.activo, a.fecha_creacion
  FROM proyecto_asignaciones a
  JOIN proyectos pr ON pr.id_proyecto = a.id_proyecto
  JOIN usuarios u ON u.id_usuario = a.id_usuario
  WHERE pr.id_empresa = p_id_empresa_actor
    AND (p_id_proyecto IS NULL OR a.id_proyecto = p_id_proyecto)
    AND (p_codigo_rol_actor = 'ADMIN' OR a.id_usuario = p_id_usuario_actor)
  ORDER BY a.periodo_desde DESC, recurso;
END $$

-- ---------------------------- ACTIVIDADES -----------------------------
DROP PROCEDURE IF EXISTS sp_actividad_agregar $$
CREATE PROCEDURE sp_actividad_agregar(
  IN p_id_asignacion    INT UNSIGNED,
  IN p_descripcion      VARCHAR(500),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_id_usuario_dueno INT UNSIGNED;
  DECLARE v_vigente TINYINT;
  DECLARE v_cantidad INT;
  DECLARE v_siguiente_orden INT;

  SELECT a.id_usuario, a.activo
    INTO v_id_usuario_dueno, v_vigente
  FROM proyecto_asignaciones a
  JOIN proyectos p ON p.id_proyecto = a.id_proyecto
  WHERE a.id_asignacion = p_id_asignacion AND p.id_empresa = p_id_empresa_actor;

  IF v_id_usuario_dueno IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asignacion no encontrada';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND v_id_usuario_dueno <> p_id_usuario_actor THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta asignacion no te pertenece';
  END IF;

  IF NOT v_vigente THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta asignacion ya no esta activa';
  END IF;

  IF p_descripcion IS NULL OR CHAR_LENGTH(TRIM(p_descripcion)) < 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La actividad debe tener al menos 3 caracteres';
  END IF;

  SELECT COUNT(*), COALESCE(MAX(orden), 0) INTO v_cantidad, v_siguiente_orden
  FROM proyecto_actividades WHERE id_asignacion = p_id_asignacion AND activo = 1;

  IF v_cantidad >= 5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya se cargaron las 5 actividades permitidas para este periodo';
  END IF;

  INSERT INTO proyecto_actividades (id_asignacion, descripcion, orden, creado_por)
  VALUES (p_id_asignacion, TRIM(p_descripcion), v_siguiente_orden + 1, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_actividad;
END $$

DROP PROCEDURE IF EXISTS sp_actividad_editar $$
CREATE PROCEDURE sp_actividad_editar(
  IN p_id_actividad     INT UNSIGNED,
  IN p_descripcion      VARCHAR(500),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_usuario_dueno INT UNSIGNED;

  SELECT a.id_usuario INTO v_id_usuario_dueno
  FROM proyecto_actividades ac
  JOIN proyecto_asignaciones a ON a.id_asignacion = ac.id_asignacion
  JOIN proyectos p ON p.id_proyecto = a.id_proyecto
  WHERE ac.id_actividad = p_id_actividad AND p.id_empresa = p_id_empresa_actor AND ac.activo = 1;

  IF v_id_usuario_dueno IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Actividad no encontrada';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND v_id_usuario_dueno <> p_id_usuario_actor THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta actividad no te pertenece';
  END IF;

  IF p_descripcion IS NULL OR CHAR_LENGTH(TRIM(p_descripcion)) < 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La actividad debe tener al menos 3 caracteres';
  END IF;

  UPDATE proyecto_actividades
  SET descripcion = TRIM(p_descripcion), modificado_por = p_modificado_por
  WHERE id_actividad = p_id_actividad;
END $$

DROP PROCEDURE IF EXISTS sp_actividad_eliminar $$
CREATE PROCEDURE sp_actividad_eliminar(
  IN p_id_actividad     INT UNSIGNED,
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_usuario_dueno INT UNSIGNED;

  SELECT a.id_usuario INTO v_id_usuario_dueno
  FROM proyecto_actividades ac
  JOIN proyecto_asignaciones a ON a.id_asignacion = ac.id_asignacion
  JOIN proyectos p ON p.id_proyecto = a.id_proyecto
  WHERE ac.id_actividad = p_id_actividad AND p.id_empresa = p_id_empresa_actor AND ac.activo = 1;

  IF v_id_usuario_dueno IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Actividad no encontrada';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND v_id_usuario_dueno <> p_id_usuario_actor THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta actividad no te pertenece';
  END IF;

  UPDATE proyecto_actividades SET activo = 0, modificado_por = p_modificado_por WHERE id_actividad = p_id_actividad;
END $$

DROP PROCEDURE IF EXISTS sp_actividad_listar $$
CREATE PROCEDURE sp_actividad_listar(
  IN p_id_asignacion    INT UNSIGNED,
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM proyecto_asignaciones a
    JOIN proyectos p ON p.id_proyecto = a.id_proyecto
    WHERE a.id_asignacion = p_id_asignacion
      AND p.id_empresa = p_id_empresa_actor
      AND (p_codigo_rol_actor = 'ADMIN' OR a.id_usuario = p_id_usuario_actor)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asignacion no encontrada';
  END IF;

  SELECT id_actividad, descripcion, orden, fecha_creacion
  FROM proyecto_actividades
  WHERE id_asignacion = p_id_asignacion AND activo = 1
  ORDER BY orden;
END $$

DELIMITER ;
