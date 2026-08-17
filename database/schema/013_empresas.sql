-- =====================================================================
-- Conversion a multi-tenant: tabla `empresas` (tenants) + columna
-- `id_empresa` directa en las tablas "raiz" que hoy no cuelgan de nada
-- mas (usuarios, clientes, proyectos, usuarios_sistema). El resto de
-- tablas hereda el tenant via JOIN a su padre (tareas -> proyecto,
-- registros_tiempo -> usuario, perfiles -> cliente, etc.) y no gana
-- columna nueva. `maestro` y `feriados` se quedan globales.
--
-- Los datos existentes se migran a una empresa nueva "Geeky Tech" antes
-- de dejar las columnas listas para produccion.
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS empresas (
  id_empresa         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre             VARCHAR(150) NOT NULL,
  slug               VARCHAR(50)  NOT NULL,
  logo               LONGBLOB     NULL,
  logo_tipo          VARCHAR(100) NULL,
  color_primario     VARCHAR(7)   NOT NULL DEFAULT '#111827',
  color_secundario   VARCHAR(7)   NOT NULL DEFAULT '#374151',
  suspendida         TINYINT(1)   NOT NULL DEFAULT 0,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_empresas_slug UNIQUE (slug),
  CONSTRAINT ck_empresas_slug CHECK (slug REGEXP '^[a-z0-9-]+$')
) ENGINE = InnoDB;

-- Rol Super Admin (por encima de Admin/Talento, sin empresa propia)
INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ROL', 'SUPER_ADMIN', 'Super Admin', 'Administra empresas (tenants) y sus usuarios Admin', 0, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Columnas de tenant directas
ALTER TABLE usuarios
  ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_usuario;

ALTER TABLE clientes
  ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_cliente;

ALTER TABLE proyectos
  ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_proyecto;

ALTER TABLE usuarios_sistema
  ADD COLUMN id_empresa INT UNSIGNED NULL AFTER id_usuario_sistema;

-- Migracion de datos existentes a la empresa "Geeky Tech"
INSERT INTO empresas (nombre, slug, color_primario, color_secundario, suspendida, creado_por)
VALUES ('Geeky Tech', 'geeky-tech', '#111827', '#374151', 0, 'SYSTEM')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

UPDATE usuarios
  SET id_empresa = (SELECT id_empresa FROM empresas WHERE slug = 'geeky-tech')
  WHERE id_empresa IS NULL;

UPDATE clientes
  SET id_empresa = (SELECT id_empresa FROM empresas WHERE slug = 'geeky-tech')
  WHERE id_empresa IS NULL;

UPDATE proyectos
  SET id_empresa = (SELECT id_empresa FROM empresas WHERE slug = 'geeky-tech')
  WHERE id_empresa IS NULL;

UPDATE usuarios_sistema
  SET id_empresa = (SELECT id_empresa FROM empresas WHERE slug = 'geeky-tech')
  WHERE id_empresa IS NULL;

-- clientes/proyectos/usuarios_sistema siempre pertenecen a una empresa.
-- usuarios se queda nullable: NULL es el marcador de cuenta Super Admin.
ALTER TABLE clientes MODIFY COLUMN id_empresa INT UNSIGNED NOT NULL;
ALTER TABLE proyectos MODIFY COLUMN id_empresa INT UNSIGNED NOT NULL;
ALTER TABLE usuarios_sistema MODIFY COLUMN id_empresa INT UNSIGNED NOT NULL;

-- Usuario Super Admin inicial (password: SuperAdmin#2026 -- cambiar tras
-- primer login desde /api/usuarios/cambiar-password). Sin id_empresa: es
-- el marcador de cuenta Super Admin.
INSERT INTO usuarios (nombres, apellidos, email, password_hash, debe_cambiar_password, id_rol, id_empresa, creado_por)
SELECT 'Super', 'Admin', 'superadmin@clonclokify.local',
       '$2b$10$MfR86Ld28YyDYBQoiu6aPeFbs5jE4UcoiA0Mb.O9lrZ6xV0aqw9Bi',
       0,
       (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'ROL' AND codigo = 'SUPER_ADMIN'),
       NULL,
       'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'superadmin@clonclokify.local');

ALTER TABLE usuarios
  ADD CONSTRAINT fk_usuarios_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa);
ALTER TABLE clientes
  ADD CONSTRAINT fk_clientes_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa);
ALTER TABLE proyectos
  ADD CONSTRAINT fk_proyectos_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa);
ALTER TABLE usuarios_sistema
  ADD CONSTRAINT fk_usuarios_sistema_empresa FOREIGN KEY (id_empresa) REFERENCES empresas (id_empresa);

CREATE INDEX ix_usuarios_empresa ON usuarios (id_empresa);
CREATE INDEX ix_clientes_empresa ON clientes (id_empresa);
CREATE INDEX ix_proyectos_empresa ON proyectos (id_empresa);
