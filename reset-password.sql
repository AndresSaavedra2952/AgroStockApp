-- Script SQL para resetear contraseña directamente en la base de datos
-- IMPORTANTE: Esto guardará la contraseña en texto plano temporalmente
-- El sistema la convertirá automáticamente a hash en el próximo login

-- Opción 1: Resetear a texto plano (el sistema lo convertirá a hash automáticamente)
UPDATE usuarios 
SET password = 'nueva123456' 
WHERE email = 'tu-email@ejemplo.com';

-- Opción 2: Si quieres ver qué usuarios tienes
SELECT id_usuario, nombre, email, LENGTH(password) as password_length, rol 
FROM usuarios;

-- Opción 3: Ver el hash actual (primeros 50 caracteres)
SELECT id_usuario, nombre, email, LEFT(password, 50) as hash_preview, LENGTH(password) as hash_length
FROM usuarios;

-- NOTA: Después de ejecutar el UPDATE, intenta hacer login con:
-- Email: tu-email@ejemplo.com
-- Password: nueva123456
-- El sistema detectará que está en texto plano y lo convertirá automáticamente a hash









