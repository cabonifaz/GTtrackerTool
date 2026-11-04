-- =====================================================================
-- Tipo de cambio mensual por empresa, para convertir un costo (sueldo)
-- cargado en una moneda a la moneda de facturacion al calcular el
-- margen en el reporte de Talento. Granularidad de MES (no por dia):
-- una sola tasa representa todo el mes. "tasa" = cuantas unidades de
-- moneda_destino equivalen a 1 unidad de moneda_origen (ej. origen=PEN,
-- destino=USD, tasa=0.270000 -> 1 PEN = 0.27 USD).
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS tipos_cambio (
  id_tipo_cambio      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa          INT UNSIGNED  NOT NULL,
  anio                INT UNSIGNED  NOT NULL,
  mes                 TINYINT UNSIGNED NOT NULL,
  id_moneda_origen    INT UNSIGNED  NOT NULL,
  id_moneda_destino   INT UNSIGNED  NOT NULL,
  tasa                DECIMAL(14,6) NOT NULL,
  creado_por          VARCHAR(150)  NOT NULL,
  fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por      VARCHAR(150)  NULL,
  fecha_modificacion  DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_tipos_cambio UNIQUE (id_empresa, anio, mes, id_moneda_origen, id_moneda_destino),
  CONSTRAINT fk_tipos_cambio_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa),
  CONSTRAINT fk_tipos_cambio_moneda_origen FOREIGN KEY (id_moneda_origen) REFERENCES maestro (id_maestro),
  CONSTRAINT fk_tipos_cambio_moneda_destino FOREIGN KEY (id_moneda_destino) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;
