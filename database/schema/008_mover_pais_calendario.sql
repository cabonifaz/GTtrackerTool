-- =====================================================================
-- Correccion de diseno: el calendario de feriados no es una propiedad del
-- proyecto, sino de la RELACION talento-proyecto (dos talentos en el mismo
-- proyecto pueden necesitar calendarios distintos). Se mueve la columna de
-- proyectos a usuarios_proyectos.
-- =====================================================================
USE trackerTime;

ALTER TABLE proyectos DROP FOREIGN KEY fk_proyectos_pais_calendario;
ALTER TABLE proyectos DROP COLUMN id_pais_calendario;

ALTER TABLE usuarios_proyectos
  ADD COLUMN id_pais_calendario INT UNSIGNED NULL AFTER predeterminado;

ALTER TABLE usuarios_proyectos
  ADD CONSTRAINT fk_usuarios_proyectos_pais_calendario FOREIGN KEY (id_pais_calendario) REFERENCES maestro (id_maestro);
