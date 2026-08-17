-- =====================================================================
-- Stored Procedures: reportes de horas
-- Nota: p_ids_usuario recibe una lista de ids separados por coma
-- (ej. '1,2,5'); NULL o cadena vacia significa "todos los usuarios de
-- la empresa actora".
-- =====================================================================
USE trackerTime;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_horas_detalle $$
CREATE PROCEDURE sp_reporte_horas_detalle(
  IN p_ids_usuario     VARCHAR(1000),
  IN p_fecha_inicio    DATE,
  IN p_fecha_fin       DATE,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT
    rt.id_registro,
    u.id_usuario,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    c.nombre AS cliente,
    pr.nombre AS proyecto,
    t.nombre AS tarea,
    rt.fecha_inicio,
    rt.fecha_fin,
    rt.duracion_segundos,
    ROUND(rt.duracion_segundos / 3600, 2) AS horas,
    rt.descripcion
  FROM registros_tiempo rt
  JOIN usuarios u ON u.id_usuario = rt.id_usuario
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  LEFT JOIN clientes c ON c.id_cliente = pr.id_cliente
  WHERE rt.activo = 1
    AND rt.duracion_segundos IS NOT NULL
    AND rt.fecha_inicio >= p_fecha_inicio
    AND rt.fecha_inicio < DATE_ADD(p_fecha_fin, INTERVAL 1 DAY)
    AND u.id_empresa = p_id_empresa_actor
    AND (p_ids_usuario IS NULL OR p_ids_usuario = '' OR FIND_IN_SET(rt.id_usuario, p_ids_usuario) > 0)
  ORDER BY u.nombres, u.apellidos, rt.fecha_inicio;
END $$

DROP PROCEDURE IF EXISTS sp_reporte_horas_resumen_mensual $$
CREATE PROCEDURE sp_reporte_horas_resumen_mensual(
  IN p_id_usuario   INT UNSIGNED,
  IN p_fecha_inicio DATE,
  IN p_fecha_fin    DATE
)
BEGIN
  SELECT
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    DATE(rt.fecha_inicio) AS fecha,
    pr.nombre AS proyecto,
    t.nombre AS tarea,
    SUM(rt.duracion_segundos) AS duracion_segundos,
    ROUND(SUM(rt.duracion_segundos) / 3600, 2) AS horas
  FROM registros_tiempo rt
  JOIN usuarios u ON u.id_usuario = rt.id_usuario
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  WHERE rt.activo = 1
    AND rt.duracion_segundos IS NOT NULL
    AND rt.id_usuario = p_id_usuario
    AND rt.fecha_inicio >= p_fecha_inicio
    AND rt.fecha_inicio < DATE_ADD(p_fecha_fin, INTERVAL 1 DAY)
  GROUP BY u.nombres, u.apellidos, DATE(rt.fecha_inicio), pr.nombre, t.nombre
  ORDER BY fecha;
END $$

DROP PROCEDURE IF EXISTS sp_reporte_tiempo_por_tarea $$
CREATE PROCEDURE sp_reporte_tiempo_por_tarea(
  IN p_ids_usuario      VARCHAR(1000),
  IN p_fecha_inicio     DATE,
  IN p_fecha_fin        DATE,
  IN p_id_empresa_actor INT UNSIGNED
)
BEGIN
  SELECT
    t.id_tarea,
    CONCAT(u.nombres, ' ', u.apellidos) AS colaborador,
    c.nombre AS cliente,
    pr.nombre AS proyecto,
    t.nombre AS tarea,
    e.valor AS estado_tarea,
    COUNT(*) AS sesiones,
    SUM(rt.duracion_segundos) AS duracion_segundos,
    ROUND(SUM(rt.duracion_segundos) / 3600, 2) AS horas,
    MIN(rt.fecha_inicio) AS primer_inicio,
    MAX(rt.fecha_fin) AS ultimo_fin
  FROM registros_tiempo rt
  JOIN usuarios u ON u.id_usuario = rt.id_usuario
  JOIN tareas t ON t.id_tarea = rt.id_tarea
  JOIN maestro e ON e.id_maestro = t.id_estado
  JOIN proyectos pr ON pr.id_proyecto = t.id_proyecto
  LEFT JOIN clientes c ON c.id_cliente = pr.id_cliente
  WHERE rt.activo = 1
    AND rt.duracion_segundos IS NOT NULL
    AND rt.fecha_inicio >= p_fecha_inicio
    AND rt.fecha_inicio < DATE_ADD(p_fecha_fin, INTERVAL 1 DAY)
    AND u.id_empresa = p_id_empresa_actor
    AND (p_ids_usuario IS NULL OR p_ids_usuario = '' OR FIND_IN_SET(rt.id_usuario, p_ids_usuario) > 0)
  GROUP BY t.id_tarea, u.nombres, u.apellidos, c.nombre, pr.nombre, t.nombre, e.valor
  ORDER BY duracion_segundos DESC;
END $$

DELIMITER ;
