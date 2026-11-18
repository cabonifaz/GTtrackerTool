-- =====================================================================
-- Integracion con "Control Programa Entrenamientos" (API externa de
-- solo lectura): trae las horas REALMENTE dictadas (temas marcados
-- como dictados) por los profesores de un programa de capacitacion, y
-- las registra como horas trabajadas en Qronos (registros_tiempo) para
-- poder calcular su pago.
--
-- instructores_externos: mapeo persistente email-externo -> usuario de
-- Qronos. Se auto-resuelve si el email coincide exacto; si no, queda
-- con id_usuario NULL ("pendiente de relacionar") hasta que el Admin lo
-- vincule a mano o cree el talento desde la alerta.
--
-- horas_dictadas_importadas: registro de auditoria/dedup por clase
-- dictada (program_id+topic_id es unico: un tema dictado una sola vez
-- en el sistema externo). Si en su momento no habia profesor
-- relacionado queda en SIN_EMPAREJAR (sin registro_tiempo); al
-- relacionar al profesor se reprocesa y pasa a IMPORTADO.
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS instructores_externos (
  id_instructor_externo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa            INT UNSIGNED  NOT NULL,
  email_externo         VARCHAR(150)  NOT NULL,
  nombre_externo        VARCHAR(200)  NOT NULL,
  id_usuario            INT UNSIGNED  NULL,
  creado_por            VARCHAR(150)  NOT NULL,
  fecha_creacion        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por        VARCHAR(150)  NULL,
  fecha_modificacion    DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_instructores_externos UNIQUE (id_empresa, email_externo),
  CONSTRAINT fk_instructores_externos_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa),
  CONSTRAINT fk_instructores_externos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

CREATE INDEX ix_instructores_externos_usuario ON instructores_externos (id_usuario);

CREATE TABLE IF NOT EXISTS horas_dictadas_importadas (
  id_importacion     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa         INT UNSIGNED  NOT NULL,
  program_id         INT UNSIGNED  NOT NULL,
  group_id           INT UNSIGNED  NOT NULL,
  topic_id           INT UNSIGNED  NOT NULL,
  component_name     VARCHAR(255)  NOT NULL,
  topic_title        VARCHAR(255)  NOT NULL,
  fecha_clase        DATE          NOT NULL,
  hora_inicio        TIME          NULL,
  hora_fin           TIME          NULL,
  minutos            INT UNSIGNED  NOT NULL,
  email_externo      VARCHAR(150)  NOT NULL,
  id_usuario         INT UNSIGNED  NULL,
  id_proyecto        INT UNSIGNED  NOT NULL,
  id_tarea           INT UNSIGNED  NULL,
  id_registro        INT UNSIGNED  NULL,
  codigo_estado      VARCHAR(30)   NOT NULL,
  creado_por         VARCHAR(150)  NOT NULL,
  fecha_creacion     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150)  NULL,
  fecha_modificacion DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_horas_dictadas_importadas UNIQUE (program_id, topic_id),
  CONSTRAINT fk_hdi_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa),
  CONSTRAINT fk_hdi_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto),
  CONSTRAINT fk_hdi_tarea FOREIGN KEY (id_tarea) REFERENCES tareas (id_tarea),
  CONSTRAINT fk_hdi_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_hdi_registro FOREIGN KEY (id_registro) REFERENCES registros_tiempo (id_registro)
) ENGINE = InnoDB;

CREATE INDEX ix_horas_dictadas_importadas_estado ON horas_dictadas_importadas (codigo_estado);
CREATE INDEX ix_horas_dictadas_importadas_email ON horas_dictadas_importadas (email_externo);
