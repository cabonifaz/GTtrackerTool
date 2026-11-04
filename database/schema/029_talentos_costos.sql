-- =====================================================================
-- Costo mensual (sueldo) por talento, para calcular el margen que
-- genera contra lo facturado. Mismo patron de vigencia que
-- perfiles_tarifas/usuarios_proyectos_perfiles: fecha_hasta NULL =
-- vigente; un cambio cierra la fila vigente y abre una nueva, nunca se
-- pisa el valor historico (si no, el margen de meses pasados quedaria
-- mal calculado despues de un aumento de sueldo).
-- Dato sensible: solo el Admin lo ingresa/edita; Admin y Gestor de
-- Servicio pueden VERLO (y el margen resultante) en el reporte de
-- Talento, acotado a sus clientes asignados.
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS talentos_costos (
  id_talento_costo   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED  NOT NULL,
  costo_mensual      DECIMAL(10,2) NOT NULL,
  id_moneda          INT UNSIGNED  NOT NULL,
  fecha_desde        DATE          NOT NULL,
  fecha_hasta        DATE          NULL,
  creado_por         VARCHAR(150)  NOT NULL,
  fecha_creacion     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150)  NULL,
  fecha_modificacion DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_talentos_costos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_talentos_costos_moneda FOREIGN KEY (id_moneda) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_talentos_costos_usuario_vigencia ON talentos_costos (id_usuario, fecha_desde);
