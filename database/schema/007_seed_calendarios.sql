-- =====================================================================
-- Catalogo de paises de calendario + feriados 2026 (Canada, USA, Peru).
-- Fuente: feriados nacionales/federales publicos conocidos al momento de
-- escribir este seed -- el Admin puede agregar/corregir feriados locales
-- o de anios siguientes desde la pantalla de Calendario.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('PAIS_CALENDARIO', 'PE', 'Peru',           NULL, 1, 'SYSTEM'),
  ('PAIS_CALENDARIO', 'US', 'Estados Unidos', NULL, 2, 'SYSTEM'),
  ('PAIS_CALENDARIO', 'CA', 'Canada',         NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

SET @id_pe = (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'PAIS_CALENDARIO' AND codigo = 'PE');
SET @id_us = (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'PAIS_CALENDARIO' AND codigo = 'US');
SET @id_ca = (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'PAIS_CALENDARIO' AND codigo = 'CA');

-- ------------------------------- Peru 2026 -------------------------------
INSERT INTO feriados (id_pais, fecha, nombre, creado_por) VALUES
  (@id_pe, '2026-01-01', 'Ano Nuevo', 'SYSTEM'),
  (@id_pe, '2026-04-02', 'Jueves Santo', 'SYSTEM'),
  (@id_pe, '2026-04-03', 'Viernes Santo', 'SYSTEM'),
  (@id_pe, '2026-05-01', 'Dia del Trabajo', 'SYSTEM'),
  (@id_pe, '2026-06-29', 'San Pedro y San Pablo', 'SYSTEM'),
  (@id_pe, '2026-07-28', 'Fiestas Patrias', 'SYSTEM'),
  (@id_pe, '2026-07-29', 'Fiestas Patrias', 'SYSTEM'),
  (@id_pe, '2026-08-30', 'Santa Rosa de Lima', 'SYSTEM'),
  (@id_pe, '2026-10-08', 'Combate de Angamos', 'SYSTEM'),
  (@id_pe, '2026-11-01', 'Todos los Santos', 'SYSTEM'),
  (@id_pe, '2026-12-08', 'Inmaculada Concepcion', 'SYSTEM'),
  (@id_pe, '2026-12-25', 'Navidad', 'SYSTEM')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- --------------------------- Estados Unidos 2026 --------------------------
INSERT INTO feriados (id_pais, fecha, nombre, creado_por) VALUES
  (@id_us, '2026-01-01', 'New Year''s Day', 'SYSTEM'),
  (@id_us, '2026-01-19', 'Martin Luther King Jr. Day', 'SYSTEM'),
  (@id_us, '2026-02-16', 'Washington''s Birthday', 'SYSTEM'),
  (@id_us, '2026-05-25', 'Memorial Day', 'SYSTEM'),
  (@id_us, '2026-06-19', 'Juneteenth', 'SYSTEM'),
  (@id_us, '2026-07-04', 'Independence Day', 'SYSTEM'),
  (@id_us, '2026-09-07', 'Labor Day', 'SYSTEM'),
  (@id_us, '2026-10-12', 'Columbus Day', 'SYSTEM'),
  (@id_us, '2026-11-11', 'Veterans Day', 'SYSTEM'),
  (@id_us, '2026-11-26', 'Thanksgiving Day', 'SYSTEM'),
  (@id_us, '2026-12-25', 'Christmas Day', 'SYSTEM')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- ------------------------------- Canada 2026 -------------------------------
INSERT INTO feriados (id_pais, fecha, nombre, creado_por) VALUES
  (@id_ca, '2026-01-01', 'New Year''s Day', 'SYSTEM'),
  (@id_ca, '2026-04-03', 'Good Friday', 'SYSTEM'),
  (@id_ca, '2026-05-18', 'Victoria Day', 'SYSTEM'),
  (@id_ca, '2026-07-01', 'Canada Day', 'SYSTEM'),
  (@id_ca, '2026-09-07', 'Labour Day', 'SYSTEM'),
  (@id_ca, '2026-09-30', 'National Day for Truth and Reconciliation', 'SYSTEM'),
  (@id_ca, '2026-10-12', 'Thanksgiving', 'SYSTEM'),
  (@id_ca, '2026-11-11', 'Remembrance Day', 'SYSTEM'),
  (@id_ca, '2026-12-25', 'Christmas Day', 'SYSTEM'),
  (@id_ca, '2026-12-26', 'Boxing Day', 'SYSTEM')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
