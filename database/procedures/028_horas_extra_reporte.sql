-- =====================================================================
-- Stored Procedure: resumen mensual de horas extra por talento, para un
-- proyecto y mes dados -- indicador en Reportes de cuantas horas extra
-- tiene cada talento PENDIENTES de aprobar o ya APROBADAS ese mes
-- (RECHAZADA no cuenta). horas_extra no tiene id_proyecto (es por
-- talento, no por engagement especifico), asi que se muestra para
-- cualquier talento asignado a ese proyecto -- mismo criterio usado en
-- el resto de reportes de Talento.
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_horas_extra_resumen_mensual $$
CREATE PROCEDURE sp_horas_extra_resumen_mensual(
  IN p_id_proyecto      INT UNSIGNED,
  IN p_anio             INT,
  IN p_mes              INT,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  DECLARE v_inicio_mes DATE;
  DECLARE v_fin_mes DATE;

  IF NOT EXISTS (SELECT 1 FROM proyectos WHERE id_proyecto = p_id_proyecto AND id_empresa = p_id_empresa_actor) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Proyecto no encontrado';
  END IF;

  SET v_inicio_mes = MAKEDATE(p_anio, 1) + INTERVAL (p_mes - 1) MONTH;
  SET v_fin_mes = LAST_DAY(v_inicio_mes);

  SELECT
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    COALESCE(SUM(CASE WHEN ep.codigo = 'PENDIENTE' THEN h.horas ELSE 0 END), 0) AS horas_pendientes,
    COALESCE(SUM(CASE WHEN ep.codigo = 'APROBADA' THEN h.horas ELSE 0 END), 0) AS horas_aprobadas
  FROM usuarios_proyectos up
  JOIN usuarios u ON u.id_usuario = up.id_usuario
  JOIN horas_extra h ON h.id_usuario = up.id_usuario
    AND h.activo = 1
    AND h.fecha BETWEEN v_inicio_mes AND v_fin_mes
  JOIN maestro ep ON ep.id_maestro = h.id_estado AND ep.codigo IN ('PENDIENTE', 'APROBADA')
  WHERE up.id_proyecto = p_id_proyecto AND up.activo = 1
  GROUP BY u.id_usuario, u.nombres, u.apellidos
  ORDER BY u.nombres, u.apellidos;
END $$

DELIMITER ;
