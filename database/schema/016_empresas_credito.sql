-- =====================================================================
-- Permite ocultar el credito "Develop by Geeky Tech" del login por
-- empresa (marca blanca para tenants que lo prefieran asi).
-- =====================================================================
USE trackerTime;

ALTER TABLE empresas
  ADD COLUMN ocultar_credito TINYINT(1) NOT NULL DEFAULT 0 AFTER ocultar_nombre;
