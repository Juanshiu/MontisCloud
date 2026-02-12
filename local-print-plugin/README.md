# 🖨️ Plugin de Impresión Local - Montis Cloud

Plugin ejecutable para detectar e imprimir en impresoras térmicas locales desde el sistema en la nube.

> Nuevo (SaaS / Render): además del servidor local `server.py`, existe un **agente de impresión remota** `printer_agent.py` que hace polling al backend (`/api/print/*`) y **no requiere abrir puertos**. Ver guía completa en `docs/print_workflow.md`.

**Versión:** 2.0.0  
**Tecnología:** Python 3.x + Flask + PyInstaller  
**Puerto:** 8001  
**Plataforma:** Windows 7+  
**Tamaño ejecutable:** ~13 MB

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Desarrollo](#-instalación-y-desarrollo)
- [Compilación a .exe](#-compilación-a-exe)
- [API - Endpoints](#-api---endpoints)
- [Distribución al Cliente](#-distribución-al-cliente)
- [Comandos ESC/POS](#-comandos-escpos)
- [Troubleshooting](#-troubleshooting)
- [Migración desde Node.js](#-migración-desde-nodejs)

---

## 🎯 Características

- ✅ **Ejecutable standalone (.exe)** - No requiere Python instalado
- ✅ **Detección automática** de impresoras instaladas en Windows
- ✅ **Impresión directa** en impresoras térmicas (ESC/POS)
- ✅ **Servidor HTTP local** en puerto 8001
- ✅ **CORS habilitado** para comunicación desde la nube
- ✅ **Sin ventana de consola** - Se ejecuta en segundo plano
- ✅ **Fácil de distribuir** - Un solo archivo de ~13 MB
- ✅ **Scripts automatizados** para compilación y pruebas

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│         Sistema Montis Cloud (Nube)             │
│      Frontend: React + Next.js                  │
└───────────────────┬─────────────────────────────┘
                    │ HTTP (CORS)
                    │ localhost:8001
┌───────────────────▼─────────────────────────────┐
│    Plugin de Impresión Local (Este proyecto)   │
│         Python + Flask + PyInstaller            │
│                                                  │
│  Endpoints:                                      │
│    GET  /status        - Estado del servicio    │
│    GET  /impresoras    - Lista de impresoras    │
│    POST /imprimir      - Enviar impresión       │
│    POST /probar        - Prueba de impresión    │
└───────────────────┬─────────────────────────────┘
                    │ PowerShell Commands
                    │ copy /b
┌───────────────────▼─────────────────────────────┐
│      Windows Printer Spooler Service            │
│         (Impresoras compartidas)                │
└───────────────────┬─────────────────────────────┘
                    │ USB / Red
┌───────────────────▼─────────────────────────────┐
│         Impresora Térmica (POS)                 │
│           ESC/POS Compatible                     │
└─────────────────────────────────────────────────┘
```

**Flujo de datos:**
1. El frontend envía una solicitud HTTP al plugin local
2. El plugin ejecuta comandos PowerShell para listar/acceder impresoras
3. Convierte texto a buffer con encoding CP850 + comandos ESC/POS
4. Envía a la impresora usando `copy /b` (Windows print spooler)
5. La impresora recibe los bytes raw y ejecuta los comandos

---

## 📦 Estructura del Proyecto

```
local-print-plugin/
│
├── 🐍 server.py                    # Servidor Flask principal
├── 📋 requirements.txt             # Dependencias Python
├── 🔨 build_exe.py                 # Script de compilación
├── 🧪 test_plugin.py               # Tests automatizados
│
├── 🚀 INICIAR_PLUGIN.bat          # Desarrollo: Iniciar servidor
├── 🔧 COMPILAR_A_EXE.bat          # Desarrollo: Compilar .exe
├── ✅ PROBAR_PLUGIN.bat           # Desarrollo: Ejecutar tests
├── 🧹 LIMPIAR_LEGACY.bat          # Limpieza de archivos Node.js
│
├── 📦 dist/
│   └── CasaMontis-PrintPlugin.exe # Ejecutable final (producción)
│
├── 🏗️ build/                      # Temporal (PyInstaller)
├── 📄 CasaMontis-PrintPlugin.spec # Especificación PyInstaller
│
├── 📖 README.md                    # Esta documentación
└── 🔧 .gitignore                   # Configuración Git
```

---

## 💻 Instalación y Desarrollo

### Requisitos
- Python 3.8 o superior
- Windows 7 o superior
- Impresora térmica instalada y compartida

### 1. Instalar Dependencias

```bash
# Navegar a la carpeta del plugin
cd local-print-plugin

# Instalar dependencias
pip install -r requirements.txt
```

**Dependencias (`requirements.txt`):**
```
Flask==3.0.0           # Framework web
Flask-CORS==4.0.0      # Manejo de CORS
pyinstaller==6.3.0     # Compilador a .exe
requests==2.31.0       # Cliente HTTP (para tests)
```

### 2. Ejecutar en Modo Desarrollo

**Opción A: Script automatizado**
```bash
INICIAR_PLUGIN.bat
```

**Opción B: Manualmente**
```bash
python server.py
```

El servidor iniciará en `http://localhost:8001`

**Salida esperada:**
```
============================================================
🖨️  Plugin de Impresión Montis Cloud v2.0.0
============================================================
Puerto: 8001
Sistema: Windows
Endpoints disponibles:
  - http://localhost:8001/status
  - http://localhost:8001/impresoras
  - http://localhost:8001/imprimir
============================================================
Presione Ctrl+C para detener el servicio
============================================================
```

### 3. Probar el Plugin

**Opción A: Script de tests automatizado**
```bash
PROBAR_PLUGIN.bat
```

Este script:
- Verifica que el plugin esté corriendo
- Lista las impresoras disponibles
- Permite enviar una impresión de prueba

**Opción B: Manual con navegador**
```bash
# Abrir en el navegador:
http://localhost:8001/status
http://localhost:8001/impresoras
```

---

## 🔨 Compilación a .exe

### Método Automático (Recomendado)

```bash
# Hacer doble clic en:
COMPILAR_A_EXE.bat
```

**Opciones:**
- `[1] PRODUCCIÓN` - Sin consola (para el cliente) ✅ Recomendado
- `[2] DEBUG` - Con consola (para desarrollo/debugging)

### Método Manual

```bash
# Instalar PyInstaller
pip install pyinstaller

# Compilar en modo producción (sin consola)
python build_exe.py

# O compilar en modo debug (con consola)
python build_exe.py debug
```

### Resultado

El ejecutable se generará en:
```
dist\CasaMontis-PrintPlugin.exe  (~13 MB)
```

### Parámetros de Compilación

El script `build_exe.py` usa estos parámetros de PyInstaller:

```python
PyInstaller.__main__.run([
    'server.py',                         # Archivo principal
    '--name=CasaMontis-PrintPlugin',     # Nombre del ejecutable
    '--onefile',                         # Un solo archivo
    '--noconsole',                       # Sin ventana (producción)
    '--clean',                           # Limpiar caché
    '--hidden-import=flask',             # Incluir Flask
    '--hidden-import=flask_cors',        # Incluir Flask-CORS
    '--noupx',                           # Sin compresión UPX
    '--noconfirm',                       # No pedir confirmación
])
```

**Tiempo de compilación:** ~30-60 segundos

---

## 📡 API - Endpoints

### 1. Estado del Servicio

```http
GET /status
```

**Descripción:** Verifica que el plugin esté activo y funcionando.

**Respuesta exitosa:**
```json
{
  "success": true,
  "servicio": "Plugin de Impresión Montis Cloud",
  "version": "2.0.0",
  "puerto": 8001,
  "sistema": "Windows",
  "activo": true,
  "timestamp": "2026-02-02T08:00:00.000000"
}
```

**Uso desde JavaScript:**
```javascript
const response = await fetch('http://localhost:8001/status');
const data = await response.json();
if (data.success) {
  console.log('Plugin conectado');
}
```

---

### 2. Listar Impresoras

```http
GET /impresoras
```

**Descripción:** Obtiene la lista de impresoras instaladas en Windows.

**Respuesta exitosa:**
```json
{
  "success": true,
  "impresoras": [
    "Microsoft Print to PDF",
    "OneNote (Desktop)",
    "Impresora Térmica POS",
    "HP LaserJet"
  ],
  "total": 4
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "error": "Descripción del error"
}
```

**Uso desde JavaScript:**
```javascript
const response = await fetch('http://localhost:8001/impresoras');
const data = await response.json();
console.log('Impresoras encontradas:', data.impresoras);
```

**Nota:** Usa PowerShell internamente:
```powershell
Get-Printer | Select-Object Name | ConvertTo-Json
```

---

### 3. Imprimir

```http
POST /imprimir
Content-Type: application/json
```

**Descripción:** Envía texto a una impresora térmica con comandos ESC/POS.

**Payload:**
```json
{
  "texto": "Contenido a imprimir\nLínea 2\nLínea 3",
  "impresora": "Impresora Térmica POS",
  "cortar": true,
  "encoding": "cp850"
}
```

**Parámetros:**
- `texto` (string, requerido): Contenido a imprimir
- `impresora` (string, requerido): Nombre exacto de la impresora
- `cortar` (boolean, opcional): Cortar papel al finalizar (default: `true`)
- `encoding` (string, opcional): Codificación de caracteres (default: `cp850`)

**Encodings soportados:**
- `cp850` - Español (recomendado) - Soporta ñ y acentos
- `cp437` - Inglés - Alternativa para caracteres especiales
- `utf-8` - Unicode (puede no funcionar en impresoras antiguas)

**Respuesta exitosa:**
```json
{
  "success": true,
  "mensaje": "Enviado a impresora correctamente"
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "error": "Error al imprimir: La impresora debe estar COMPARTIDA"
}
```

**Uso desde JavaScript:**
```javascript
const response = await fetch('http://localhost:8001/imprimir', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    texto: '================================\n' +
           '    TICKET DE COCINA\n' +
           '================================\n' +
           'Mesa: 5\n' +
           '1x Hamburguesa\n' +
           '2x Coca Cola\n' +
           '================================',
    impresora: 'Impresora Térmica POS',
    cortar: true
  })
});
const data = await response.json();
```

---

### 4. Prueba de Impresión

```http
POST /probar
Content-Type: application/json
```

**Descripción:** Envía un ticket de prueba predefinido.

**Payload:**
```json
{
  "impresora": "Impresora Térmica POS"
}
```

**Respuesta:** Igual que `/imprimir`

**Texto de prueba enviado:**
```
================================
      PRUEBA DE CONEXION
================================
El plugin esta funcionando.
Impresora: [nombre]
Fecha: [timestamp]
================================
```

---

## 📦 Distribución al Cliente

### Archivos a Compartir

**Solo necesitas entregar:**
1. ✅ `dist\CasaMontis-PrintPlugin.exe` (el ejecutable)
2. ✅ Este README.md (opcional pero recomendado)

**NO necesitas compartir:**
- ❌ Código fuente (`server.py`)
- ❌ Scripts de desarrollo (`.bat`)
- ❌ Dependencias (`requirements.txt`)
- ❌ Carpetas `build/` o archivos `.spec`

### Instrucciones para el Cliente

#### 1. Preparar la Impresora (CRÍTICO)

La impresora **DEBE** estar **COMPARTIDA** en Windows:

```
1. Abrir: Panel de Control → Dispositivos e Impresoras
2. Clic derecho en la impresora térmica → Propiedades
3. Ir a la pestaña "Compartir"
4. Activar: "Compartir esta impresora"
5. Asignar un nombre simple (ej: "ImpresoraCocina")
6. Aplicar y Aceptar
```

**⚠️ Sin este paso, el plugin detectará la impresora pero NO podrá imprimir.**

#### 2. Ejecutar el Plugin

1. Hacer doble clic en `CasaMontis-PrintPlugin.exe`
2. Si Windows Defender muestra advertencia:
   - Clic en "Más información"
   - Clic en "Ejecutar de todas formas"
3. El plugin se ejecutará en segundo plano (sin ventana)

**Verificar que está corriendo:**
- Buscar el proceso en el Administrador de tareas
- O abrir: http://localhost:8001/status en el navegador

#### 3. Configurar en el Sistema Web

1. Abrir el sistema Montis Cloud en el navegador
2. Ir a: `Administración` → `Gestión de Facturación`
3. Verificar que aparezca "Plugin Conectado" (verde)
4. Seleccionar la impresora de la lista desplegable
5. Hacer clic en **"Probar"** para verificar

#### 4. Iniciar Automáticamente con Windows (Opcional)

Para que el plugin inicie automáticamente al encender Windows:

1. Presionar `Win + R`
2. Escribir: `shell:startup`
3. Copiar un acceso directo del .exe a esa carpeta

O crear un servicio de Windows (avanzado).

---

## 🎨 Comandos ESC/POS

El plugin envía comandos ESC/POS estándar a la impresora térmica:

### Comandos Implementados

```python
ESC_INIT = bytes([0x1B, 0x40])        # ESC @ - Inicializar impresora
ESC_CODEPAGE = bytes([0x1B, 0x74, 0x02])  # ESC t 2 - CP850 (español)
GS_CUT = bytes([0x1D, 0x56, 0x00])    # GS V 0 - Cortar papel
```

### Secuencia de Impresión

```
1. ESC @ (0x1B 0x40)          → Resetear impresora
2. ESC t 2 (0x1B 0x74 0x02)   → Activar página de códigos CP850
3. [Texto convertido a bytes]  → Contenido en encoding CP850
4. \n\n\n\n                    → 4 saltos de línea (feed)
5. GS V 0 (0x1D 0x56 0x00)    → Cortar papel (si cortar=true)
```

### Otros Comandos ESC/POS (No implementados actualmente)

Puedes extender `server.py` para agregar:

```python
# Negrita
ESC_BOLD_ON = bytes([0x1B, 0x45, 0x01])
ESC_BOLD_OFF = bytes([0x1B, 0x45, 0x00])

# Tamaño de texto
GS_DOUBLE_WIDTH = bytes([0x1D, 0x21, 0x10])
GS_DOUBLE_HEIGHT = bytes([0x1D, 0x21, 0x01])
GS_DOUBLE_BOTH = bytes([0x1D, 0x21, 0x11])
GS_NORMAL = bytes([0x1D, 0x21, 0x00])

# Alineación
ESC_ALIGN_LEFT = bytes([0x1B, 0x61, 0x00])
ESC_ALIGN_CENTER = bytes([0x1B, 0x61, 0x01])
ESC_ALIGN_RIGHT = bytes([0x1B, 0x61, 0x02])

# Código de barras
GS_BARCODE = bytes([0x1D, 0x6B, ...])
```

---

## 🐛 Troubleshooting

### Plugin No Detectado

**Síntoma:** El frontend dice "Plugin No Detectado" (rojo)

**Soluciones:**
1. Verificar que el .exe esté corriendo (Administrador de tareas)
2. Reiniciar el .exe
3. Verificar que el puerto 8001 esté disponible:
   ```powershell
   netstat -ano | findstr :8001
   ```
4. Ejecutar el .exe como Administrador (clic derecho)
5. Verificar firewall de Windows

---

### No Detecta Impresoras

**Síntoma:** La lista de impresoras está vacía

**Soluciones:**
1. Abrir: `Panel de Control` → `Dispositivos e Impresoras`
2. Verificar que la impresora aparece en la lista de Windows
3. Instalar drivers de la impresora
4. Reiniciar el servicio de cola de impresión:
   ```powershell
   services.msc → Cola de impresión → Reiniciar
   ```
5. Ejecutar el .exe como Administrador

---

### Error al Imprimir

**Síntoma:** "Error al imprimir: ..." o la impresora no imprime

**Causas más comunes:**

#### ❌ La impresora NO está compartida
**Solución:** Ir a Propiedades → Compartir → Activar "Compartir esta impresora"

#### ❌ Nombre de impresora incorrecto
**Solución:** Usar el nombre EXACTO (sensible a mayúsculas) de la lista

#### ❌ Impresora apagada o desconectada
**Solución:** Verificar cable USB y encendido

#### ❌ Cola de impresión atascada
**Solución:**
```
1. Abrir: Panel de Control → Dispositivos e Impresoras
2. Clic derecho → Ver cola de impresión
3. Cancelar todos los trabajos
4. Reiniciar servicio: services.msc → Cola de impresión
```

#### ❌ Encoding incorrecto
**Solución:** Probar con diferentes encodings:
```javascript
{ encoding: 'cp850' }  // Default (español)
{ encoding: 'cp437' }  // Alternativa
{ encoding: 'utf-8' }  // Moderno
```

---

### Windows Defender Bloquea el .exe

**Síntoma:** Windows muestra "Windows protegió tu PC"

**Solución:**
1. Clic en "Más información"
2. Clic en "Ejecutar de todas formas"

**Para evitarlo en producción:**
- Firmar digitalmente el ejecutable con certificado
- Agregar excepción en Windows Defender
- Distribuir el ejecutable desde dominio confiable

---

### El .exe se Cierra Solo

**Síntoma:** El proceso inicia pero se cierra inmediatamente

**Soluciones:**
1. Compilar en modo DEBUG para ver errores:
   ```bash
   python build_exe.py debug
   ```
2. Ejecutar el .exe desde CMD para ver errores:
   ```cmd
   CasaMontis-PrintPlugin.exe
   ```
3. Verificar que el puerto 8001 no esté en uso
4. Ejecutar como Administrador

---

## 🔄 Migración desde Node.js

### Historia del Proyecto

Este plugin originalmente estaba desarrollado en Node.js (`server.js`). Se migró a Python por las siguientes razones:

| Aspecto | Node.js | Python + .exe |
|---------|---------|---------------|
| **Instalación** | Requiere Node.js + npm | ❌ Ninguna |
| **Tamaño** | ~200 MB (node_modules) | ✅ 13 MB |
| **Distribución** | Compleja (múltiples archivos) | ✅ Un solo .exe |
| **Facilidad** | Terminal + comandos | ✅ Doble clic |
| **Cliente** | Conocimiento técnico | ✅ Usuario básico |

### Archivos Legacy de Node.js

Si aún tienes archivos de Node.js en la carpeta, puedes eliminarlos:

**Archivos a eliminar:**
- `node_modules/` (~200 MB)
- `package-lock.json`
- `package.json`
- `run.bat`

**Opcional - Mantener como backup:**
- `server.js` (renombrar a `server.js.backup`)

**Script de limpieza automática:**
```bash
LIMPIAR_LEGACY.bat
```

### Compatibilidad

La versión Python mantiene **100% compatibilidad** con la API de Node.js:
- Mismos endpoints
- Mismas respuestas JSON
- Mismo puerto (8001)
- Sin cambios en el frontend

---

## 📚 Código Fuente Explicado

### `server.py` - Servidor Principal

```python
def obtener_impresoras():
    """
    Usa PowerShell para obtener lista de impresoras instaladas
    Comando: Get-Printer | Select-Object Name | ConvertTo-Json
    """

def imprimir_texto_raw(texto, impresora, cortar=True, encoding='cp850'):
    """
    1. Construye buffer con comandos ESC/POS
    2. Convierte texto a bytes con encoding especificado
    3. Guarda en archivo temporal .bin
    4. Ejecuta: copy /b archivo.bin \\localhost\Impresora
    5. Limpia archivo temporal
    """

@app.route('/status', methods=['GET'])
def status():
    """Endpoint de estado - Siempre devuelve success=true"""

@app.route('/impresoras', methods=['GET'])
def listar_impresoras():
    """Lista impresoras llamando a obtener_impresoras()"""

@app.route('/imprimir', methods=['POST'])
def imprimir():
    """
    Recibe JSON con texto e impresora
    Valida parámetros requeridos
    Llama a imprimir_texto_raw()
    """

def main():
    """Inicia servidor Flask en 0.0.0.0:8001"""
```

### `build_exe.py` - Script de Compilación

```python
def compilar(con_consola=False):
    """
    Llama a PyInstaller con parámetros configurados
    Genera ejecutable en dist/
    Modo producción (sin consola) o debug (con consola)
    """
```

### `test_plugin.py` - Tests Automatizados

```python
def test_status():
    """Prueba GET /status"""

def test_impresoras():
    """Prueba GET /impresoras y retorna lista"""

def test_imprimir(impresora):
    """Prueba POST /imprimir con impresora seleccionada"""
```

---

## 🎯 Mejoras Futuras (Roadmap)

### Funcionalidades Pendientes

- [ ] Agregar soporte para imágenes/logos (ESC/POS)
- [ ] Implementar negrita, subrayado, tamaños de fuente
- [ ] Soporte para códigos de barras y QR
- [ ] Configuración de puerto personalizado
- [ ] Interfaz gráfica (GUI) para configuración
- [ ] Instalador profesional (.msi)
- [ ] Firma digital del ejecutable
- [ ] Logs de impresión (historial)
- [ ] Reintentos automáticos en caso de error
- [ ] Notificaciones de Windows (toast)

### Instalador Profesional

Crear un instalador usando:
- **Inno Setup** (gratuito, recomendado)
- **NSIS** (Nullsoft Scriptable Install System)
- **WiX Toolset** (Windows Installer XML)

### Firma Digital

Para evitar advertencias de Windows Defender:
```bash
# Requiere certificado de firma de código
signtool sign /f certificado.pfx /p password CasaMontis-PrintPlugin.exe
```

### Ícono Personalizado

```python
# En build_exe.py, cambiar:
'--icon=NONE'
# Por:
'--icon=casa_montis_icon.ico'
```

---

## 📄 Licencia

Uso exclusivo para **Montis Cloud - Sistema de Comandas**.

---

## 📞 Soporte Técnico

**Proyecto:** Sistema de Comandas Montis Cloud  
**Plugin:** Impresión Local v2.0.0  
**Tecnología:** Python 3.14 + Flask 3.0 + PyInstaller 6.18  
**Puerto:** 8001  
**Plataforma:** Windows 7+

---

## 🎉 Conclusión

El plugin de impresión local permite que el sistema Montis Cloud (en la nube) imprima directamente en impresoras térmicas locales sin necesidad de drivers especiales o configuraciones complejas.

**Ventajas clave:**
- ✅ Fácil de instalar (doble clic)
- ✅ Fácil de distribuir (un solo archivo)
- ✅ No requiere conocimientos técnicos
- ✅ Compatible con cualquier impresora térmica ESC/POS
- ✅ Se ejecuta en segundo plano
- ✅ Actualizaciones simples (reemplazar .exe)

**Estado:** ✅ Listo para producción

---

**Última actualización:** 2 de febrero de 2026  
**Autor:** Sistema de Comandas Montis Cloud
