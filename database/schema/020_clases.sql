-- =====================================================================
-- Tipo de proyecto "Clases": grupos con horario recurrente semanal,
-- sesiones generadas a partir de ese horario (reprogramables una por
-- una, sin tocar el patron), y el cronometro de cada sesion dictada.
-- Tablas nuevas, sin tocar tareas/registros_tiempo/cronometro.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_SESION_CLASE', 'PLANIFICADA',  'Planificada',  'Sesion generada desde el horario, sin cambios', 1, 'SYSTEM'),
  ('ESTADO_SESION_CLASE', 'REPROGRAMADA', 'Reprogramada', 'Se cambio fecha/hora de esta sesion puntual', 2, 'SYSTEM'),
  ('ESTADO_SESION_CLASE', 'DICTADA',      'Dictada',      'Se marco inicio y fin real de la sesion', 3, 'SYSTEM'),
  ('ESTADO_SESION_CLASE', 'CANCELADA',    'Cancelada',    'La sesion no se va a dictar', 4, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- ---------------------------------------------------------------------
-- Grupo de clases (tambien cubre "clase suelta": un grupo sin ningun
-- horario recurrente, cuyas sesiones se crean una por una).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos_clase (
  id_grupo           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_proyecto        INT UNSIGNED NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  id_profesor        INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_grupos_clase_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto),
  CONSTRAINT fk_grupos_clase_profesor FOREIGN KEY (id_profesor) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

CREATE INDEX ix_grupos_clase_proyecto ON grupos_clase (id_proyecto);
CREATE INDEX ix_grupos_clase_profesor ON grupos_clase (id_profesor);

-- ---------------------------------------------------------------------
-- Horario recurrente semanal de un grupo. Varias filas por grupo (ej.
-- Lunes y Miercoles = 2 filas). Tipo "slowly changing dimension" como
-- perfiles_tarifas: cambiar el horario cierra fecha_hasta de la fila
-- vigente y crea una nueva, sin reescribir sesiones ya generadas.
-- dia_semana: 1=Lunes .. 7=Domingo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios_grupo (
  id_horario         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_grupo           INT UNSIGNED NOT NULL,
  dia_semana         TINYINT UNSIGNED NOT NULL,
  hora_inicio        TIME         NOT NULL,
  hora_fin           TIME         NOT NULL,
  fecha_desde        DATE         NOT NULL,
  fecha_hasta        DATE         NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_horarios_grupo_grupo FOREIGN KEY (id_grupo) REFERENCES grupos_clase (id_grupo),
  CONSTRAINT ck_horarios_grupo_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_horarios_grupo_horas CHECK (hora_fin > hora_inicio)
) ENGINE = InnoDB;

CREATE INDEX ix_horarios_grupo_grupo ON horarios_grupo (id_grupo);

-- ---------------------------------------------------------------------
-- Sesiones concretas (generadas desde horarios_grupo, o creadas sueltas
-- una por una). Reprogramar solo toca la fila de esa sesion.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones_clase (
  id_sesion               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_grupo                INT UNSIGNED NOT NULL,
  fecha_planificada        DATE NOT NULL,
  hora_inicio_planificada  TIME NOT NULL,
  hora_fin_planificada     TIME NOT NULL,
  fecha_efectiva           DATE NULL,
  hora_inicio_efectiva     TIME NULL,
  hora_fin_efectiva        TIME NULL,
  tema                     VARCHAR(255) NULL,
  id_estado                INT UNSIGNED NOT NULL,
  creado_por               VARCHAR(150) NOT NULL,
  fecha_creacion           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por           VARCHAR(150) NULL,
  fecha_modificacion       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo                   TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_sesiones_clase_grupo FOREIGN KEY (id_grupo) REFERENCES grupos_clase (id_grupo),
  CONSTRAINT fk_sesiones_clase_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_sesiones_clase_grupo_fecha ON sesiones_clase (id_grupo, fecha_planificada);

-- ---------------------------------------------------------------------
-- Cronometro de una sesion dictada (analogo a registros_tiempo, en su
-- propia tabla para no tocar el cronometro de tareas existente).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_clase (
  id_registro            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_sesion              INT UNSIGNED NOT NULL,
  id_profesor            INT UNSIGNED NOT NULL,
  fecha_hora_inicio_real DATETIME     NOT NULL,
  fecha_hora_fin_real    DATETIME     NULL,
  duracion_segundos      INT UNSIGNED NULL,
  creado_por             VARCHAR(150) NOT NULL,
  fecha_creacion         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por         VARCHAR(150) NULL,
  fecha_modificacion     DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo                 TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_registros_clase_sesion FOREIGN KEY (id_sesion) REFERENCES sesiones_clase (id_sesion),
  CONSTRAINT fk_registros_clase_profesor FOREIGN KEY (id_profesor) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

CREATE INDEX ix_registros_clase_profesor_fecha ON registros_clase (id_profesor, fecha_hora_inicio_real);
CREATE INDEX ix_registros_clase_sesion ON registros_clase (id_sesion);
