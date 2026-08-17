-- =====================================================================
-- Indices adicionales de performance para registros_tiempo.
-- Motivo: los reportes de horas filtran por rango de fecha (a veces
-- sobre muchos/todos los usuarios) y el cronometro filtra por
-- usuario + estado en cada iniciar/detener/consultar activo; el indice
-- compuesto original (id_usuario, fecha_inicio) no cubre bien ninguno
-- de los dos casos por si solo.
-- =====================================================================
USE trackerTime;

CREATE INDEX ix_registros_fecha_inicio ON registros_tiempo (fecha_inicio);
CREATE INDEX ix_registros_usuario_estado ON registros_tiempo (id_usuario, id_estado);
