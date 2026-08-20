-- =====================================================================
-- Dominio de correo configurable por empresa, usado al auto-crear
-- usuarios (carga masiva y creacion manual de asignaciones de
-- Actividades) en vez del sufijo fijo "<slug>.local". Si queda vacio,
-- se sigue usando "<slug>.local" como antes -- no rompe nada existente.
-- =====================================================================
USE trackerTime;

ALTER TABLE empresas
  ADD COLUMN dominio_correo VARCHAR(150) NULL AFTER slug;
