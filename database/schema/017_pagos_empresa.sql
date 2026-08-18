-- =====================================================================
-- Historial de pagos de membresia por empresa (registro manual del
-- Super Admin -- no hay pasarela de pago integrada). Un pago puede
-- opcionalmente indicar el periodo que cubre (ej. un mes de servicio).
-- Soft-delete via `activo`: un pago cargado por error se anula, nunca
-- se borra (es un registro contable).
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS pagos_empresa (
  id_pago            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa         INT UNSIGNED NOT NULL,
  monto              DECIMAL(10,2) NOT NULL,
  id_moneda          INT UNSIGNED NOT NULL,
  fecha_pago         DATE NOT NULL,
  periodo_desde      DATE NULL,
  periodo_hasta      DATE NULL,
  referencia         VARCHAR(150) NULL,
  notas              VARCHAR(255) NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_pagos_empresa_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa),
  CONSTRAINT fk_pagos_empresa_moneda FOREIGN KEY (id_moneda) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_pagos_empresa_empresa_fecha ON pagos_empresa (id_empresa, fecha_pago);
