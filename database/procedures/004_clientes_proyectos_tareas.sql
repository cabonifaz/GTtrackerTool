-- =====================================================================
-- Stored Procedures: clientes, proyectos, tareas
-- Convencion multi-tenant: p_id_empresa_actor se reenvia desde la
-- sesion. clientes/proyectos tienen columna id_empresa directa; tareas
-- la hereda validando siempre a traves de su proyecto.
-- =====================================================================
USE trackerTime;

DELIMITER $$

-- ---------------------------- CLIENTES ------------------------------
DROP PROCEDURE IF EXISTS sp_cliente_crear $$
CREATE PROCEDURE sp_cliente_crear(
  IN p_nombre       VARCHAR(150),
  IN p_id_empresa   INT UNSIGNED,
  IN p_creado_por   VARCHAR(150)
)
BEGIN
  IF EXISTS (SELECT 1 FROM clientes WHERE nombre = p_nombre AND id_empresa = p_id_empresa AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un cliente activo con ese nombre';
  END IF;

  INSERT INTO clientes (nombre, id_empresa, creado_por) VALUES (p_nombre, p_id_empresa, p_creado_por);
  SELECT LAST_INSERT_ID() AS id_cliente;
END $$

DROP PROCEDURE IF EXISTS sp_cliente_editar $$
CREATE PROCEDURE sp_cliente_editar(
  IN p_id_cliente       INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente no encontrado';
  END IF;

  UPDATE clientes
  SET nombre = p_nombre, modificado_por = p_modificado_por
  WHERE id_cliente = p_id_cliente;
END $$

DROP PROCEDURE IF EXISTS sp_cliente_desactivar $$
CREATE PROCEDURE sp_cliente_desactivar(
  IN p_id_cliente       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente no encontrado';
  END IF;

  UPDATE clientes
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_cliente = p_id_cliente;
END $$

DROP PROCEDURE IF EXISTS sp_cliente_listar $$
CREATE PROCEDURE sp_cliente_listar(
  IN p_id_usuario_actor  INT UNSIGNED,
  IN p_codigo_rol_actor  VARCHAR(50),
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  IF p_codigo_rol_actor = 'ADMIN' THEN
    SELECT id_cliente, nombre, activo, fecha_creacion
    FROM clientes
    WHERE id_empresa = p_id_empresa_actor
    ORDER BY nombre;
  ELSE
    SELECT DISTINCT c.id_cliente, c.nombre, c.activo, c.fecha_creacion
    FROM clientes c
    JOIN proyectos pr ON pr.id_cliente = c.id_cliente AND pr.activo = 1
    JOIN usuarios_proyectos up ON up.id_proyecto = pr.id_proyecto
                                AND up.id_usuario = p_id_usuario_actor
                                AND up.activo = 1
    WHERE c.activo = 1 AND c.id_empresa = p_id_empresa_actor
    ORDER BY c.nombre;
  END IF;
END $$

-- ---------------------------- PROYECTOS -----------------------------
-- Nota: el pais de calendario NO vive aca -- es una propiedad de la
-- relacion talento-proyecto (ver sp_usuario_proyecto_asignar y
-- sp_usuario_proyecto_actualizar_pais_calendario en 007_asignaciones.sql),
-- porque dos talentos en el mismo proyecto pueden necesitar calendarios
-- de feriados distintos.
DROP PROCEDURE IF EXISTS sp_proyecto_actualizar_pais_calendario $$

DROP PROCEDURE IF EXISTS sp_proyecto_crear $$
CREATE PROCEDURE sp_proyecto_crear(
  IN p_id_cliente          INT UNSIGNED,
  IN p_nombre              VARCHAR(150),
  IN p_descripcion         VARCHAR(255),
  IN p_id_empresa          INT UNSIGNED,
  IN p_creado_por          VARCHAR(150),
  IN p_codigo_tipo_proyecto VARCHAR(50)
)
BEGIN
  DECLARE v_id_estado INT UNSIGNED;
  DECLARE v_id_tipo_proyecto INT UNSIGNED;
  DECLARE v_codigo_tipo VARCHAR(50);

  IF p_id_cliente IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM clientes WHERE id_cliente = p_id_cliente AND id_empresa = p_id_empresa AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cliente invalido o inactivo';
  END IF;

  -- Llamadas existentes (previas a esta feature) no mandan tipo: se
  -- asume CRONOMETRO para no cambiar el comportamiento actual.
  SET v_codigo_tipo = COALESCE(NULLIF(p_codigo_tipo_proyecto, ''), 'CRONOMETRO');

  SELECT id_maestro INTO v_id_tipo_proyecto
  FROM maestro WHERE tipo_maestro = 'TIPO_PROYECTO' AND codigo = v_codigo_tipo AND activo = 1 LIMIT 1;

  IF v_id_tipo_proyecto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tipo de proyecto invalido';
  END IF;

  SELECT id_maestro INTO v_id_estado
  FROM maestro WHERE tipo_maestro = 'ESTADO_PROYECTO' AND codigo = 'ACTIVO' LIMIT 1;

  INSERT INTO proyectos (id_cliente, nombre, descripcion, id_estado, id_tipo_proyecto, id_empresa, creado_por)
  VALUES (p_id_cliente, p_nombre, p_descripcion, v_id_estado, v_id_tipo_proyecto, p_id_empresa, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_proyecto;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_editar $$
CREATE PROCEDURE sp_proyecto_editar(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_descripcion      VARCHAR(255),
  IN p_codigo_estado    VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  SELECT id_maestro INTO v_id_estado
  FROM maestro WHERE tipo_maestro = 'ESTADO_PROYECTO' AND codigo = p_codigo_estado LIMIT 1;

  IF v_id_estado IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado de proyecto invalido';
  END IF;

  UPDATE proyectos
  SET nombre = p_nombre, descripcion = p_descripcion, id_estado = v_id_estado,
      modificado_por = p_modificado_por
  WHERE id_proyecto = p_id_proyecto;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_desactivar $$
CREATE PROCEDURE sp_proyecto_desactivar(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  UPDATE proyectos
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_proyecto = p_id_proyecto;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_listar $$
CREATE PROCEDURE sp_proyecto_listar(
  IN p_id_usuario_actor  INT UNSIGNED,
  IN p_codigo_rol_actor  VARCHAR(50),
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  IF p_codigo_rol_actor = 'ADMIN' THEN
    SELECT p.id_proyecto, p.id_cliente, c.nombre AS cliente, p.nombre, p.descripcion,
           e.codigo AS codigo_estado, e.valor AS estado,
           t.codigo AS codigo_tipo_proyecto, t.valor AS tipo_proyecto,
           p.activo, p.fecha_creacion
    FROM proyectos p
    LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
    JOIN maestro e ON e.id_maestro = p.id_estado
    JOIN maestro t ON t.id_maestro = p.id_tipo_proyecto
    WHERE p.id_empresa = p_id_empresa_actor
    ORDER BY p.nombre;
  ELSE
    SELECT p.id_proyecto, p.id_cliente, c.nombre AS cliente, p.nombre, p.descripcion,
           e.codigo AS codigo_estado, e.valor AS estado,
           t.codigo AS codigo_tipo_proyecto, t.valor AS tipo_proyecto,
           p.activo, p.fecha_creacion
    FROM proyectos p
    JOIN usuarios_proyectos up ON up.id_proyecto = p.id_proyecto
                                AND up.id_usuario = p_id_usuario_actor
                                AND up.activo = 1
    LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
    JOIN maestro e ON e.id_maestro = p.id_estado
    JOIN maestro t ON t.id_maestro = p.id_tipo_proyecto
    WHERE p.activo = 1 AND p.id_empresa = p_id_empresa_actor
    ORDER BY p.nombre;
  END IF;
END $$

DROP PROCEDURE IF EXISTS sp_proyecto_listar_por_tipo $$
CREATE PROCEDURE sp_proyecto_listar_por_tipo(
  IN p_codigo_tipo_proyecto VARCHAR(50),
  IN p_id_empresa_actor     INT UNSIGNED
)
BEGIN
  -- Usado por el NavBar/paginas server-side para decidir que links de
  -- tipo de proyecto mostrar (Clases/Actividades), sin traer todos los
  -- proyectos ni su detalle.
  SELECT p.id_proyecto
  FROM proyectos p
  JOIN maestro t ON t.id_maestro = p.id_tipo_proyecto
  WHERE p.id_empresa = p_id_empresa_actor AND p.activo = 1 AND t.codigo = p_codigo_tipo_proyecto
  LIMIT 1;
END $$

-- ------------------------------ TAREAS -------------------------------
DROP PROCEDURE IF EXISTS sp_tarea_crear $$
CREATE PROCEDURE sp_tarea_crear(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_descripcion      VARCHAR(255),
  IN p_creado_por       VARCHAR(150),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  DECLARE v_id_estado INT UNSIGNED;

  IF p_nombre IS NULL OR CHAR_LENGTH(TRIM(p_nombre)) < 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea debe tener al menos 3 caracteres';
  END IF;

  IF CHAR_LENGTH(p_nombre) > 150 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea no puede superar 150 caracteres';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado no existe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND activo = 1) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado esta inactivo';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario_actor AND id_proyecto = p_id_proyecto AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes ese proyecto asignado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tareas
    WHERE id_proyecto = p_id_proyecto AND activo = 1 AND nombre = TRIM(p_nombre)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe una tarea activa con ese nombre en este proyecto';
  END IF;

  SELECT id_maestro INTO v_id_estado
  FROM maestro WHERE tipo_maestro = 'ESTADO_TAREA' AND codigo = 'PENDIENTE' LIMIT 1;

  INSERT INTO tareas (id_proyecto, nombre, descripcion, id_estado, creado_por)
  VALUES (p_id_proyecto, TRIM(p_nombre), p_descripcion, v_id_estado, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_tarea;
END $$

DROP PROCEDURE IF EXISTS sp_tarea_editar $$
CREATE PROCEDURE sp_tarea_editar(
  IN p_id_tarea         INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_descripcion      VARCHAR(255),
  IN p_codigo_estado    VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM tareas t
    JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
    WHERE t.id_tarea = p_id_tarea AND pr.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarea no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado
  FROM maestro WHERE tipo_maestro = 'ESTADO_TAREA' AND codigo = p_codigo_estado LIMIT 1;

  IF v_id_estado IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado de tarea invalido';
  END IF;

  UPDATE tareas
  SET nombre = p_nombre, descripcion = p_descripcion, id_estado = v_id_estado,
      modificado_por = p_modificado_por
  WHERE id_tarea = p_id_tarea;
END $$

DROP PROCEDURE IF EXISTS sp_tarea_desactivar $$
CREATE PROCEDURE sp_tarea_desactivar(
  IN p_id_tarea         INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_proyecto INT UNSIGNED;

  SELECT t.id_proyecto INTO v_id_proyecto
  FROM tareas t
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  WHERE t.id_tarea = p_id_tarea AND pr.id_empresa = p_id_empresa_actor;

  IF v_id_proyecto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarea no encontrada';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario_actor AND id_proyecto = v_id_proyecto AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes ese proyecto asignado';
  END IF;

  UPDATE tareas
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_tarea = p_id_tarea;
END $$

DROP PROCEDURE IF EXISTS sp_tarea_finalizar $$
CREATE PROCEDURE sp_tarea_finalizar(
  IN p_id_tarea         INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  DECLARE v_id_proyecto INT UNSIGNED;
  DECLARE v_id_estado_finalizada INT UNSIGNED;

  SELECT t.id_proyecto INTO v_id_proyecto
  FROM tareas t
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  WHERE t.id_tarea = p_id_tarea AND t.activo = 1 AND pr.id_empresa = p_id_empresa_actor;

  IF v_id_proyecto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarea no encontrada o inactiva';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario_actor AND id_proyecto = v_id_proyecto AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes ese proyecto asignado';
  END IF;

  SELECT id_maestro INTO v_id_estado_finalizada
  FROM maestro WHERE tipo_maestro = 'ESTADO_TAREA' AND codigo = 'FINALIZADA' LIMIT 1;

  UPDATE tareas
  SET id_estado = v_id_estado_finalizada, modificado_por = p_modificado_por
  WHERE id_tarea = p_id_tarea;
END $$

DROP PROCEDURE IF EXISTS sp_tarea_listar $$
CREATE PROCEDURE sp_tarea_listar(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF p_codigo_rol_actor = 'ADMIN' THEN
    SELECT t.id_tarea, t.id_proyecto, pr.nombre AS proyecto, t.nombre, t.descripcion,
           e.codigo AS codigo_estado, e.valor AS estado, t.activo, t.fecha_creacion,
           COALESCE(tot.total_segundos, 0) AS total_segundos
    FROM tareas t
    JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
    JOIN maestro e ON e.id_maestro = t.id_estado
    LEFT JOIN (
      SELECT id_tarea, SUM(duracion_segundos) AS total_segundos
      FROM registros_tiempo
      WHERE activo = 1
      GROUP BY id_tarea
    ) tot ON tot.id_tarea = t.id_tarea
    WHERE t.activo = 1
      AND pr.id_empresa = p_id_empresa_actor
      AND (p_id_proyecto IS NULL OR t.id_proyecto = p_id_proyecto)
    ORDER BY t.fecha_creacion DESC;
  ELSE
    -- Un talento ve sus propias tareas y las que creo un Admin, pero no
    -- las creadas por otros talentos del mismo proyecto (aunque compartan
    -- proyecto asignado). creado_por es el email con el que se creo la
    -- tarea; se resuelve el rol de ese creador para distinguir Admin de
    -- otro talento (un creador sin match en usuarios -- caso raro -- se
    -- deja visible en vez de ocultarlo por una coincidencia que fallo).
    SELECT t.id_tarea, t.id_proyecto, pr.nombre AS proyecto, t.nombre, t.descripcion,
           e.codigo AS codigo_estado, e.valor AS estado, t.activo, t.fecha_creacion,
           COALESCE(tot.total_segundos, 0) AS total_segundos
    FROM tareas t
    JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
    JOIN usuarios_proyectos up ON up.id_proyecto = pr.id_proyecto
                                AND up.id_usuario = p_id_usuario_actor
                                AND up.activo = 1
    JOIN maestro e ON e.id_maestro = t.id_estado
    JOIN usuarios ua ON ua.id_usuario = p_id_usuario_actor
    LEFT JOIN usuarios creador ON creador.email = t.creado_por
    LEFT JOIN maestro rc ON rc.id_maestro = creador.id_rol
    LEFT JOIN (
      SELECT id_tarea, SUM(duracion_segundos) AS total_segundos
      FROM registros_tiempo
      WHERE activo = 1
      GROUP BY id_tarea
    ) tot ON tot.id_tarea = t.id_tarea
    WHERE t.activo = 1
      AND pr.id_empresa = p_id_empresa_actor
      AND (p_id_proyecto IS NULL OR t.id_proyecto = p_id_proyecto)
      AND (t.creado_por = ua.email OR rc.codigo IS NULL OR rc.codigo = 'ADMIN')
    ORDER BY t.fecha_creacion DESC;
  END IF;
END $$

-- Tareas en las que alguno de los talentos indicados registro tiempo
-- (no las tareas de sus proyectos asignados en general -- especificamente
-- donde ya trabajaron). Solo para el panel de busqueda del Admin;
-- p_ids_usuario nunca debe llegar vacio (se valida en la capa de app).
DROP PROCEDURE IF EXISTS sp_tarea_listar_por_talentos $$
CREATE PROCEDURE sp_tarea_listar_por_talentos(
  IN p_ids_usuario      VARCHAR(1000),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT t.id_tarea, t.id_proyecto, pr.nombre AS proyecto, t.nombre, t.descripcion,
         e.codigo AS codigo_estado, e.valor AS estado, t.activo, t.fecha_creacion,
         COALESCE(tot.total_segundos, 0) AS total_segundos
  FROM tareas t
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  JOIN maestro e ON e.id_maestro = t.id_estado
  LEFT JOIN (
    SELECT id_tarea, SUM(duracion_segundos) AS total_segundos
    FROM registros_tiempo
    WHERE activo = 1
    GROUP BY id_tarea
  ) tot ON tot.id_tarea = t.id_tarea
  WHERE t.activo = 1
    AND pr.id_empresa = p_id_empresa_actor
    AND EXISTS (
      SELECT 1 FROM registros_tiempo rt
      WHERE rt.id_tarea = t.id_tarea AND rt.activo = 1 AND FIND_IN_SET(rt.id_usuario, p_ids_usuario) > 0
    )
  ORDER BY t.fecha_creacion DESC;
END $$

DELIMITER ;
