-- =====================================================================
-- Stored Procedures: asignacion de proyectos a talentos
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_usuario_proyecto_asignar $$
CREATE PROCEDURE sp_usuario_proyecto_asignar(
  IN p_id_usuario         INT UNSIGNED,
  IN p_id_proyecto        INT UNSIGNED,
  IN p_id_pais_calendario INT UNSIGNED,
  IN p_id_empresa_actor   INT UNSIGNED,
  IN p_creado_por         VARCHAR(150)
)
BEGIN
  DECLARE v_tiene_predeterminado INT DEFAULT 0;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios WHERE id_usuario = p_id_usuario AND activo = 1 AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario invalido o inactivo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND activo = 1 AND id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto invalido o inactivo';
  END IF;

  IF p_id_pais_calendario IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM maestro
    WHERE id_maestro = p_id_pais_calendario AND tipo_maestro = 'PAIS_CALENDARIO' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pais de calendario invalido';
  END IF;

  SELECT COUNT(*) INTO v_tiene_predeterminado
  FROM usuarios_proyectos
  WHERE id_usuario = p_id_usuario AND activo = 1 AND predeterminado = 1;

  -- La primera asignacion activa de un talento queda como predeterminada
  -- automaticamente; si ya tenia una, esta nueva no la reemplaza (el
  -- talento la cambia el mismo desde sp_usuario_proyecto_marcar_predeterminado).
  INSERT INTO usuarios_proyectos (id_usuario, id_proyecto, predeterminado, id_pais_calendario, creado_por)
  VALUES (p_id_usuario, p_id_proyecto, IF(v_tiene_predeterminado = 0, 1, 0), p_id_pais_calendario, p_creado_por)
  ON DUPLICATE KEY UPDATE
    activo = 1,
    predeterminado = IF(v_tiene_predeterminado = 0, 1, predeterminado),
    id_pais_calendario = p_id_pais_calendario,
    modificado_por = p_creado_por;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_proyecto_desasignar $$
CREATE PROCEDURE sp_usuario_proyecto_desasignar(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150)
)
BEGIN
  DECLARE v_era_predeterminado INT DEFAULT 0;
  DECLARE v_siguiente_id_proyecto INT UNSIGNED;

  IF NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos up
    JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
    WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto
      AND up.activo = 1 AND pr.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese proyecto no esta asignado a este usuario';
  END IF;

  SELECT predeterminado INTO v_era_predeterminado
  FROM usuarios_proyectos
  WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto AND activo = 1;

  UPDATE usuarios_proyectos
  SET activo = 0, predeterminado = 0, modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto;

  IF v_era_predeterminado = 1 THEN
    SELECT id_proyecto INTO v_siguiente_id_proyecto
    FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario AND activo = 1
    ORDER BY fecha_creacion
    LIMIT 1;

    IF v_siguiente_id_proyecto IS NOT NULL THEN
      UPDATE usuarios_proyectos
      SET predeterminado = 1
      WHERE id_usuario = p_id_usuario AND id_proyecto = v_siguiente_id_proyecto;
    END IF;
  END IF;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_proyecto_marcar_predeterminado $$
CREATE PROCEDURE sp_usuario_proyecto_marcar_predeterminado(
  IN p_id_usuario     INT UNSIGNED,
  IN p_id_proyecto    INT UNSIGNED,
  IN p_modificado_por VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese proyecto no esta asignado a este usuario';
  END IF;

  UPDATE usuarios_proyectos
  SET predeterminado = 0, modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario AND activo = 1;

  UPDATE usuarios_proyectos
  SET predeterminado = 1, modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto;
END $$

-- Nota: esta SP incluye tarifa/perfil/moneda. Solo se consume desde
-- rutas requireAdmin() (panel "Asignar talentos") -- un Talento nunca
-- debe recibir esta informacion.
DROP PROCEDURE IF EXISTS sp_usuario_proyecto_listar_por_proyecto $$
CREATE PROCEDURE sp_usuario_proyecto_listar_por_proyecto(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT u.id_usuario, u.nombres, u.apellidos, u.email,
         up.id_pais_calendario, m.codigo AS codigo_pais, m.valor AS pais,
         perf.id_perfil, perf.nombre AS perfil,
         pt.tarifa, mon.codigo AS codigo_moneda, mon.valor AS moneda
  FROM usuarios_proyectos up
  JOIN usuarios u ON u.id_usuario = up.id_usuario
  JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
  LEFT JOIN maestro m ON m.id_maestro = up.id_pais_calendario
  LEFT JOIN usuarios_proyectos_perfiles upp
         ON upp.id_usuario_proyecto = up.id_usuario_proyecto AND upp.fecha_hasta IS NULL
  LEFT JOIN perfiles perf ON perf.id_perfil = upp.id_perfil
  LEFT JOIN perfiles_tarifas pt ON pt.id_perfil = perf.id_perfil AND pt.fecha_hasta IS NULL
  LEFT JOIN maestro mon ON mon.id_maestro = pt.id_moneda
  WHERE up.id_proyecto = p_id_proyecto
    AND up.activo = 1
    AND u.activo = 1
    AND pr.id_empresa = p_id_empresa_actor
  ORDER BY u.nombres, u.apellidos;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_proyecto_listar_mios $$
CREATE PROCEDURE sp_usuario_proyecto_listar_mios(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT p.id_proyecto, p.nombre AS proyecto, up.predeterminado,
         up.id_pais_calendario, m.codigo AS codigo_pais, m.valor AS pais
  FROM usuarios_proyectos up
  JOIN proyectos p ON p.id_proyecto = up.id_proyecto
  LEFT JOIN maestro m ON m.id_maestro = up.id_pais_calendario
  WHERE up.id_usuario = p_id_usuario AND up.activo = 1 AND p.activo = 1
  ORDER BY up.predeterminado DESC, p.nombre;
END $$

DROP PROCEDURE IF EXISTS sp_usuario_proyecto_actualizar_pais_calendario $$
CREATE PROCEDURE sp_usuario_proyecto_actualizar_pais_calendario(
  IN p_id_usuario         INT UNSIGNED,
  IN p_id_proyecto        INT UNSIGNED,
  IN p_id_pais_calendario INT UNSIGNED,
  IN p_modificado_por     VARCHAR(150)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos
    WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese proyecto no esta asignado a este usuario';
  END IF;

  IF p_id_pais_calendario IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM maestro
    WHERE id_maestro = p_id_pais_calendario AND tipo_maestro = 'PAIS_CALENDARIO' AND activo = 1
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pais de calendario invalido';
  END IF;

  UPDATE usuarios_proyectos
  SET id_pais_calendario = p_id_pais_calendario, modificado_por = p_modificado_por
  WHERE id_usuario = p_id_usuario AND id_proyecto = p_id_proyecto;
END $$

-- Cambia el perfil (con tarifa/moneda) de un talento en un proyecto,
-- versionando el historial (nunca pisa una fila anterior). p_id_perfil
-- NULL quita el perfil asignado (deja al talento sin tarifa).
--
-- p_fecha_desde es opcional y solo se respeta cuando es la PRIMERA vez que
-- se le asigna un perfil a este talento en este proyecto (no hay historial
-- previo): permite dejar la tarifa vigente desde el inicio del proyecto o
-- del mes al configurar costos por primera vez, en vez de que quede vigente
-- recien desde hoy y las horas ya trabajadas queden "sin tarifa" en el
-- reporte de costos. Si ya existe un perfil vigente y se cambia, siempre
-- queda vigente desde hoy (nunca se reescribe retroactivamente un costo
-- que ya pudo haberse reportado/facturado).
DROP PROCEDURE IF EXISTS sp_usuario_proyecto_asignar_perfil $$
CREATE PROCEDURE sp_usuario_proyecto_asignar_perfil(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_perfil        INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED,
  IN p_modificado_por   VARCHAR(150),
  IN p_fecha_desde      DATE
)
BEGIN
  DECLARE v_id_usuario_proyecto INT UNSIGNED;
  DECLARE v_id_cliente_proyecto INT UNSIGNED;
  DECLARE v_id_cliente_perfil INT UNSIGNED;
  DECLARE v_id_vigente INT UNSIGNED;
  DECLARE v_fecha_desde_vigente DATE;

  SELECT up.id_usuario_proyecto INTO v_id_usuario_proyecto
  FROM usuarios_proyectos up
  JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
  WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto
    AND up.activo = 1 AND pr.id_empresa = p_id_empresa_actor;

  IF v_id_usuario_proyecto IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese proyecto no esta asignado a este usuario';
  END IF;

  IF p_id_perfil IS NOT NULL THEN
    SELECT id_cliente INTO v_id_cliente_proyecto FROM proyectos WHERE id_proyecto = p_id_proyecto;
    SELECT p.id_cliente INTO v_id_cliente_perfil
    FROM perfiles p
    JOIN clientes c ON c.id_cliente = p.id_cliente
    WHERE p.id_perfil = p_id_perfil AND p.activo = 1 AND c.id_empresa = p_id_empresa_actor;

    IF v_id_cliente_perfil IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Perfil invalido o inactivo';
    END IF;

    IF v_id_cliente_proyecto IS NULL OR v_id_cliente_proyecto <> v_id_cliente_perfil THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El perfil no pertenece al cliente de este proyecto';
    END IF;
  END IF;

  SELECT id_usuario_proyecto_perfil, fecha_desde INTO v_id_vigente, v_fecha_desde_vigente
  FROM usuarios_proyectos_perfiles
  WHERE id_usuario_proyecto = v_id_usuario_proyecto AND fecha_hasta IS NULL
  LIMIT 1;

  IF v_id_vigente IS NOT NULL THEN
    IF v_fecha_desde_vigente = CURDATE() THEN
      -- Ya se cambio hoy: se actualiza esa misma fila en vez de crear
      -- una entrada de historial nueva el mismo dia.
      IF p_id_perfil IS NULL THEN
        DELETE FROM usuarios_proyectos_perfiles WHERE id_usuario_proyecto_perfil = v_id_vigente;
      ELSE
        UPDATE usuarios_proyectos_perfiles
        SET id_perfil = p_id_perfil, modificado_por = p_modificado_por
        WHERE id_usuario_proyecto_perfil = v_id_vigente;
      END IF;
    ELSE
      UPDATE usuarios_proyectos_perfiles
      SET fecha_hasta = CURDATE() - INTERVAL 1 DAY, modificado_por = p_modificado_por
      WHERE id_usuario_proyecto_perfil = v_id_vigente;

      IF p_id_perfil IS NOT NULL THEN
        INSERT INTO usuarios_proyectos_perfiles (id_usuario_proyecto, id_perfil, fecha_desde, creado_por)
        VALUES (v_id_usuario_proyecto, p_id_perfil, CURDATE(), p_modificado_por);
      END IF;
    END IF;
  ELSEIF p_id_perfil IS NOT NULL THEN
    IF p_fecha_desde IS NOT NULL AND p_fecha_desde > CURDATE() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La fecha de vigencia no puede ser futura';
    END IF;
    INSERT INTO usuarios_proyectos_perfiles (id_usuario_proyecto, id_perfil, fecha_desde, creado_por)
    VALUES (v_id_usuario_proyecto, p_id_perfil, COALESCE(p_fecha_desde, CURDATE()), p_modificado_por);
  END IF;
END $$

DELIMITER ;
