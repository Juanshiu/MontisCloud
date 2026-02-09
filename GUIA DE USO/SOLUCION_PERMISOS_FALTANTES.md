# 🆘 Guía de Emergencia - Solución de Permisos Faltantes

## Problema
Después de iniciar sesión, no aparecen las opciones de navegación en el header del sistema (Comandas, Caja, Reportes, etc.). Esto ocurre cuando el usuario no tiene permisos asignados en la base de datos.

## Causa Raíz
El sistema obtiene los permisos de la tabla `permisos_rol`, y si esta tabla no tiene registros para tu rol/empresa, el arreglo de permisos está vacío. Sin permisos, ninguna vista se muestra en el menú.

## Solución Rápida - Desde la Consola del Navegador

### Paso 1: Verificar el Problema
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Pega este código y presiona Enter:

```javascript
// Importar el servicio API
import('https://sistema-de-comandas-casa-montis.onrender.com/_next/static/chunks/app/page.js').then(() => {
  // Verificar permisos actuales
  fetch('/api/emergency/check-permisos', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('📊 Estado de Permisos:', data);
    if (data.requiere_fix) {
      console.warn('⚠️ El usuario NO tiene permisos asignados');
      console.log('👉 Ejecuta fixPermisos() para solucionarlo');
    } else {
      console.log('✅ El usuario ya tiene permisos asignados:', data.total_permisos);
    }
  });
});
```

### Paso 2: Aplicar la Solución
Si el paso anterior muestra `requiere_fix: true`, ejecuta esto:

```javascript
// Asignar todos los permisos al rol del usuario
fetch('/api/emergency/fix-permisos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Resultado:', data);
  console.log(`✅ Asignados ${data.permisos_asignados} permisos`);
  console.log('🔄 Recarga la página para ver los cambios');
});
```

### Paso 3: Recargar
Después de aplicar el fix, simplemente **recarga la página (F5)** y deberías ver las opciones de navegación en el header.

---

## Método Alternativo - Usando API Service (Más Limpio)

Si prefieres usar el servicio API del frontend:

### 1. Abrir la consola (F12) y ejecutar:

```javascript
// Verificar estado
window.__apiService = await import('/src/services/api.ts').then(m => m.default);
const estado = await window.__apiService.checkPermisos();
console.log('Estado de permisos:', estado);
```

### 2. Si `requiere_fix: true`, ejecutar:

```javascript
// Aplicar fix
const resultado = await window.__apiService.fixPermisos();
console.log('✅ Fix aplicado:', resultado);
console.log('🔄 Recarga la página (F5)');
```

### 3. Recargar la página

---

## Solución Backend - Ejecutar SQL en Render

Si prefieres usar SQL directamente en la base de datos de Render:

1. Ve al Dashboard de Render
2. Selecciona tu servicio PostgreSQL
3. Haz clic en "Connect" → "External Connection" (o usa la Shell interna)
4. Ejecuta este SQL (reemplaza el email por el tuyo):

```sql
-- Ver información del usuario
SELECT 
    u.nombre, u.email, r.nombre as rol,
    COUNT(pr.permiso_id) as total_permisos
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
LEFT JOIN permisos_rol pr ON pr.rol_id = r.id AND pr.empresa_id = u.empresa_id
WHERE u.email = 'dianamillie@montiscloud.com'
GROUP BY u.nombre, u.email, r.nombre;

-- Si sale 0 permisos, ejecutar esto:
INSERT INTO permisos_rol (rol_id, permiso_id, empresa_id)
SELECT 
    u.rol_id, p.id, u.empresa_id
FROM usuarios u
CROSS JOIN permisos p
WHERE u.email = 'dianamillie@montiscloud.com'
AND NOT EXISTS (
    SELECT 1 FROM permisos_rol pr 
    WHERE pr.rol_id = u.rol_id 
    AND pr.empresa_id = u.empresa_id
    AND pr.permiso_id = p.id
);
```

---

## ¿Por Qué Pasó Esto?

Cuando se crea una nueva empresa mediante onboarding, el sistema:
1. Crea un rol "SuperAdmin" con `es_superusuario: true`
2. Asigna **TODOS** los permisos a ese rol
3. Crea el usuario admin con ese rol

Sin embargo, si:
- El usuario se creó manualmente sin asignar permisos
- Hubo un error durante el onboarding
- La empresa se migró desde otro sistema

Entonces la tabla `permisos_rol` puede quedar vacía para ese rol/empresa, causando que el menú no aparezca.

---

## Prevención Futura

Para evitar este problema en el futuro, se puede:

1. **Opción 1**: Modificar el AuthContext para detectar automáticamente cuando un usuario es "Administrador" y darle permisos TEMPORALES en memoria hasta que se solucione en BD

2. **Opción 2**: Crear un script de migración que asigne permisos por defecto a todos los roles existentes que no tengan ninguno

3. **Opción 3**: Modificar el onboardingService para ser más robusto y hacer rollback completo si alguna parte falla

---

## ¿Necesitas Ayuda?

Si después de seguir estos pasos sigues sin ver el menú, verifica:

1. **Token válido**: En la consola, ejecuta `console.log(localStorage.getItem('token'))` y verifica que haya un token
2. **Permisos asignados**: Ejecuta `checkPermisos()` nuevamente y verifica que `total_permisos > 0`
3. **Cache del navegador**: Intenta en ventana incógnita o limpia el cache (Ctrl+Shift+Del)
4. **Logs del backend**: Revisa los logs de Render para ver si hay errores al obtener permisos

---

## Deployment

Después de hacer commit y push de estos cambios:

```bash
git add .
git commit -m "fix: agregar endpoints de emergencia para permisos faltantes"
git push origin master
```

Render auto-desplegará el backend y el frontend. Una vez desplegado, podrás usar los endpoints `/api/emergency/check-permisos` y `/api/emergency/fix-permisos`.

---

**Última actualización**: 09/02/2026
**Versión**: 1.0
