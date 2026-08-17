-- =====================================================================
-- Asignacion de proyectos a talentos: un Talento solo puede ver/usar
-- los clientes/proyectos/tareas de los proyectos que tenga asignados.
-- Admin no usa esta tabla (siempre ve todo).
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS usuarios_proyectos (
  id_usuario_proyecto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_proyecto        INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_usuarios_proyectos UNIQUE (id_usuario, id_proyecto),
  CONSTRAINT fk_usuarios_proyectos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_usuarios_proyectos_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto)
) ENGINE = InnoDB;

CREATE INDEX ix_usuarios_proyectos_proyecto ON usuarios_proyectos (id_proyecto);
