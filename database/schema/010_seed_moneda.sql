-- =====================================================================
-- Catalogo de monedas para tarifas de perfiles.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('MONEDA', 'PEN', 'Soles',   NULL, 1, 'SYSTEM'),
  ('MONEDA', 'USD', 'Dolares', NULL, 2, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);
