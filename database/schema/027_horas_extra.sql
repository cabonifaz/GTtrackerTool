-- =====================================================================
-- Horas extra + dia compensatorio: un talento puede acumular horas
-- extra (con aprobacion del Admin), y despues pedir un dia libre tipo
-- COMPENSATORIO que consume ese saldo (tambien con aprobacion). El
-- saldo puede quedar negativo si se aprueba un dia libre por adelantado
-- contra horas extra que todavia no se trabajaron -- esa es la "deuda"
-- que el talento debe ver.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('TIPO_AUSENCIA', 'COMPENSATORIO', 'Dia compensatorio', 'Consume saldo de horas extra aprobadas', 3, 'SYSTEM'),
  ('ESTADO_HORA_EXTRA', 'PENDIENTE', 'Pendiente', NULL, 1, 'SYSTEM'),
  ('ESTADO_HORA_EXTRA', 'APROBADA',  'Aprobada',  NULL, 2, 'SYSTEM'),
  ('ESTADO_HORA_EXTRA', 'RECHAZADA', 'Rechazada', NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Nunca se borra (mismo criterio que ausencias): la solicitud queda
-- registrada siempre, el estado se va actualizando.
CREATE TABLE IF NOT EXISTS horas_extra (
  id_hora_extra      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  fecha              DATE         NOT NULL,
  horas              DECIMAL(5,2) NOT NULL,
  motivo             VARCHAR(255) NULL,
  id_estado          INT UNSIGNED NOT NULL,
  aprobado_por       VARCHAR(150) NULL,
  fecha_aprobacion   DATETIME     NULL,
  motivo_rechazo     VARCHAR(255) NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_horas_extra_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_horas_extra_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_horas_extra_usuario ON horas_extra (id_usuario);
CREATE INDEX ix_horas_extra_estado ON horas_extra (id_estado);
