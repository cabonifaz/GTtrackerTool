-- =====================================================================
-- Cierre de mes para el reporte de facturacion: una vez cerrado un
-- proyecto/anio/mes, congela el detalle por talento (horas, tarifa,
-- target) tal como estaba al momento del cierre, para que una
-- correccion posterior de tarifa/perfil NO cambie retroactivamente un
-- mes ya facturado. Reabrir vuelve a calcular en vivo.
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS facturacion_cierres (
  id_cierre          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_proyecto        INT UNSIGNED NOT NULL,
  anio               INT UNSIGNED NOT NULL,
  mes                TINYINT UNSIGNED NOT NULL,
  cerrado            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_facturacion_cierre UNIQUE (id_proyecto, anio, mes),
  CONSTRAINT fk_facturacion_cierre_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS facturacion_cierre_detalle (
  id_cierre_detalle INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cierre         INT UNSIGNED NOT NULL,
  id_usuario        INT UNSIGNED NOT NULL,
  colaborador       VARCHAR(200) NOT NULL,
  dni               VARCHAR(50)  NULL,
  id_perfil         INT UNSIGNED NULL,
  id_rate           VARCHAR(50)  NULL,
  rate_nombre       VARCHAR(150) NULL,
  tarifa            DECIMAL(10,2) NULL,
  codigo_moneda     VARCHAR(10)  NULL,
  horas_trabajadas  DECIMAL(10,2) NOT NULL,
  horas_objetivo    DECIMAL(10,2) NOT NULL,
  dias_off          INT UNSIGNED NOT NULL,
  dias_fault        INT UNSIGNED NOT NULL,
  CONSTRAINT fk_facturacion_cierre_detalle_cierre FOREIGN KEY (id_cierre) REFERENCES facturacion_cierres (id_cierre)
) ENGINE = InnoDB;

CREATE INDEX ix_facturacion_cierre_detalle_cierre ON facturacion_cierre_detalle (id_cierre);
