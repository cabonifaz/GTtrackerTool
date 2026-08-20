-- =====================================================================
-- Estado de envio de una asignacion de Actividades: Pendiente (el
-- talento aun no envio), Enviado (el talento finalizo), Cerrado (el
-- Admin cerro el periodo). Permite ver quienes tienen reporte pendiente
-- y bloquear edicion sin necesidad de "quitar acceso" (activo=0), que
-- es un concepto distinto (revocar del todo vs. solo bloquear edicion).
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_ASIGNACION_ACTIVIDAD', 'PENDIENTE', 'Pendiente',  'El talento aun no envio su reporte de actividades', 1, 'SYSTEM'),
  ('ESTADO_ASIGNACION_ACTIVIDAD', 'ENVIADO',   'Enviado',    'El talento finalizo y envio su reporte', 2, 'SYSTEM'),
  ('ESTADO_ASIGNACION_ACTIVIDAD', 'CERRADO',   'Cerrado',    'El Admin cerro el periodo, ya no se puede editar', 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

ALTER TABLE proyecto_asignaciones
  ADD COLUMN id_estado INT UNSIGNED NULL AFTER periodo_referencia;

UPDATE proyecto_asignaciones
  SET id_estado = (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'ESTADO_ASIGNACION_ACTIVIDAD' AND codigo = 'PENDIENTE')
  WHERE id_estado IS NULL;

ALTER TABLE proyecto_asignaciones
  MODIFY COLUMN id_estado INT UNSIGNED NOT NULL;

ALTER TABLE proyecto_asignaciones
  ADD CONSTRAINT fk_proyecto_asignaciones_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro);
