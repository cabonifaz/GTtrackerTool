-- =====================================================================
-- Alertas de vencimiento para asignaciones de proyectos tipo Actividades
-- por Excel: registro de que "slot" de alerta ya se le mando push a cada
-- asignacion, para no duplicar envios entre corridas del job periodico.
-- No guarda nada de UI (el banner dentro de la app se calcula en vivo,
-- no necesita este registro).
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS proyecto_asignacion_alertas_enviadas (
  id_alerta          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_asignacion      INT UNSIGNED NOT NULL,
  clave_alerta       VARCHAR(20)  NOT NULL, -- 'T3', 'DIA_09', 'DIA_11', 'DIA_13', 'DIA_15', 'DIA_16', 'DIA_17', 'DIA_18', 'DIA_20', 'DIA_22'
  fecha_hora_envio   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_asignacion_alerta UNIQUE (id_asignacion, clave_alerta),
  CONSTRAINT fk_alertas_asignacion FOREIGN KEY (id_asignacion) REFERENCES proyecto_asignaciones(id_asignacion)
) ENGINE = InnoDB;
