-- =====================================================================
-- Stored Procedures: proyectos tipo Clases (grupos, horario recurrente,
-- sesiones, cronometro de sesion). Archivo propio -- 005_cronometro.sql
-- no se toca, cero riesgo para el flujo de tareas/cronometro existente.
-- Convencion: p_id_usuario_actor/p_codigo_rol_actor/p_id_empresa_actor
-- se reenvian desde la sesion. "Profesor" = usuarios.id_usuario con rol
-- TALENTO asignado como profesor de un grupo (grupos_clase.id_profesor).
-- =====================================================================
USE trackerTime;

DELIMITER $$

-- ----------------------------- GRUPOS -------------------------------
DROP PROCEDURE IF EXISTS sp_grupo_clase_crear $$
CREATE PROCEDURE sp_grupo_clase_crear(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_id_profesor      INT UNSIGNED,
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

  IF v_codigo_tipo <> 'CLASES' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El proyecto no es de tipo Clases';
  END IF;

  IF p_nombre IS NULL OR CHAR_LENGTH(TRIM(p_nombre)) < 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre del grupo debe tener al menos 3 caracteres';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_profesor AND id_empresa = p_id_empresa_actor AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profesor invalido';
  END IF;

  INSERT INTO grupos_clase (id_proyecto, nombre, id_profesor, creado_por)
  VALUES (p_id_proyecto, TRIM(p_nombre), p_id_profesor, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_grupo;
END $$

DROP PROCEDURE IF EXISTS sp_grupo_clase_editar $$
CREATE PROCEDURE sp_grupo_clase_editar(
  IN p_id_grupo         INT UNSIGNED,
  IN p_nombre           VARCHAR(150),
  IN p_id_profesor      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_profesor AND id_empresa = p_id_empresa_actor AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Profesor invalido';
  END IF;

  UPDATE grupos_clase
  SET nombre = TRIM(p_nombre), id_profesor = p_id_profesor, modificado_por = p_modificado_por
  WHERE id_grupo = p_id_grupo;
END $$

DROP PROCEDURE IF EXISTS sp_grupo_clase_desactivar $$
CREATE PROCEDURE sp_grupo_clase_desactivar(
  IN p_id_grupo         INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  UPDATE grupos_clase SET activo = 0, modificado_por = p_modificado_por WHERE id_grupo = p_id_grupo;
END $$

DROP PROCEDURE IF EXISTS sp_grupo_clase_listar $$
CREATE PROCEDURE sp_grupo_clase_listar(
  IN p_id_usuario_actor  INT UNSIGNED,
  IN p_codigo_rol_actor  VARCHAR(50),
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  IF p_codigo_rol_actor = 'ADMIN' THEN
    SELECT g.id_grupo, g.id_proyecto, pr.nombre AS proyecto, g.nombre,
           g.id_profesor, CONCAT(u.nombres, ' ', u.apellidos) AS profesor,
           g.activo, g.fecha_creacion
    FROM grupos_clase g
    JOIN proyectos pr ON pr.id_proyecto = g.id_proyecto
    JOIN usuarios u ON u.id_usuario = g.id_profesor
    WHERE pr.id_empresa = p_id_empresa_actor
    ORDER BY pr.nombre, g.nombre;
  ELSE
    SELECT g.id_grupo, g.id_proyecto, pr.nombre AS proyecto, g.nombre,
           g.id_profesor, CONCAT(u.nombres, ' ', u.apellidos) AS profesor,
           g.activo, g.fecha_creacion
    FROM grupos_clase g
    JOIN proyectos pr ON pr.id_proyecto = g.id_proyecto
    JOIN usuarios u ON u.id_usuario = g.id_profesor
    WHERE pr.id_empresa = p_id_empresa_actor AND g.activo = 1 AND g.id_profesor = p_id_usuario_actor
    ORDER BY pr.nombre, g.nombre;
  END IF;
END $$

-- ---------------------------- HORARIOS ------------------------------
DROP PROCEDURE IF EXISTS sp_horario_grupo_definir $$
CREATE PROCEDURE sp_horario_grupo_definir(
  IN p_id_grupo         INT UNSIGNED,
  IN p_dia_semana       TINYINT UNSIGNED,
  IN p_hora_inicio      TIME,
  IN p_hora_fin         TIME,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_id_vigente INT UNSIGNED;
  DECLARE v_fecha_desde_vigente DATE;

  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor AND g.activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  IF p_dia_semana NOT BETWEEN 1 AND 7 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dia de la semana invalido (1=Lunes .. 7=Domingo)';
  END IF;

  IF p_hora_fin <= p_hora_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hora de fin debe ser mayor a la hora de inicio';
  END IF;

  SELECT id_horario, fecha_desde INTO v_id_vigente, v_fecha_desde_vigente
  FROM horarios_grupo
  WHERE id_grupo = p_id_grupo AND dia_semana = p_dia_semana AND fecha_hasta IS NULL AND activo = 1
  LIMIT 1;

  IF v_id_vigente IS NOT NULL AND v_fecha_desde_vigente = CURDATE() THEN
    -- Ya se edito hoy mismo: se sobreescribe en vez de acumular filas.
    UPDATE horarios_grupo
    SET hora_inicio = p_hora_inicio, hora_fin = p_hora_fin, modificado_por = p_creado_por
    WHERE id_horario = v_id_vigente;
  ELSE
    IF v_id_vigente IS NOT NULL THEN
      UPDATE horarios_grupo
      SET fecha_hasta = CURDATE() - INTERVAL 1 DAY, modificado_por = p_creado_por
      WHERE id_horario = v_id_vigente;
    END IF;

    INSERT INTO horarios_grupo (id_grupo, dia_semana, hora_inicio, hora_fin, fecha_desde, creado_por)
    VALUES (p_id_grupo, p_dia_semana, p_hora_inicio, p_hora_fin, CURDATE(), p_creado_por);
  END IF;

  SELECT id_horario FROM horarios_grupo
  WHERE id_grupo = p_id_grupo AND dia_semana = p_dia_semana AND fecha_hasta IS NULL AND activo = 1;
END $$

DROP PROCEDURE IF EXISTS sp_horario_grupo_quitar $$
CREATE PROCEDURE sp_horario_grupo_quitar(
  IN p_id_grupo         INT UNSIGNED,
  IN p_dia_semana       TINYINT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  UPDATE horarios_grupo
  SET fecha_hasta = GREATEST(fecha_desde, CURDATE() - INTERVAL 1 DAY), modificado_por = p_modificado_por
  WHERE id_grupo = p_id_grupo AND dia_semana = p_dia_semana AND fecha_hasta IS NULL AND activo = 1;
END $$

DROP PROCEDURE IF EXISTS sp_horario_grupo_listar $$
CREATE PROCEDURE sp_horario_grupo_listar(
  IN p_id_grupo         INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  SELECT id_horario, dia_semana, hora_inicio, hora_fin, fecha_desde
  FROM horarios_grupo
  WHERE id_grupo = p_id_grupo AND fecha_hasta IS NULL AND activo = 1
  ORDER BY dia_semana;
END $$

-- ----------------------------- SESIONES -----------------------------
DROP PROCEDURE IF EXISTS sp_sesion_clase_generar $$
CREATE PROCEDURE sp_sesion_clase_generar(
  IN p_id_grupo         INT UNSIGNED,
  IN p_fecha_desde       DATE,
  IN p_fecha_hasta       DATE,
  IN p_codigo_rol_actor  VARCHAR(50),
  IN p_id_empresa_actor  INT UNSIGNED,
  IN p_creado_por        VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_planificada INT UNSIGNED;

  IF p_codigo_rol_actor <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un Admin puede generar sesiones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor AND g.activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  IF p_fecha_desde IS NULL OR p_fecha_hasta IS NULL OR p_fecha_desde > p_fecha_hasta THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rango de fechas invalido';
  END IF;

  IF DATEDIFF(p_fecha_hasta, p_fecha_desde) > 366 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El rango no puede superar 366 dias por generacion';
  END IF;

  SELECT id_maestro INTO v_id_estado_planificada
  FROM maestro WHERE tipo_maestro = 'ESTADO_SESION_CLASE' AND codigo = 'PLANIFICADA' LIMIT 1;

  INSERT INTO sesiones_clase (id_grupo, fecha_planificada, hora_inicio_planificada, hora_fin_planificada, id_estado, creado_por)
  WITH RECURSIVE fechas AS (
    SELECT p_fecha_desde AS fecha
    UNION ALL
    SELECT fecha + INTERVAL 1 DAY FROM fechas WHERE fecha < p_fecha_hasta
  )
  SELECT h.id_grupo, d.fecha, h.hora_inicio, h.hora_fin, v_id_estado_planificada, p_creado_por
  FROM fechas d
  JOIN horarios_grupo h
    ON h.id_grupo = p_id_grupo
   AND h.activo = 1
   AND h.dia_semana = ((DAYOFWEEK(d.fecha) + 5) % 7) + 1
   AND d.fecha >= h.fecha_desde
   AND (h.fecha_hasta IS NULL OR d.fecha <= h.fecha_hasta)
  WHERE NOT EXISTS (
    SELECT 1 FROM sesiones_clase s
    WHERE s.id_grupo = h.id_grupo AND s.fecha_planificada = d.fecha AND s.activo = 1
  );

  SELECT ROW_COUNT() AS sesiones_creadas;
END $$

DROP PROCEDURE IF EXISTS sp_sesion_clase_crear_suelta $$
CREATE PROCEDURE sp_sesion_clase_crear_suelta(
  IN p_id_grupo         INT UNSIGNED,
  IN p_fecha            DATE,
  IN p_hora_inicio      TIME,
  IN p_hora_fin         TIME,
  IN p_tema             VARCHAR(255),
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_planificada INT UNSIGNED;

  IF p_codigo_rol_actor <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un Admin puede crear sesiones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM grupos_clase g
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE g.id_grupo = p_id_grupo AND p.id_empresa = p_id_empresa_actor AND g.activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Grupo no encontrado';
  END IF;

  IF p_hora_fin <= p_hora_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hora de fin debe ser mayor a la hora de inicio';
  END IF;

  SELECT id_maestro INTO v_id_estado_planificada
  FROM maestro WHERE tipo_maestro = 'ESTADO_SESION_CLASE' AND codigo = 'PLANIFICADA' LIMIT 1;

  INSERT INTO sesiones_clase (id_grupo, fecha_planificada, hora_inicio_planificada, hora_fin_planificada, tema, id_estado, creado_por)
  VALUES (p_id_grupo, p_fecha, p_hora_inicio, p_hora_fin, NULLIF(TRIM(p_tema), ''), v_id_estado_planificada, p_creado_por);

  SELECT LAST_INSERT_ID() AS id_sesion;
END $$

DROP PROCEDURE IF EXISTS sp_sesion_clase_reprogramar $$
CREATE PROCEDURE sp_sesion_clase_reprogramar(
  IN p_id_sesion        INT UNSIGNED,
  IN p_nueva_fecha      DATE,
  IN p_nueva_hora_inicio TIME,
  IN p_nueva_hora_fin   TIME,
  IN p_tema             VARCHAR(255),
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_reprogramada INT UNSIGNED;

  IF p_codigo_rol_actor <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un Admin puede reprogramar sesiones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM sesiones_clase s
    JOIN grupos_clase g ON g.id_grupo = s.id_grupo
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE s.id_sesion = p_id_sesion AND p.id_empresa = p_id_empresa_actor AND s.activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sesion no encontrada';
  END IF;

  IF p_nueva_hora_fin <= p_nueva_hora_inicio THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hora de fin debe ser mayor a la hora de inicio';
  END IF;

  SELECT id_maestro INTO v_id_estado_reprogramada
  FROM maestro WHERE tipo_maestro = 'ESTADO_SESION_CLASE' AND codigo = 'REPROGRAMADA' LIMIT 1;

  -- Solo toca esta fila puntual -- el patron recurrente en horarios_grupo
  -- y el resto de sesiones generadas quedan intactos.
  UPDATE sesiones_clase
  SET fecha_efectiva = p_nueva_fecha,
      hora_inicio_efectiva = p_nueva_hora_inicio,
      hora_fin_efectiva = p_nueva_hora_fin,
      tema = COALESCE(NULLIF(TRIM(p_tema), ''), tema),
      id_estado = v_id_estado_reprogramada,
      modificado_por = p_modificado_por
  WHERE id_sesion = p_id_sesion;
END $$

DROP PROCEDURE IF EXISTS sp_sesion_clase_cancelar $$
CREATE PROCEDURE sp_sesion_clase_cancelar(
  IN p_id_sesion        INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_id_estado_cancelada INT UNSIGNED;

  IF p_codigo_rol_actor <> 'ADMIN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un Admin puede cancelar sesiones';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM sesiones_clase s
    JOIN grupos_clase g ON g.id_grupo = s.id_grupo
    JOIN proyectos p ON p.id_proyecto = g.id_proyecto
    WHERE s.id_sesion = p_id_sesion AND p.id_empresa = p_id_empresa_actor AND s.activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sesion no encontrada';
  END IF;

  SELECT id_maestro INTO v_id_estado_cancelada
  FROM maestro WHERE tipo_maestro = 'ESTADO_SESION_CLASE' AND codigo = 'CANCELADA' LIMIT 1;

  UPDATE sesiones_clase
  SET id_estado = v_id_estado_cancelada, modificado_por = p_modificado_por
  WHERE id_sesion = p_id_sesion;
END $$

DROP PROCEDURE IF EXISTS sp_sesion_clase_listar $$
CREATE PROCEDURE sp_sesion_clase_listar(
  IN p_id_grupo          INT UNSIGNED,
  IN p_fecha_desde        DATE,
  IN p_fecha_hasta        DATE,
  IN p_id_usuario_actor   INT UNSIGNED,
  IN p_codigo_rol_actor   VARCHAR(50),
  IN p_id_empresa_actor   INT UNSIGNED
)
BEGIN
  -- p_id_grupo NULL = todos los grupos visibles para el actor.
  SELECT s.id_sesion, s.id_grupo, g.nombre AS grupo, pr.nombre AS proyecto,
         g.id_profesor, CONCAT(u.nombres, ' ', u.apellidos) AS profesor,
         s.fecha_planificada, s.hora_inicio_planificada, s.hora_fin_planificada,
         s.fecha_efectiva, s.hora_inicio_efectiva, s.hora_fin_efectiva,
         COALESCE(s.fecha_efectiva, s.fecha_planificada) AS fecha_final,
         COALESCE(s.hora_inicio_efectiva, s.hora_inicio_planificada) AS hora_inicio_final,
         COALESCE(s.hora_fin_efectiva, s.hora_fin_planificada) AS hora_fin_final,
         s.tema, e.codigo AS codigo_estado, e.valor AS estado
  FROM sesiones_clase s
  JOIN grupos_clase g ON g.id_grupo = s.id_grupo
  JOIN proyectos pr ON pr.id_proyecto = g.id_proyecto
  JOIN usuarios u ON u.id_usuario = g.id_profesor
  JOIN maestro e ON e.id_maestro = s.id_estado
  WHERE pr.id_empresa = p_id_empresa_actor
    AND s.activo = 1
    AND (p_id_grupo IS NULL OR s.id_grupo = p_id_grupo)
    AND COALESCE(s.fecha_efectiva, s.fecha_planificada) BETWEEN p_fecha_desde AND p_fecha_hasta
    AND (p_codigo_rol_actor = 'ADMIN' OR g.id_profesor = p_id_usuario_actor)
  ORDER BY fecha_final, hora_inicio_final;
END $$

-- ------------------------- CRONOMETRO DE SESION ----------------------
DROP PROCEDURE IF EXISTS sp_sesion_clase_iniciar $$
CREATE PROCEDURE sp_sesion_clase_iniciar(
  IN p_id_sesion        INT UNSIGNED,
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_codigo_rol_actor VARCHAR(50),
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_creado_por       VARCHAR(150),
  IN p_fecha_inicio     DATETIME
)
BEGIN
  DECLARE v_id_profesor INT UNSIGNED;

  SELECT g.id_profesor INTO v_id_profesor
  FROM sesiones_clase s
  JOIN grupos_clase g ON g.id_grupo = s.id_grupo
  JOIN proyectos p ON p.id_proyecto = g.id_proyecto
  WHERE s.id_sesion = p_id_sesion AND p.id_empresa = p_id_empresa_actor AND s.activo = 1;

  IF v_id_profesor IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sesion no encontrada';
  END IF;

  IF p_codigo_rol_actor <> 'ADMIN' AND v_id_profesor <> p_id_usuario_actor THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Esta sesion no te pertenece';
  END IF;

  IF EXISTS (
    SELECT 1 FROM registros_clase WHERE id_profesor = v_id_profesor AND fecha_hora_fin_real IS NULL
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya hay una sesion en curso para este profesor';
  END IF;

  INSERT INTO registros_clase (id_sesion, id_profesor, fecha_hora_inicio_real, creado_por)
  VALUES (p_id_sesion, v_id_profesor, COALESCE(p_fecha_inicio, NOW()), p_creado_por);

  SELECT LAST_INSERT_ID() AS id_registro;
END $$

DROP PROCEDURE IF EXISTS sp_sesion_clase_detener $$
CREATE PROCEDURE sp_sesion_clase_detener(
  IN p_id_usuario_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150),
  IN p_fecha_fin        DATETIME
)
BEGIN
  DECLARE v_id_registro INT UNSIGNED;
  DECLARE v_id_sesion INT UNSIGNED;
  DECLARE v_id_estado_dictada INT UNSIGNED;
  DECLARE v_fecha_fin DATETIME DEFAULT COALESCE(p_fecha_fin, NOW());

  SELECT id_registro, id_sesion INTO v_id_registro, v_id_sesion
  FROM registros_clase
  WHERE id_profesor = p_id_usuario_actor AND fecha_hora_fin_real IS NULL
  LIMIT 1;

  IF v_id_registro IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay sesion en curso para este usuario';
  END IF;

  IF v_fecha_fin <= (SELECT fecha_hora_inicio_real FROM registros_clase WHERE id_registro = v_id_registro) THEN
    SET v_fecha_fin = NOW();
  END IF;

  UPDATE registros_clase
  SET fecha_hora_fin_real = v_fecha_fin,
      duracion_segundos = TIMESTAMPDIFF(SECOND, fecha_hora_inicio_real, v_fecha_fin),
      modificado_por = p_modificado_por
  WHERE id_registro = v_id_registro;

  SELECT id_maestro INTO v_id_estado_dictada
  FROM maestro WHERE tipo_maestro = 'ESTADO_SESION_CLASE' AND codigo = 'DICTADA' LIMIT 1;

  UPDATE sesiones_clase
  SET id_estado = v_id_estado_dictada, modificado_por = p_modificado_por
  WHERE id_sesion = v_id_sesion;

  SELECT id_registro, duracion_segundos FROM registros_clase WHERE id_registro = v_id_registro;
END $$

DROP PROCEDURE IF EXISTS sp_registro_clase_obtener_activo $$
CREATE PROCEDURE sp_registro_clase_obtener_activo(
  IN p_id_usuario_actor INT UNSIGNED
)
BEGIN
  SELECT rc.id_registro, rc.id_sesion, s.fecha_planificada, s.tema,
         g.id_grupo, g.nombre AS grupo, rc.fecha_hora_inicio_real
  FROM registros_clase rc
  JOIN sesiones_clase s ON s.id_sesion = rc.id_sesion
  JOIN grupos_clase g ON g.id_grupo = s.id_grupo
  WHERE rc.id_profesor = p_id_usuario_actor AND rc.fecha_hora_fin_real IS NULL
  LIMIT 1;
END $$

-- ------------------------------ REPORTES ------------------------------
DROP PROCEDURE IF EXISTS sp_reporte_clases_por_profesor $$
CREATE PROCEDURE sp_reporte_clases_por_profesor(
  IN p_fecha_desde       DATE,
  IN p_fecha_hasta       DATE,
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  SELECT g.id_profesor, CONCAT(u.nombres, ' ', u.apellidos) AS profesor,
         COUNT(*) AS sesiones_dictadas,
         SUM(rc.duracion_segundos) AS total_segundos
  FROM registros_clase rc
  JOIN sesiones_clase s ON s.id_sesion = rc.id_sesion
  JOIN grupos_clase g ON g.id_grupo = s.id_grupo
  JOIN proyectos p ON p.id_proyecto = g.id_proyecto
  JOIN usuarios u ON u.id_usuario = g.id_profesor
  WHERE p.id_empresa = p_id_empresa_actor
    AND rc.fecha_hora_fin_real IS NOT NULL
    AND DATE(rc.fecha_hora_inicio_real) BETWEEN p_fecha_desde AND p_fecha_hasta
  GROUP BY g.id_profesor, profesor
  ORDER BY profesor;
END $$

DROP PROCEDURE IF EXISTS sp_reporte_clases_por_grupo $$
CREATE PROCEDURE sp_reporte_clases_por_grupo(
  IN p_fecha_desde       DATE,
  IN p_fecha_hasta       DATE,
  IN p_id_empresa_actor  INT UNSIGNED
)
BEGIN
  SELECT g.id_grupo, g.nombre AS grupo, pr.nombre AS proyecto,
         CONCAT(u.nombres, ' ', u.apellidos) AS profesor,
         COUNT(*) AS sesiones_dictadas,
         SUM(rc.duracion_segundos) AS total_segundos
  FROM registros_clase rc
  JOIN sesiones_clase s ON s.id_sesion = rc.id_sesion
  JOIN grupos_clase g ON g.id_grupo = s.id_grupo
  JOIN proyectos pr ON pr.id_proyecto = g.id_proyecto
  JOIN usuarios u ON u.id_usuario = g.id_profesor
  WHERE pr.id_empresa = p_id_empresa_actor
    AND rc.fecha_hora_fin_real IS NOT NULL
    AND DATE(rc.fecha_hora_inicio_real) BETWEEN p_fecha_desde AND p_fecha_hasta
  GROUP BY g.id_grupo, grupo, proyecto, profesor
  ORDER BY proyecto, grupo;
END $$

DELIMITER ;
