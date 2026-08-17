-- =====================================================================
-- Soporte para cronometro offline-first: columna de "ultimo checkpoint"
-- para que un registro EN_CURSO deje rastro de vida aunque el detener
-- final nunca llegue a sincronizar (dispositivo perdido, etc).
-- =====================================================================
USE trackerTime;

ALTER TABLE registros_tiempo
  ADD COLUMN fecha_ultimo_checkpoint DATETIME NULL AFTER fecha_fin;
