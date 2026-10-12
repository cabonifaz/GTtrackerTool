-- =====================================================================
-- Alta de usuarios por invitacion: el Admin crea al usuario y lo
-- autoasigna a un proyecto de inmediato (con un password_hash aleatorio
-- e inutilizable), y genera un link de un solo uso. La persona invitada
-- abre el link (pagina publica, sin sesion) y solo configura su propia
-- clave -- recien ahi el usuario queda realmente usable.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_INVITACION', 'PENDIENTE', 'Pendiente', NULL, 1, 'SYSTEM'),
  ('ESTADO_INVITACION', 'ACEPTADA', 'Aceptada', NULL, 2, 'SYSTEM'),
  ('ESTADO_INVITACION', 'REVOCADA', 'Revocada', NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Nunca se borra: reenviar/revocar solo cambian el token/estado de la
-- misma fila, para conservar el historial de cuando se creo y cuando se
-- acepto.
CREATE TABLE IF NOT EXISTS invitaciones (
  id_invitacion      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  id_proyecto        INT UNSIGNED NULL,
  token              VARCHAR(64)  NOT NULL,
  id_estado          INT UNSIGNED NOT NULL,
  fecha_expiracion   DATETIME     NOT NULL,
  fecha_aceptacion   DATETIME     NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_invitaciones_token UNIQUE (token),
  CONSTRAINT fk_invitaciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_invitaciones_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto),
  CONSTRAINT fk_invitaciones_estado FOREIGN KEY (id_estado) REFERENCES maestro (id_maestro)
) ENGINE = InnoDB;

CREATE INDEX ix_invitaciones_usuario ON invitaciones (id_usuario);
CREATE INDEX ix_invitaciones_estado ON invitaciones (id_estado);
