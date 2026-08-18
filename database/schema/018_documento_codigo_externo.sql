-- =====================================================================
-- Numero de documento de identidad por talento (opcional) y codigo
-- externo por perfil de cobro (opcional, ej. "S1" de un tarifario del
-- cliente), para poder cargar cuadros de tarifas tal cual los maneja
-- el cliente sin perder esa referencia.
-- =====================================================================
USE trackerTime;

ALTER TABLE usuarios
  ADD COLUMN numero_documento VARCHAR(50) NULL AFTER apellidos;

ALTER TABLE perfiles
  ADD COLUMN codigo_externo VARCHAR(50) NULL AFTER nombre;
