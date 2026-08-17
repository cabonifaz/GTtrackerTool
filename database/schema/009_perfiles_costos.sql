-- =====================================================================
-- Cambio forzado de password en el primer login + Perfiles/tarifas por
-- cliente (con historial) para el reporte de costos.
-- =====================================================================
USE trackerTime;

ALTER TABLE usuarios
  ADD COLUMN debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash;

-- Los usuarios ya existentes no deben quedar forzados retroactivamente.
UPDATE usuarios SET debe_cambiar_password = 0;

-- ---------------------------------------------------------------------
-- Perfiles: catalogo de perfiles de cobro POR CLIENTE (ej. "Junior",
-- "Senior"). La tarifa vive en perfiles_tarifas, no aca, porque debe
-- poder cambiar en el tiempo sin perder el valor historico.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfiles (
  id_perfil          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente         INT UNSIGNED NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_perfiles_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente)
) ENGINE = InnoDB;

CREATE INDEX ix_perfiles_cliente ON perfiles (id_cliente);

-- ---------------------------------------------------------------------
-- Historial de tarifa por perfil: cada fila es un periodo de vigencia
-- (fecha_hasta NULL = vigente). Al cambiar la tarifa se cierra la fila
-- vigente y se abre una nueva, nunca se pisa el valor anterior.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfiles_tarifas (
  id_perfil_tarifa   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_perfil          INT UNSIGNED  NOT NULL,
  tarifa             DECIMAL(10,2) NOT NULL,
  id_moneda          INT UNSIGNED  NOT NULL,
  fecha_desde        DATE          NOT NULL,
  fecha_hasta        DATE          NULL,
  creado_por         VARCHAR(150)  NOT NULL,
  fecha_creacion     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150)  NULL,
  fecha_modificacion DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_perfiles_tarifas_perfil FOREIGN KEY (id_perfil) REFERENCES perfiles (id_perfil),
  CONSTRAINT fk_perfiles_tarifas_moneda FOREIGN KEY (id_moneda) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_perfiles_tarifas_perfil_vigencia ON perfiles_tarifas (id_perfil, fecha_desde);

-- ---------------------------------------------------------------------
-- Historial de que perfil tuvo cada talento en cada proyecto (misma
-- logica de vigencia que perfiles_tarifas). Vive aparte de
-- usuarios_proyectos.id_pais_calendario porque ese campo no necesita
-- historial (el calendario no afecta calculos retroactivos de costo).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_proyectos_perfiles (
  id_usuario_proyecto_perfil INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario_proyecto INT UNSIGNED NOT NULL,
  id_perfil            INT UNSIGNED NOT NULL,
  fecha_desde          DATE         NOT NULL,
  fecha_hasta          DATE         NULL,
  creado_por           VARCHAR(150) NOT NULL,
  fecha_creacion       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por       VARCHAR(150) NULL,
  fecha_modificacion   DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_upp_usuario_proyecto FOREIGN KEY (id_usuario_proyecto) REFERENCES usuarios_proyectos (id_usuario_proyecto),
  CONSTRAINT fk_upp_perfil FOREIGN KEY (id_perfil) REFERENCES perfiles (id_perfil)
) ENGINE = InnoDB;

CREATE INDEX ix_upp_usuario_proyecto_vigencia ON usuarios_proyectos_perfiles (id_usuario_proyecto, fecha_desde);
