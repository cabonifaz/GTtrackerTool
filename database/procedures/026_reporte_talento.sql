-- =====================================================================
-- Stored Procedures de soporte para el reporte de Talento (evolucion
-- mensual + historial de perfil/tarifa de un talento en un cliente). El
-- monto/horas mensual (real y planificado) del reporte se arma
-- reutilizando sp_reporte_proyeccion_cliente desde la capa de app
-- (filtrado por talento), no se duplica aca ese calculo.
-- =====================================================================
USE trackerTime;

DELIMITER $$

-- Talentos con alguna asignacion activa a un proyecto del cliente, para
-- el buscador del reporte (evita cargar todos los usuarios de la
-- empresa cuando se filtra por cliente).
DROP PROCEDURE IF EXISTS sp_talentos_por_cliente_listar $$
CREATE PROCEDURE sp_talentos_por_cliente_listar(
  IN p_id_cliente       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT DISTINCT u.id_usuario, u.nombres, u.apellidos, u.email, u.numero_documento,
         rol.codigo AS codigo_rol, rol.valor AS rol, u.activo, u.fecha_creacion,
         u.id_empresa, NULL AS empresa, NULL AS empresa_slug
  FROM usuarios_proyectos up
  JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
  JOIN usuarios u ON u.id_usuario = up.id_usuario
  JOIN maestro rol ON rol.id_maestro = u.id_rol
  WHERE pr.id_cliente = p_id_cliente AND pr.id_empresa = p_id_empresa_actor AND up.activo = 1
  ORDER BY u.nombres, u.apellidos;
END $$

-- El primer proyecto (activo) de este cliente donde el talento tiene
-- una asignacion -- el reporte de evolucion es por cliente, pero el
-- historial de perfil/tarifa es por asignacion (proyecto), asi que se
-- resuelve automaticamente en vez de pedir un tercer selector en la UI.
DROP PROCEDURE IF EXISTS sp_talento_proyecto_resolver $$
CREATE PROCEDURE sp_talento_proyecto_resolver(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_cliente       INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT up.id_proyecto
  FROM usuarios_proyectos up
  JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
  WHERE up.id_usuario = p_id_usuario AND pr.id_cliente = p_id_cliente
    AND pr.id_empresa = p_id_empresa_actor AND up.activo = 1
  ORDER BY up.id_usuario_proyecto
  LIMIT 1;
END $$

-- Historial de PERFILES que tuvo el talento en ese proyecto (fechas de
-- vigencia de cada perfil asignado).
DROP PROCEDURE IF EXISTS sp_usuario_proyecto_perfil_historial $$
CREATE PROCEDURE sp_usuario_proyecto_perfil_historial(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos up
    JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
    WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto AND pr.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asignacion no encontrada';
  END IF;

  SELECT upp.id_usuario_proyecto_perfil, upp.id_perfil, p.nombre AS perfil,
         upp.fecha_desde, upp.fecha_hasta
  FROM usuarios_proyectos_perfiles upp
  JOIN usuarios_proyectos up ON up.id_usuario_proyecto = upp.id_usuario_proyecto
  JOIN perfiles p ON p.id_perfil = upp.id_perfil
  WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto
  ORDER BY upp.fecha_desde DESC;
END $$

-- Historial de TARIFA de cada perfil que el talento alguna vez tuvo en
-- ese proyecto (todos los periodos de tarifa de esos perfiles, no solo
-- los que coincidieron con su paso por el perfil -- asi se ve si la
-- tarifa del perfil cambio mientras el talento ya lo tenia asignado).
DROP PROCEDURE IF EXISTS sp_talento_historial_tarifas $$
CREATE PROCEDURE sp_talento_historial_tarifas(
  IN p_id_usuario       INT UNSIGNED,
  IN p_id_proyecto      INT UNSIGNED,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios_proyectos up
    JOIN proyectos pr ON pr.id_proyecto = up.id_proyecto
    WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto AND pr.id_empresa = p_id_empresa_actor
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Asignacion no encontrada';
  END IF;

  SELECT DISTINCT pt.id_perfil_tarifa, p.nombre AS perfil, pt.tarifa,
         mon.codigo AS codigo_moneda, mon.valor AS moneda, pt.fecha_desde, pt.fecha_hasta
  FROM usuarios_proyectos_perfiles upp
  JOIN usuarios_proyectos up ON up.id_usuario_proyecto = upp.id_usuario_proyecto
  JOIN perfiles p ON p.id_perfil = upp.id_perfil
  JOIN perfiles_tarifas pt ON pt.id_perfil = upp.id_perfil
  JOIN maestro mon ON mon.id_maestro = pt.id_moneda
  WHERE up.id_usuario = p_id_usuario AND up.id_proyecto = p_id_proyecto
  ORDER BY pt.fecha_desde DESC;
END $$

DELIMITER ;
