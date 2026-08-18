-- =====================================================================
-- Permite a cada empresa ocultar su nombre en el login (dejando solo el
-- logo, mas grande y centrado). Si la empresa no tiene logo cargado, el
-- login siempre muestra el nombre igual -- no puede quedar en blanco.
-- =====================================================================
USE trackerTime;

ALTER TABLE empresas
  ADD COLUMN ocultar_nombre TINYINT(1) NOT NULL DEFAULT 0 AFTER publicidad_activa;
