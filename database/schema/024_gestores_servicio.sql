-- =====================================================================
-- Rol "Gestor de Servicio": como un Admin, pero con visibilidad y
-- permisos acotados a uno o mas clientes designados (no a toda la
-- empresa). Un cliente puede tener varios gestores, y un gestor varios
-- clientes -- tabla N:M `clientes_gestores`.
-- =====================================================================
USE trackerTime;

INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ROL', 'GESTOR_SERVICIO', 'Gestor de Servicio', 'Como Admin, pero solo para sus clientes asignados', 2, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

CREATE TABLE IF NOT EXISTS clientes_gestores (
  id_cliente_gestor  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_cliente         INT UNSIGNED NOT NULL,
  id_usuario         INT UNSIGNED NOT NULL,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por         VARCHAR(150) NOT NULL,
  fecha_creacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modificado_por     VARCHAR(150) NULL,
  fecha_modificacion DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_clientes_gestores UNIQUE (id_cliente, id_usuario),
  CONSTRAINT fk_clientes_gestores_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  CONSTRAINT fk_clientes_gestores_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
) ENGINE = InnoDB;
