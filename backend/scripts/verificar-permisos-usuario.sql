-- Script para verificar permisos de un usuario y solucionarlo si es necesario
-- Ejecutar en la base de datos de Render

-- 1. Ver información del usuario actual
SELECT 
    u.id as usuario_id,
    u.nombre as usuario_nombre,
    u.email,
    u.es_superusuario,
    r.id as rol_id,
    r.nombre as rol_nombre,
    r.es_superusuario as rol_es_superusuario,
    u.empresa_id,
    e.nombre as empresa_nombre
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
LEFT JOIN empresas e ON u.empresa_id = e.id
WHERE u.email = 'dianamillie@montiscloud.com'; -- Cambiar por el email del usuario

-- 2. Ver cuántos permisos tiene asignados el rol del usuario
SELECT 
    r.nombre as rol_nombre,
    COUNT(pr.permiso_id) as total_permisos
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
LEFT JOIN permisos_rol pr ON pr.rol_id = r.id AND pr.empresa_id = u.empresa_id
WHERE u.email = 'dianamillie@montiscloud.com' -- Cambiar por el email del usuario
GROUP BY r.nombre;

-- 3. Si el conteo de permisos es 0, asignar todos los permisos al rol Administrador
-- SOLO EJECUTAR ESTE BLOQUE SI EL PASO 2 MUESTRA 0 PERMISOS:

INSERT INTO permisos_rol (rol_id, permiso_id, empresa_id)
SELECT 
    u.rol_id,
    p.id as permiso_id,
    u.empresa_id
FROM usuarios u
CROSS JOIN permisos p
WHERE u.email = 'dianamillie@montiscloud.com' -- Cambiar por el email del usuario
AND NOT EXISTS (
    SELECT 1 
    FROM permisos_rol pr 
    WHERE pr.rol_id = u.rol_id 
    AND pr.empresa_id = u.empresa_id
    AND pr.permiso_id = p.id
);

-- 4. Verificar permisos asignados después de la inserción
SELECT 
    p.clave,
    p.nombre as permiso_nombre
FROM usuarios u
INNER JOIN permisos_rol pr ON pr.rol_id = u.rol_id AND pr.empresa_id = u.empresa_id
INNER JOIN permisos p ON p.id = pr.permiso_id
WHERE u.email = 'dianamillie@montiscloud.com' -- Cambiar por el email del usuario
ORDER BY p.clave;
