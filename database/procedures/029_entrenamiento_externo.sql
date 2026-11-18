-- =====================================================================
-- Stored Procedures: integracion con "Control Programa Entrenamientos"
-- (API externa de solo lectura de horas dictadas). La creacion del
-- registro_tiempo en si reutiliza sp_registro_tiempo_crear_manual
-- (orquestado desde la capa de app, igual que Invitaciones) -- aca solo
-- vive lo propio de esta integracion: el mapeo instructor-externo ->
-- usuario, y el log de dedup/auditoria por clase dictada.
-- =====================================================================
USE trackerTime;

DELIMITER $$

-- Registra (o actualiza el nombre visto) a un instructor externo. Si es
-- la primera vez que aparece, intenta auto-relacionarlo por email
-- exacto contra usuarios de la empresa; si no hay match, queda
-- id_usuario NULL ("pendiente de relacionar").
DROP PROCEDURE IF EXISTS sp_instructor_externo_upsert $$
CREATE PROCEDURE sp_instructor_externo_upsert(
  IN p_email_externo    VARCHAR(150),
  IN p_nombre_externo   VARCHAR(200),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_id_usuario_auto INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM instructores_externos WHERE id_empresa = p_id_empresa_actor AND email_externo = p_email_externo
  ) THEN
    SELECT id_usuario INTO v_id_usuario_auto
    FROM usuarios WHERE email = p_email_externo AND id_empresa = p_id_empresa_actor AND activo = 1 LIMIT 1;

    INSERT INTO instructores_externos (id_empresa, email_externo, nombre_externo, id_usuario, creado_por)
    VALUES (p_id_empresa_actor, p_email_externo, p_nombre_externo, v_id_usuario_auto, p_creado_por);
  ELSE
    UPDATE instructores_externos
    SET nombre_externo = p_nombre_externo
    WHERE id_empresa = p_id_empresa_actor AND email_externo = p_email_externo;
  END IF;

  SELECT id_instructor_externo, email_externo, nombre_externo, id_usuario
  FROM instructores_externos
  WHERE id_empresa = p_id_empresa_actor AND email_externo = p_email_externo;
END $$

-- Instructores externos sin relacionar todavia -- la alerta en Qronos.
DROP PROCEDURE IF EXISTS sp_instructores_externos_pendientes_listar $$
CREATE PROCEDURE sp_instructores_externos_pendientes_listar(
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT ie.id_instructor_externo, ie.email_externo, ie.nombre_externo, ie.fecha_creacion,
         (SELECT COUNT(*) FROM horas_dictadas_importadas h
           WHERE h.email_externo = ie.email_externo AND h.id_empresa = ie.id_empresa AND h.codigo_estado = 'SIN_EMPAREJAR'
         ) AS clases_pendientes
  FROM instructores_externos ie
  WHERE ie.id_empresa = p_id_empresa_actor AND ie.id_usuario IS NULL
  ORDER BY ie.fecha_creacion;
END $$

-- Relaciona un instructor externo con un usuario de Qronos ya
-- existente. No reprocesa clases pendientes aca -- eso lo hace la capa
-- de app llamando sp_hora_dictada_pendientes_por_email_listar y
-- reintentando la importacion de cada una (misma logica que un import
-- normal, reutilizada).
DROP PROCEDURE IF EXISTS sp_instructor_externo_relacionar $$
CREATE PROCEDURE sp_instructor_externo_relacionar(
  IN p_id_instructor_externo INT UNSIGNED,
  IN p_id_usuario            INT UNSIGNED,
  IN p_id_empresa_actor      INT UNSIGNED,
  IN p_modificado_por        VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM instructores_externos WHERE id_instructor_externo = p_id_instructor_externo AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Instructor externo no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND id_empresa = p_id_empresa_actor AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido';
  END IF;

  UPDATE instructores_externos
  SET id_usuario = p_id_usuario, modificado_por = p_modificado_por
  WHERE id_instructor_externo = p_id_instructor_externo;

  SELECT email_externo FROM instructores_externos WHERE id_instructor_externo = p_id_instructor_externo;
END $$

-- Clases dictadas de un email que ya se vieron (quedaron sin profesor
-- relacionado) -- para reprocesarlas apenas se relaciona al instructor.
DROP PROCEDURE IF EXISTS sp_hora_dictada_pendientes_por_email_listar $$
CREATE PROCEDURE sp_hora_dictada_pendientes_por_email_listar(
  IN p_email_externo    VARCHAR(150),
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT id_importacion, program_id, group_id, topic_id, component_name, topic_title,
         fecha_clase, hora_inicio, hora_fin, minutos, id_proyecto
  FROM horas_dictadas_importadas
  WHERE email_externo = p_email_externo AND id_empresa = p_id_empresa_actor AND codigo_estado = 'SIN_EMPAREJAR'
  ORDER BY fecha_clase;
END $$

-- Temas (topic_id) de un programa ya procesados -- IMPORTADO queda
-- fijo para siempre (no se reprocesa); SIN_EMPAREJAR se devuelve tal
-- cual para que la capa de app sepa que ya se vio pero sigue pendiente.
DROP PROCEDURE IF EXISTS sp_horas_dictadas_estado_por_programa_listar $$
CREATE PROCEDURE sp_horas_dictadas_estado_por_programa_listar(
  IN p_program_id       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT topic_id, codigo_estado
  FROM horas_dictadas_importadas
  WHERE program_id = p_program_id AND id_empresa = p_id_empresa_actor;
END $$

-- Inserta el log de una clase recien procesada (estado IMPORTADO o
-- SIN_EMPAREJAR -- el registro_tiempo, si lo hay, ya se creo antes via
-- sp_registro_tiempo_crear_manual desde la capa de app).
DROP PROCEDURE IF EXISTS sp_hora_dictada_importar_registrar $$
CREATE PROCEDURE sp_hora_dictada_importar_registrar(
  IN p_program_id       INT UNSIGNED,
  IN p_group_id         INT UNSIGNED,
  IN p_topic_id         INT UNSIGNED,
  IN p_component_name   VARCHAR(255),
  IN p_topic_title      VARCHAR(255),
  IN p_fecha_clase      DATE,
  IN p_hora_inicio      TIME,
  IN p_hora_fin         TIME,
  IN p_minutos          INT UNSIGNED,
  IN p_email_externo    VARCHAR(150),
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_tarea         INT UNSIGNED,
  IN p_id_registro      INT UNSIGNED,
  IN p_codigo_estado    VARCHAR(30),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  INSERT INTO horas_dictadas_importadas (
    id_empresa, program_id, group_id, topic_id, component_name, topic_title,
    fecha_clase, hora_inicio, hora_fin, minutos, email_externo,
    id_usuario, id_proyecto, id_tarea, id_registro, codigo_estado, creado_por
  )
  VALUES (
    p_id_empresa_actor, p_program_id, p_group_id, p_topic_id, p_component_name, p_topic_title,
    p_fecha_clase, p_hora_inicio, p_hora_fin, p_minutos, p_email_externo,
    p_id_usuario, p_id_proyecto, p_id_tarea, p_id_registro, p_codigo_estado, p_creado_por
  )
  ON DUPLICATE KEY UPDATE
    id_usuario = p_id_usuario,
    id_proyecto = p_id_proyecto,
    id_tarea = p_id_tarea,
    id_registro = p_id_registro,
    codigo_estado = p_codigo_estado,
    modificado_por = p_creado_por;
END $$

DELIMITER ;
