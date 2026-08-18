-- =====================================================================
-- Plan comercial por empresa: si paga por usuario (con limite y tarifa)
-- o es una empresa sin limite de usuarios con publicidad. El toggle de
-- publicidad queda disponible para cualquier empresa (no exclusivo del
-- plan gratuito), solo cambia el valor por defecto sugerido en el
-- formulario de alta.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('TIPO_PLAN_EMPRESA', 'PAGO_USUARIO', 'Pago por usuario', 'Cobra una tarifa por cada usuario activo, hasta un limite', 1, 'SYSTEM'),
  ('TIPO_PLAN_EMPRESA', 'GRATIS_PUBLICIDAD', 'Gratis con publicidad', 'Sin limite de usuarios, financiada con publicidad', 2, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

ALTER TABLE empresas
  ADD COLUMN id_tipo_plan      INT UNSIGNED NULL AFTER slug,
  ADD COLUMN limite_usuarios   INT UNSIGNED NULL AFTER id_tipo_plan,
  ADD COLUMN tarifa_por_usuario DECIMAL(10,2) NULL AFTER limite_usuarios,
  ADD COLUMN id_moneda         INT UNSIGNED NULL AFTER tarifa_por_usuario,
  ADD COLUMN publicidad_activa TINYINT(1) NOT NULL DEFAULT 0 AFTER id_moneda;

ALTER TABLE empresas
  ADD CONSTRAINT fk_empresas_tipo_plan FOREIGN KEY (id_tipo_plan) REFERENCES maestro (id_maestro);
ALTER TABLE empresas
  ADD CONSTRAINT fk_empresas_moneda FOREIGN KEY (id_moneda) REFERENCES maestro (id_maestro);
