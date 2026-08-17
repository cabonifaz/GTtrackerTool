-- =====================================================================
-- Chronos - Seed inicial de catalogo (tabla maestro) y usuario Admin
-- =====================================================================

USE trackerTime;

-- Roles de usuario
INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ROL', 'ADMIN',   'Administrador', 'Gestiona usuarios, proyectos, tareas y reportes', 1, 'SYSTEM'),
  ('ROL', 'TALENTO', 'Talento',       'Registra tiempo trabajado en tareas asignadas',    2, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Estados de proyecto
INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_PROYECTO', 'ACTIVO',    'Activo',    NULL, 1, 'SYSTEM'),
  ('ESTADO_PROYECTO', 'PAUSADO',   'Pausado',   NULL, 2, 'SYSTEM'),
  ('ESTADO_PROYECTO', 'CERRADO',   'Cerrado',   NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Estados de tarea
INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_TAREA', 'PENDIENTE',   'Pendiente',   NULL, 1, 'SYSTEM'),
  ('ESTADO_TAREA', 'EN_PROGRESO', 'En progreso', NULL, 2, 'SYSTEM'),
  ('ESTADO_TAREA', 'FINALIZADA',  'Finalizada',  NULL, 3, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Estados de registro de tiempo (cronometro)
INSERT INTO maestro (tipo_maestro, codigo, valor, descripcion, orden, creado_por)
VALUES
  ('ESTADO_REGISTRO_TIEMPO', 'EN_CURSO', 'En curso', NULL, 1, 'SYSTEM'),
  ('ESTADO_REGISTRO_TIEMPO', 'DETENIDO', 'Detenido', NULL, 2, 'SYSTEM')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Usuario Admin inicial (password: Admin#2026 -- cambiar tras primer login)
-- Hash bcrypt generado con costo 10 para la contrasena "Admin#2026"
INSERT INTO usuarios (nombres, apellidos, email, password_hash, id_rol, creado_por)
SELECT 'Admin', 'Clonclokify', 'admin@clonclokify.local',
       '$2b$10$Vq85Pnf39eEw4vMYqkRqK.c9J8W0GAasl/TjXRFw9wSlgD6lgv0IS',
       (SELECT id_maestro FROM maestro WHERE tipo_maestro = 'ROL' AND codigo = 'ADMIN'),
       'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@clonclokify.local');
