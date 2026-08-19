-- =====================================================================
-- Tipo de proyecto: Cronometro (actual), Clases, Actividades por Excel.
-- Todo proyecto existente (incluida produccion) queda en CRONOMETRO --
-- mismo comportamiento que tenian implicitamente, cero impacto.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('TIPO_PROYECTO', 'CRONOMETRO',       'Cronometro',            'Trackeo de horas por tareas (el actual)', 1, 'SYSTEM'),
  ('TIPO_PROYECTO', 'CLASES',           'Clases',                'Horario de clases con marcacion de inicio/fin por sesion', 2, 'SYSTEM'),
  ('TIPO_PROYECTO', 'ACTIVIDADES_EXCEL','Actividades por Excel', 'Asignaciones cargadas por Excel + actividades del talento', 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

ALTER TABLE proyectos
  ADD COLUMN id_tipo_proyecto INT UNSIGNED NULL AFTER id_estado;

UPDATE proyectos
  SET id_tipo_proyecto = (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'TIPO_PROYECTO' AND codigo = 'CRONOMETRO')
  WHERE id_tipo_proyecto IS NULL;

ALTER TABLE proyectos
  MODIFY COLUMN id_tipo_proyecto INT UNSIGNED NOT NULL;

ALTER TABLE proyectos
  ADD CONSTRAINT fk_proyectos_tipo FOREIGN KEY (id_tipo_proyecto) REFERENCES maestro (id_maestro);

CREATE INDEX ix_proyectos_tipo ON proyectos (id_tipo_proyecto);
