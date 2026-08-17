-- =====================================================================
-- Suscripciones a push notifications (Web Push API). Cada dispositivo/
-- navegador donde un usuario active notificaciones genera su propia
-- fila (mismo usuario puede tener varias, ej. celular + laptop).
-- =====================================================================
USE trackerTime;

CREATE TABLE IF NOT EXISTS push_suscripciones (
  id_push_suscripcion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_usuario         INT UNSIGNED NOT NULL,
  endpoint           VARCHAR(500) NOT NULL,
  p256dh             VARCHAR(255) NOT NULL,
  auth               VARCHAR(255) NOT NULL,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_push_suscripciones_endpoint UNIQUE (endpoint),
  CONSTRAINT fk_push_suscripciones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE = InnoDB;

CREATE INDEX ix_push_suscripciones_usuario ON push_suscripciones (id_usuario);
