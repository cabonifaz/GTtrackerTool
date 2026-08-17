-- =====================================================================
-- Calendario de feriados por proyecto: cada proyecto tiene un pais de
-- calendario (catalogo maestro), y cada asignacion talento-proyecto
-- puede ser la "predeterminada" del talento (una sola a la vez).
-- =====================================================================
USE trackerTime;

ALTER TABLE proyectos
  ADD COLUMN id_pais_calendario INT UNSIGNED NULL AFTER id_estado;

ALTER TABLE proyectos
  ADD CONSTRAINT fk_proyectos_pais_calendario FOREIGN KEY (id_pais_calendario) REFERENCES maestro (id_maestro);

ALTER TABLE usuarios_proyectos
  ADD COLUMN predeterminado TINYINT(1) NOT NULL DEFAULT 0 AFTER id_proyecto;

CREATE TABLE IF NOT EXISTS feriados (
  id_feriado         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_pais            INT UNSIGNED NOT NULL,
  fecha              DATE         NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_feriados_pais_fecha UNIQUE (id_pais, fecha),
  CONSTRAINT fk_feriados_pais FOREIGN KEY (id_pais) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_feriados_fecha ON feriados (fecha);
