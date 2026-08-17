-- =====================================================================
-- Dias off (vacaciones / enfermedad): solicitud del talento, aprobacion
-- del admin, evidencia opcional (foto, guardada como BLOB -- no hay
-- storage externo configurado en este proyecto) y saldo de vacaciones
-- por talento/anio (no todos tienen la misma cantidad).
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('TIPO_AUSENCIA', 'VACACIONES', 'Vacaciones',          NULL, 1, 'SYSTEM'),
  ('TIPO_AUSENCIA', 'ENFERMEDAD', 'Ausencia por enfermedad', NULL, 2, 'SYSTEM'),
  ('ESTADO_AUSENCIA', 'PENDIENTE', 'Pendiente', NULL, 1, 'SYSTEM'),
  ('ESTADO_AUSENCIA', 'APROBADA',  'Aprobada',  NULL, 2, 'SYSTEM'),
  ('ESTADO_AUSENCIA', 'RECHAZADA', 'Rechazada', NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Saldo de dias de vacaciones asignados a cada talento, por anio (varia
-- por persona, lo fija el Admin). Los "usados" se calculan desde
-- ausencias aprobadas de tipo VACACIONES, no se guardan aparte.
CREATE TABLE IF NOT EXISTS saldos_vacaciones (
  id_saldo_vacaciones INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  anio               INT          NOT NULL,
  dias_asignados     DECIMAL(5,2) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_saldos_vacaciones_usuario_anio UNIQUE (id_usuario, anio),
  CONSTRAINT fk_saldos_vacaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

-- Ausencias: la solicitud queda registrada siempre (nunca se borra), el
-- estado y fecha de aprobacion/rechazo se van actualizando -- eso ES el
-- historico. Es global al talento (no por proyecto): si esta de
-- vacaciones, lo esta para todos sus proyectos.
CREATE TABLE IF NOT EXISTS ausencias (
  id_ausencia        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_tipo            INT UNSIGNED NOT NULL,
  fecha_inicio       DATE         NOT NULL,
  fecha_fin          DATE         NOT NULL,
  motivo             VARCHAR(255) NULL,
  evidencia          LONGBLOB     NULL,
  evidencia_tipo     VARCHAR(100) NULL,
  id_estado          INT UNSIGNED NOT NULL,
  aprobado_por       VARCHAR(150) NULL,
  fecha_aprobacion   DATETIME     NULL,
  motivo_rechazo     VARCHAR(255) NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_ausencias_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_ausencias_tipo FOREIGN KEY (id_tipo) REFERENCES maestro (id_maestro),
  CONSTRAINT fk_ausencias_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_ausencias_usuario_fechas ON ausencias (id_usuario, fecha_inicio, fecha_fin);
CREATE INDEX ix_ausencias_estado ON ausencias (id_estado);
