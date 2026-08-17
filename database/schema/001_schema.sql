-- =====================================================================
-- Clonclokify - Esquema de base de datos (MySQL 8)
-- Convenciones:
--   * Toda la logica de negocio vive en Stored Procedures (database/procedures).
--   * Todas las tablas tienen columnas de auditoria estandar.
--   * `maestro` es la unica tabla de catalogo generica del sistema.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS trackerTime
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE trackerTime;

-- ---------------------------------------------------------------------
-- Tabla maestro de maestros: catalogo generico para todas las listas
-- de valores del sistema (roles, estados, etc.), discriminado por
-- tipo_maestro.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maestro (
  id_maestro        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo_maestro       VARCHAR(50)  NOT NULL,
  codigo             VARCHAR(50)  NOT NULL,
  valor              VARCHAR(150) NOT NULL,
  descripcion        VARCHAR(255) NULL,
  orden              INT          NOT NULL DEFAULT 0,
  id_padre           INT UNSIGNED NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_maestro_padre FOREIGN KEY (id_padre) REFERENCES maestro (id_maestro),
  CONSTRAINT uq_maestro_tipo_codigo UNIQUE (tipo_maestro, codigo)
) ENGINE = InnoDB;

CREATE INDEX ix_maestro_tipo ON maestro (tipo_maestro);

-- ---------------------------------------------------------------------
-- Usuarios humanos (Admin / Talento)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombres            VARCHAR(100) NOT NULL,
  apellidos          VARCHAR(100) NOT NULL,
  email              VARCHAR(150) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,
  id_rol             INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_usuarios_email UNIQUE (email),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Usuarios de sistema (cuentas de servicio para acceso via API)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id_usuario_sistema INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_sistema     VARCHAR(150) NOT NULL,
  api_key            VARCHAR(64)  NOT NULL,
  api_secret_hash    VARCHAR(255) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_usuarios_sistema_api_key UNIQUE (api_key)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(150) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Proyectos (opcionalmente asociados a un cliente)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proyectos (
  id_proyecto        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente         INT UNSIGNED NULL,
  nombre             VARCHAR(150) NOT NULL,
  descripcion        VARCHAR(255) NULL,
  id_estado          INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_proyectos_cliente FOREIGN KEY (id_cliente) REFERENCES clientes (id_cliente),
  CONSTRAINT fk_proyectos_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Tareas (creadas manualmente, bajo un proyecto)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tareas (
  id_tarea           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_proyecto        INT UNSIGNED NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  descripcion        VARCHAR(255) NULL,
  id_estado          INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_tareas_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto),
  CONSTRAINT fk_tareas_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Registros de tiempo (entradas del cronometro)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_tiempo (
  id_registro        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_tarea           INT UNSIGNED NOT NULL,
  fecha_inicio       DATETIME     NOT NULL,
  fecha_fin          DATETIME     NULL,
  duracion_segundos  INT UNSIGNED NULL,
  descripcion        VARCHAR(255) NULL,
  id_estado          INT UNSIGNED NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT fk_registros_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_registros_tarea FOREIGN KEY (id_tarea) REFERENCES tareas (id_tarea),
  CONSTRAINT fk_registros_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_registros_usuario_fecha ON registros_tiempo (id_usuario, fecha_inicio);
CREATE INDEX ix_registros_tarea ON registros_tiempo (id_tarea);
