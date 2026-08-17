-- =====================================================================
-- Stored Procedures: cronometro / registros_tiempo
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cronometro_iniciar $$
CREATE PROCEDURE sp_cronometro_iniciar(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_tarea         INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_nombre_tarea     VARCHAR(150),
  IN p_descripcion      VARCHAR(255),
  IN p_creado_por       VARCHAR(150),
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_fecha_inicio     DATETIME
)
BEGIN
  DECLARE v_id_tarea INT UNSIGNED DEFAULT p_id_tarea;
  DECLARE v_id_estado_en_curso INT UNSIGNED;
  DECLARE v_id_estado_pendiente INT UNSIGNED;

  IF v_id_tarea IS NULL THEN
    IF p_id_proyecto IS NULL OR p_nombre_tarea IS NULL OR TRIM(p_nombre_tarea) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Indica una tarea existente o un proyecto y nombre para crear una nueva';
    END IF;

    IF CHAR_LENGTH(TRIM(p_nombre_tarea)) < 3 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea debe tener al menos 3 caracteres';
    END IF;

    IF CHAR_LENGTH(p_nombre_tarea) > 150 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea no puede superar 150 caracteres';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado no existe';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND activo = 1) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado esta inactivo';
    END IF;

    IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
      SELECT 1 FROM usuarios_proyectos
      WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto AND activo = 1
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes ese proyecto asignado';
    END IF;

    -- Idempotente por (proyecto, nombre): si ya existe una tarea activa con
    -- ese nombre en el proyecto (p.ej. un reintento de sincronizacion offline
    -- que repite la misma creacion), se reutiliza en vez de duplicarla.
    SELECT id_tarea INTO v_id_tarea
    FROM tareas
    WHERE id_proyecto = p_id_proyecto AND activo = 1 AND nombre = TRIM(p_nombre_tarea)
    LIMIT 1;

    IF v_id_tarea IS NULL THEN
      SELECT id_maestro INTO v_id_estado_pendiente
      FROM maestro WHERE tipo_maestro = 'ESTADO_TAREA' AND codigo = 'PENDIENTE' LIMIT 1;

      INSERT INTO tareas (id_proyecto, nombre, descripcion, id_estado, creado_por)
      VALUES (p_id_proyecto, TRIM(p_nombre_tarea), NULL, v_id_estado_pendiente, p_creado_por);

      SET v_id_tarea = LAST_INSERT_ID();
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM tareas WHERE id_tarea = v_id_tarea AND activo = 1) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tarea invalida o inactiva';
    END IF;

    IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
      SELECT 1 FROM tareas t
      JOIN usuarios_proyectos up ON up.id_proyecto = t.id_proyecto
                                  AND up.id_usuario = p_id_usuario
                                  AND up.activo = 1
      WHERE t.id_tarea = v_id_tarea
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes esa tarea asignada';
    END IF;

    IF EXISTS (
      SELECT 1 FROM tareas t
      JOIN maestro e ON e.id_maestro = t.id_estado
      WHERE t.id_tarea = v_id_tarea AND e.codigo = 'FINALIZADA'
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esa tarea esta finalizada y no admite mas registros';
    END IF;
  END IF;

  SELECT id_maestro INTO v_id_estado_en_curso
  FROM maestro WHERE tipo_maestro = 'ESTADO_REGISTRO_TIEMPO' AND codigo = 'EN_CURSO' LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM registros_tiempo
    WHERE id_usuario = p_id_usuario AND id_estado = v_id_estado_en_curso
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un cronometro en curso para este usuario';
  END IF;

  INSERT INTO registros_tiempo (id_usuario, id_tarea, fecha_inicio, descripcion, id_estado, creado_por)
  VALUES (p_id_usuario, v_id_tarea, COALESCE(p_fecha_inicio, NOW()), p_descripcion, v_id_estado_en_curso, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_registro, v_id_tarea AS id_tarea;
END $$

DROP PROCEDURE IF EXISTS sp_cronometro_detener $$
CREATE PROCEDURE sp_cronometro_detener(
  IN p_id_usuario     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150),
  IN p_fecha_fin      DATETIME
)
BEGIN
  DECLARE v_id_registro INT UNSIGNED;
  DECLARE v_id_estado_en_curso INT UNSIGNED;
  DECLARE v_id_estado_detenido INT UNSIGNED;
  DECLARE v_fecha_fin DATETIME DEFAULT COALESCE(p_fecha_fin, NOW());

  SELECT id_maestro INTO v_id_estado_en_curso
  FROM maestro WHERE tipo_maestro = 'ESTADO_REGISTRO_TIEMPO' AND codigo = 'EN_CURSO' LIMIT 1;

  SELECT id_maestro INTO v_id_estado_detenido
  FROM maestro WHERE tipo_maestro = 'ESTADO_REGISTRO_TIEMPO' AND codigo = 'DETENIDO' LIMIT 1;

  SELECT id_registro INTO v_id_registro
  FROM registros_tiempo
  WHERE id_usuario = p_id_usuario AND id_estado = v_id_estado_en_curso
  LIMIT 1;

  IF v_id_registro IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay cronometro en curso para este usuario';
  END IF;

  IF v_fecha_fin <= (SELECT fecha_inicio FROM registros_tiempo WHERE id_registro = v_id_registro) THEN
    SET v_fecha_fin = NOW();
  END IF;

  UPDATE registros_tiempo
  SET fecha_fin = v_fecha_fin,
      duracion_segundos = TIMESTAMPDIFF(SECOND, fecha_inicio, v_fecha_fin),
      id_estado = v_id_estado_detenido,
      modificado_por = p_modificado_por
  WHERE id_registro = v_id_registro;

  SELECT id_registro, duracion_segundos FROM registros_tiempo WHERE id_registro = v_id_registro;
END $$

DROP PROCEDURE IF EXISTS sp_cronometro_obtener_activo $$
CREATE PROCEDURE sp_cronometro_obtener_activo(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT rt.id_registro, rt.id_tarea, t.nombre AS tarea, rt.fecha_inicio, rt.descripcion
  FROM registros_tiempo rt
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  JOIN maestro e ON e.id_maestro = rt.id_estado
  WHERE rt.id_usuario = p_id_usuario
    AND e.tipo_maestro = 'ESTADO_REGISTRO_TIEMPO'
    AND e.codigo = 'EN_CURSO'
  LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_cronometro_checkpoint $$
CREATE PROCEDURE sp_cronometro_checkpoint(
  IN p_id_usuario     INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_en_curso INT UNSIGNED;

  SELECT id_maestro INTO v_id_estado_en_curso
  FROM maestro WHERE tipo_maestro = 'ESTADO_REGISTRO_TIEMPO' AND codigo = 'EN_CURSO' LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM registros_tiempo
    WHERE id_usuario = p_id_usuario AND id_estado = v_id_estado_en_curso
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay cronometro en curso para este usuario';
  END IF;

  UPDATE registros_tiempo
  SET fecha_ultimo_checkpoint = NOW(),
      modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario AND id_estado = v_id_estado_en_curso;
END $$

DROP PROCEDURE IF EXISTS sp_cronometro_obtener_ultima_tarea $$
CREATE PROCEDURE sp_cronometro_obtener_ultima_tarea(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT rt.id_tarea, t.nombre AS tarea, pr.nombre AS proyecto, rt.fecha_inicio, rt.fecha_fin,
         (
           SELECT COALESCE(SUM(rt2.duracion_segundos), 0)
           FROM registros_tiempo rt2
           WHERE rt2.id_tarea = rt.id_tarea AND rt2.id_usuario = p_id_usuario AND rt2.activo = 1
         ) AS total_segundos
  FROM registros_tiempo rt
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  JOIN maestro e ON e.id_maestro = t.id_estado
  WHERE rt.id_usuario = p_id_usuario
    AND t.activo = 1
    AND e.codigo <> 'FINALIZADA'
  ORDER BY rt.fecha_inicio DESC
  LIMIT 1;
END $$

DROP PROCEDURE IF EXISTS sp_registro_tiempo_crear_manual $$
CREATE PROCEDURE sp_registro_tiempo_crear_manual(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_tarea         INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_nombre_tarea     VARCHAR(150),
  IN p_fecha_inicio     DATETIME,
  IN p_fecha_fin        DATETIME,
  IN p_descripcion      VARCHAR(255),
  IN p_creado_por       VARCHAR(150),
  IN p_codigo_rol_actor VARCHAR(50)
)
BEGIN
  DECLARE v_id_tarea INT UNSIGNED DEFAULT p_id_tarea;
  DECLARE v_id_estado_detenido INT UNSIGNED;
  DECLARE v_id_estado_pendiente INT UNSIGNED;
  DECLARE v_id_registro_existente INT UNSIGNED;

  IF p_fecha_inicio IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Falta la fecha/hora de inicio';
  END IF;

  IF p_fecha_fin IS NULL OR p_fecha_fin <= p_fecha_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF v_id_tarea IS NULL THEN
    IF p_id_proyecto IS NULL OR p_nombre_tarea IS NULL OR TRIM(p_nombre_tarea) = '' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Indica una tarea existente o un proyecto y nombre para crear una nueva';
    END IF;

    IF CHAR_LENGTH(TRIM(p_nombre_tarea)) < 3 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea debe tener al menos 3 caracteres';
    END IF;

    IF CHAR_LENGTH(p_nombre_tarea) > 150 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre de la tarea no puede superar 150 caracteres';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado no existe';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND activo = 1) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto indicado esta inactivo';
    END IF;

    IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
      SELECT 1 FROM usuarios_proyectos
      WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto AND activo = 1
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes ese proyecto asignado';
    END IF;

    -- Idempotente por (proyecto, nombre): ver comentario equivalente en
    -- sp_cronometro_iniciar.
    SELECT id_tarea INTO v_id_tarea
    FROM tareas
    WHERE id_proyecto = p_id_proyecto AND activo = 1 AND nombre = TRIM(p_nombre_tarea)
    LIMIT 1;

    IF v_id_tarea IS NULL THEN
      SELECT id_maestro INTO v_id_estado_pendiente
      FROM maestro WHERE tipo_maestro = 'ESTADO_TAREA' AND codigo = 'PENDIENTE' LIMIT 1;

      INSERT INTO tareas (id_proyecto, nombre, descripcion, id_estado, creado_por)
      VALUES (p_id_proyecto, TRIM(p_nombre_tarea), NULL, v_id_estado_pendiente, p_creado_por);

      SET v_id_tarea = LAST_INSERT_ID();
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM tareas WHERE id_tarea = v_id_tarea) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tarea indicada no existe';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tareas WHERE id_tarea = v_id_tarea AND activo = 1) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tarea indicada esta inactiva';
    END IF;

    IF p_codigo_rol_actor <> 'ADMIN' AND NOT EXISTS (
      SELECT 1 FROM tareas t
      JOIN usuarios_proyectos up ON up.id_proyecto = t.id_proyecto
                                  AND up.id_usuario = p_id_usuario
                                  AND up.activo = 1
      WHERE t.id_tarea = v_id_tarea
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No tienes esa tarea asignada';
    END IF;

    IF EXISTS (
      SELECT 1 FROM tareas t
      JOIN maestro e ON e.id_maestro = t.id_estado
      WHERE t.id_tarea = v_id_tarea AND e.codigo = 'FINALIZADA'
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esa tarea esta finalizada y no admite mas registros';
    END IF;
  END IF;

  -- Si ya existe un registro de este mismo usuario que empieza exactamente en
  -- la misma fecha/hora, se trata como una actualizacion de ese registro en
  -- vez de crear uno duplicado (relacion por fecha_inicio).
  SELECT id_registro INTO v_id_registro_existente
  FROM registros_tiempo
  WHERE id_usuario = p_id_usuario AND fecha_inicio = p_fecha_inicio AND activo = 1
  LIMIT 1;

  -- Ningun otro registro (activo, ya cerrado) del usuario puede tener un
  -- rango de horas que se cruce con este, para no duplicar tiempo trabajado
  -- entre actividades distintas.
  IF EXISTS (
    SELECT 1 FROM registros_tiempo
    WHERE id_usuario = p_id_usuario
      AND activo = 1
      AND duracion_segundos IS NOT NULL
      AND (v_id_registro_existente IS NULL OR id_registro <> v_id_registro_existente)
      AND fecha_inicio < p_fecha_fin
      AND fecha_fin > p_fecha_inicio
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango de horas se superpone con otro registro existente';
  END IF;

  SELECT id_maestro INTO v_id_estado_detenido
  FROM maestro WHERE tipo_maestro = 'ESTADO_REGISTRO_TIEMPO' AND codigo = 'DETENIDO' LIMIT 1;

  IF v_id_registro_existente IS NOT NULL THEN
    UPDATE registros_tiempo
    SET id_tarea = v_id_tarea,
        fecha_fin = p_fecha_fin,
        duracion_segundos = TIMESTAMPDIFF(SECOND, p_fecha_inicio, p_fecha_fin),
        descripcion = p_descripcion,
        id_estado = v_id_estado_detenido,
        modificado_por = p_creado_por
    WHERE id_registro = v_id_registro_existente;

    SELECT v_id_registro_existente AS id_registro, v_id_tarea AS id_tarea, 1 AS actualizado;
  ELSE
    INSERT INTO registros_tiempo (id_usuario, id_tarea, fecha_inicio, fecha_fin, duracion_segundos, descripcion, id_estado, creado_por)
    VALUES (p_id_usuario, v_id_tarea, p_fecha_inicio, p_fecha_fin,
            TIMESTAMPDIFF(SECOND, p_fecha_inicio, p_fecha_fin), p_descripcion, v_id_estado_detenido, p_creado_por);

    SELECT LAST_INSERT_ID() AS id_registro, v_id_tarea AS id_tarea, 0 AS actualizado;
  END IF;
END $$

DROP PROCEDURE IF EXISTS sp_registro_tiempo_editar $$
CREATE PROCEDURE sp_registro_tiempo_editar(
  IN p_id_registro      INT UNSIGNED,
  IN p_fecha_inicio     DATETIME,
  IN p_fecha_fin        DATETIME,
  IN p_descripcion      VARCHAR(255),
  IN p_modificado_por   VARCHAR(150),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50)
)
BEGIN
  DECLARE v_id_usuario_dueno INT UNSIGNED;

  SELECT id_usuario INTO v_id_usuario_dueno
  FROM registros_tiempo
  WHERE id_registro = p_id_registro
    AND (p_codigo_rol_actor = 'ADMIN' OR id_usuario = p_id_usuario_actor);

  IF v_id_usuario_dueno IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registro de tiempo no encontrado';
  END IF;

  IF p_fecha_fin IS NOT NULL AND p_fecha_fin <= p_fecha_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_fecha_fin IS NOT NULL AND EXISTS (
    SELECT 1 FROM registros_tiempo
    WHERE id_usuario = v_id_usuario_dueno
      AND activo = 1
      AND duracion_segundos IS NOT NULL
      AND id_registro <> p_id_registro
      AND fecha_inicio < p_fecha_fin
      AND fecha_fin > p_fecha_inicio
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango de horas se superpone con otro registro existente';
  END IF;

  UPDATE registros_tiempo
  SET fecha_inicio = p_fecha_inicio,
      fecha_fin = p_fecha_fin,
      duracion_segundos = CASE WHEN p_fecha_fin IS NOT NULL
                                THEN TIMESTAMPDIFF(SECOND, p_fecha_inicio, p_fecha_fin)
                                ELSE NULL END,
      descripcion = p_descripcion,
      modificado_por = p_modificado_por
  WHERE id_registro = p_id_registro;
END $$

DROP PROCEDURE IF EXISTS sp_registro_tiempo_eliminar $$
CREATE PROCEDURE sp_registro_tiempo_eliminar(
  IN p_id_registro      INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150),
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM registros_tiempo
    WHERE id_registro = p_id_registro
      AND (p_codigo_rol_actor = 'ADMIN' OR id_usuario = p_id_usuario_actor)
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Registro de tiempo no encontrado';
  END IF;

  UPDATE registros_tiempo
  SET activo = 0, modificado_por = p_modificado_por
  WHERE id_registro = p_id_registro;
END $$

DELIMITER ;
