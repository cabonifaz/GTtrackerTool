-- =====================================================================
-- Tipo de proyecto "Actividades por Excel": el Admin carga masivamente,
-- por talento y periodo, a que proveedor/OC-OS/iniciativa esta asignado
-- (columna de detalle vacia a proposito); el talento entra despues y
-- agrega hasta 5 actividades de texto libre sobre esa asignacion,
-- mientras el periodo cargado siga vigente.
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS proyecto_asignaciones (
  id_asignacion            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_proyecto              INT UNSIGNED NOT NULL,
  id_usuario               INT UNSIGNED NOT NULL,
  proveedor                VARCHAR(150) NULL,
  oc_os                    VARCHAR(50)  NULL,
  nombre_iniciativa        VARCHAR(255) NULL,
  periodo_desde            DATE NOT NULL,
  periodo_hasta            DATE NOT NULL,
  periodo_referencia       VARCHAR(50)  NULL, -- texto tal cual del Excel, solo informativo
  lider_tecnico_asociado   VARCHAR(150) NULL,
  creado_por               VARCHAR(150) NOT NULL,
  fecha_creacion           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por           VARCHAR(150) NULL,
  fecha_modificacion       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo                   TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_proyecto_asignaciones_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto),
  CONSTRAINT fk_proyecto_asignaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT uq_proyecto_asignacion UNIQUE (id_proyecto, id_usuario, periodo_desde, periodo_hasta),
  CONSTRAINT ck_proyecto_asignaciones_periodo CHECK (periodo_hasta >= periodo_desde)
) ENGINE = InnoDB;

CREATE INDEX ix_proyecto_asignaciones_usuario ON proyecto_asignaciones (id_usuario);

CREATE TABLE IF NOT EXISTS proyecto_actividades (
  id_actividad        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_asignacion       INT UNSIGNED NOT NULL,
  descripcion         VARCHAR(500) NOT NULL,
  orden               TINYINT UNSIGNED NOT NULL,
  creado_por          VARCHAR(150) NOT NULL,
  fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por      VARCHAR(150) NULL,
  fecha_modificacion  DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_proyecto_actividades_asignacion FOREIGN KEY (id_asignacion) REFERENCES proyecto_asignaciones (id_asignacion)
) ENGINE = InnoDB;

CREATE INDEX ix_proyecto_actividades_asignacion ON proyecto_actividades (id_asignacion);
