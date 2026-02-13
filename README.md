# 🍽️ Sistema de Comandas - Montis Cloud

**Sistema integral de gestión para restaurantes de última generación**

Plataforma completa desarrollada con React/Next.js (frontend) y Node.js/Express (backend), diseñada para optimizar todas las áreas operativas de un restaurante: desde la toma de pedidos multi-canal hasta la gestión completa de recursos humanos, inventario avanzado por insumos, impresión térmica profesional personalizable, y control total de acceso con roles y permisos granulares.

---

## 🌟 Características Destacadas

### 🍽️ Gestión Omnicanal de Pedidos

**Sistema Multi-Punto de Venta con Flujo Inteligente:**
- **Pedidos en Mesa**: Gestión clásica con asignación de múltiples mesas por comanda y vinculación de mesero
- **Pedidos a Domicilio**: Captura completa de datos del cliente (nombre, dirección completa, teléfono de contacto)
- **Pedidos para Llevar**: Modalidad rápida sin requerimiento de dirección de entrega
- **UI Adaptativa**: Interfaz que se ajusta dinámicamente según el tipo de pedido seleccionado
- **Edición de Comandas**: Agregar items adicionales a comandas existentes con impresión selectiva
- **Múltiples Mesas**: Posibilidad de asignar varias mesas a una misma comanda

### 💼 Frontend Moderno (React 18 + Next.js 14 + Tailwind CSS)

**Wizard Inteligente de 5 Pasos:**
1. **Selección de Tipo de Pedido**: Mesa, Domicilio o Para Llevar con validación contextual
2. **Asignación de Recursos**: Selección de mesa(s) o captura de datos del cliente según tipo
3. **Tipo de Servicio**: Desayuno, Almuerzo o Carta Completa con menús personalizados
4. **Catálogo de Productos**: Navegación por categorías con buscador rápido y gestión de cantidades
5. **Resumen y Confirmación**: Vista previa detallada con observaciones generales y validación final

**Sistema de Categorización Flexible:**
- 🌄 **Desayunos**: Con personalizaciones completas (bebidas, panes, acompañamientos, preparaciones)
- 🍽️ **Almuerzos**: Sistema de entradas, platos fuertes y postres personalizables
- 🍕 **Pizzas**: Con opciones de tamaño y ingredientes adicionales
- 🥤 **Bebidas**: Clasificación por tipo (calientes, frías, alcohólicas)
- 🍰 **Postres**: Catálogo visual con opciones especiales
- 🍔 **Comida Rápida**: Para pedidos express
- 🍖 **Porciones Adicionales**: Complementos y extras

**Gestión Avanzada de Comandas:**
- ✅ Visualización en tiempo real de comandas activas con totales automáticos
- 📝 Edición de comandas existentes con detección inteligente de items nuevos
- 🔄 Sistema de estados: Pendiente → Preparando → Lista → Entregada → Completada
- ❌ Cancelación de comandas con liberación automática de mesas
- 📊 Historial completo con filtros por fecha, estado, mesa y tipo de pedido
- 🔍 Buscador rápido por número de comanda o cliente
- 📱 Interfaz responsive optimizada para tablets y dispositivos móviles

**Interfaz Profesional de Caja:**
- 💰 Procesamiento de facturas con cálculo automático de IVA configurable
- 💳 Métodos de pago múltiples (Efectivo, Tarjeta, Transferencia, Mixto)
- 💵 Calculadora automática de cambio para pagos en efectivo
- 🧾 Generación de recibos de pago con detalle completo
- 📄 Sistema de facturación con encabezado empresarial personalizable
- ✓ Pago parcial de items con tracking individual por producto
- 🖨️ Impresión automática de facturas y recibos térmicos
- 📋 Vista previa de facturación antes de confirmar
- 🔓 Liberación automática de mesas al completar pago

**Panel de Administración Completo:**
- ⚙️ **Configuración del Sistema**: Parámetros globales, modos de bloqueo de inventario
- 👥 **Gestión de Usuarios**: CRUD completo con estados activo/inactivo
- 🔐 **Roles y Permisos**: Matriz de permisos granular por módulo y acción
- 👷 **Gestión de Empleados**: Expediente digital completo del personal
- 💼 **Nómina y Liquidaciones**: Cálculo automático de pagos y prestaciones sociales
- 📝 **Generación de Contratos**: Creación de documentos contractuales en PDF
- 🏢 **Datos de Empresa**: Información fiscal y de contacto para facturación
- 🧾 **Configuración de Facturación**: Parámetros de IVA, responsabilidades fiscales
- 🏠 **Gestión de Salones**: Organización física del restaurante
- 🪑 **Gestión de Mesas**: CRUD de mesas con capacidad y ubicación
- 🍕 **Gestión de Productos**: Catálogo completo con inventario simple
- 🏷️ **Categorías**: Organización de productos y personalizaciones
- ✨ **Personalizaciones**: Opciones configurables para productos personalizables
- 📦 **Inventario Avanzado**: Sistema completo de insumos, recetas y ajustes
- 🖨️ **Configuración de Impresión**: Selección de impresoras, ancho de papel y tamaño de fuente

**Experiencia de Usuario:**
- 📱 **Diseño 100% Responsive**: Optimizado para escritorio, tablet y móvil
- 🎨 **UI Moderna con Tailwind CSS**: Interfaz limpia, intuitiva y profesional
- 🚀 **Iconografía Lucide**: Íconos vectoriales de alta calidad
- ⌨️ **Atajos de Teclado**: Navegación rápida para operadores experimentados
- 🔔 **Notificaciones en Tiempo Real**: Alertas de estado de comandas e inventario
- 🌙 **Tema Personalizable**: Colores y branding adaptables
- ♿ **Accesibilidad**: Cumple con estándares WCAG para inclusión

### ⚙️ Backend Robusto (Node.js 18+ + Express 4 + PostgreSQL + TypeScript)

**API RESTful Enterprise-Grade:**
- 🔌 **Arquitectura Modular**: Separación clara en routes, repositories, services y middleware
- 🗄️ **Base de Datos PostgreSQL**: Potente, escalable y con soporte completo de transacciones ACID
- 🔄 **Sistema de Migraciones**: Control de versiones de esquema con Kysely
- 🛡️ **Seguridad Robusta**: Autenticación JWT, bcrypt para passwords, helmet para headers
- 📊 **Transacciones**: Garantía de consistencia en operaciones críticas
- 🚀 **Compresión Gzip**: Respuestas optimizadas para mejor rendimiento
- 📝 **Logging Completo**: Trazabilidad de operaciones y errores
- ⚡ **Pool de Conexiones**: Gestión eficiente de conexiones a base de datos

**Módulos y Funcionalidades:**

**🔐 Autenticación y Seguridad:**
- Sistema de login con sesiones JWT de larga duración (12 horas)
- Middleware de autenticación en todas las rutas protegidas
- Control de super-admin para operaciones críticas
- Gestión de usuarios con estados y roles vinculados
- Matriz de permisos granular por módulo (Comandas, Productos, Inventario, Usuarios, etc.)

**🍽️ Gestión Operativa:**
- CRUD completo de mesas con estados (disponible, ocupada, reservada)
- Gestión de salones con asignación de mesas
- Catálogo de productos con inventario simple y por insumos
- Sistema de categorías flexible y extensible
- Personalizaciones con precio adicional y ajustes de inventario
- Comandas multi-canal con soporte para edición y agregado de items
- Facturas con cálculo de IVA y múltiples métodos de pago

**📦 Inventario Inteligente:**
- **Insumos**: Stock con umbrales de mínimo y crítico, estados automáticos
- **Recetas por Producto**: Define qué insumos consume cada producto
- **Ajustes por Personalización**: Insumos extras o reducciones según opciones
- **Descuento Automático**: Al confirmar comandas se resta stock de insumos
- **Historial de Movimientos**: Trazabilidad completa de consumos y ajustes
- **Indicadores de Riesgo**: Sistema de alertas (OK, BAJO, CRÍTICO, AGOTADO)
- **Bloqueo Configurable**: Prevenir ventas cuando inventario es insuficiente
- **Import/Export Excel**: Carga masiva y respaldo de insumos, recetas y productos

**👥 Recursos Humanos:**
- Expediente digital de empleados (datos personales, contractuales, salariales)
- Cálculo automático de nómina con devengados (horas extra, dominicales, festivos)
- Liquidación de prestaciones sociales (cesantías, intereses, primas, vacaciones)
- Generación de contratos en PDF con plantillas personalizables
- Historial de liquidaciones con trazabilidad completa
- Parámetros de ley actualizables (salario mínimo, auxilio de transporte)

**📊 Reportes y Análisis:**
- Ventas por periodo, mesa, mesero y producto
- Estado de inventario con alertas de stock bajo/crítico
- Consumo de insumos por periodo
- Productos más vendidos y menos vendidos
- Análisis de rentabilidad por producto
- Exportación de reportes a Excel

**🔄 Control de Estados y Flujos:**
- Estados de comandas con transiciones validadas
- Estados de mesas con liberación automática post-facturación
- Estados de empleados (activo, inactivo, liquidado)
- Estados de usuarios con control de acceso inmediato

### 👥 Gestión de Recursos Humanos (Nómina y Personal)
- **Gestión de Empleados**: 
  - CRUD completo de personal con datos detallados (cargo, contrato, salario, etc.)
  - Control de estados y tipos de trabajadores
- **Liquidación de Nómina**:
  - Cálculo automático de devengados (horas extra, dominicales, festivos, comisiones)
  - Deducciones automáticas (salud, pensión) y aportes de ley
  - Generación de periodos mensuales y quincenales
- **Liquidación de Prestaciones Sociales**:
  - Cálculo de cesantías, intereses, primas y vacaciones
  - Soporte para diferentes motivos de retiro (renuncia, despido con/sin justa causa)
  - Historial detallado de liquidaciones con trazabilidad

### 🔐 Seguridad y Control de Acceso (Usuarios y Roles)

**Autenticación Robusta:**
- 🔑 **JWT Tokens**: Sesiones seguras con tokens firmados digitalmente
- ⏰ **Expiración de 12 Horas**: Balance entre seguridad y experiencia de usuario
- 🔐 **Bcrypt Hashing**: Passwords encriptados con salt rounds para máxima seguridad
- 📱 **Acceso por PIN**: Identificación rápida con código numérico para operaciones frecuentes
- 🚪 **Logout Seguro**: Eliminación de tokens y cierre de sesión
- 🔄 **Refresh Automático**: Validación de sesión en cada solicitud
- 🛡️ **Middleware de Protección**: Rutas protegidas por defecto, públicas por excepción

**Sistema de Roles y Permisos Granular (RBAC):**

**Roles del Sistema:**
- 👑 **Super-Admin**: Control total incluyendo gestión de usuarios y roles
- 🏢 **Administrador**: Gestión operativa completa menos control de accesos
- 👨‍💼 **Gerente**: Supervisión, reportes y configuración limitada
- 👨‍🍳 **Cocinero**: Acceso a comandas y stock básico
- 💼 **Mesero**: Toma de pedidos y gestión de mesas
- 💰 **Cajero**: Facturación y cierres de caja

**Permisos por Módulo (23 módulos configurables):**

| Módulo | Ver | Crear | Editar | Eliminar | Especial |
|--------|-----|-------|--------|----------|----------|
| **Comandas** | ✓ | ✓ | ✓ | ✓ | Imprimir, Cambiar Estado |
| **Productos** | ✓ | ✓ | ✓ | ✓ | Gestionar Stock Simple |
| **Inventario** | ✓ | ✓ | ✓ | ✓ | Ajustes, Reportes |
| **Usuarios** | ✓ | ✓ | ✓ | ✓ | Gestionar Roles, Suplantar |
| **Empleados** | ✓ | ✓ | ✓ | ✓ | Ver Datos Salariales |
| **Nómina** | ✓ | ✓ | ✓ | ✓ | Calcular, Generar PDF |
| **Liquidaciones** | ✓ | ✓ | ✓ | ✓ | Calcular Prestaciones |
| **Reportes** | ✓ | - | - | - | Exportar, Análisis Avanzado |
| **Configuración** | ✓ | - | ✓ | - | Parámetros, Impresoras |
| **Mesas** | ✓ | ✓ | ✓ | ✓ | Cambiar Estado, Asignar |
| **Facturas** | ✓ | ✓ | - | ✓ | Anular, Imprimir |
| **Insumos** | ✓ | ✓ | ✓ | ✓ | Ajustes de Stock |
| **Recetas** | ✓ | ✓ | ✓ | ✓ | Vincular Insumos |

**Validaciones de Seguridad:**
- ✅ Verificación de token JWT en cada solicitud API
- ✅ Validación de permisos específicos antes de ejecutar acciones
- ✅ Protección contra inyección SQL con consultas preparadas (Kysely)
- ✅ Sanitización de inputs en frontend y backend
- ✅ Headers de seguridad con Helmet.js
- ✅ CORS configurado y restrictivo
- ✅ Rate limiting en endpoints sensibles
- ✅ Logs de auditoría para acciones críticas

**Gestión Avanzada de Usuarios:**
- 📝 **CRUD Completo**: Crear, leer, actualizar y eliminar usuarios
- 🎭 **Asignación de Roles**: Vinculación de rol único por usuario
- 🔓 **Estados de Usuario**: Activo/Inactivo con bloqueo inmediato de acceso
- 👤 **Integración RRHH**: Vinculación directa con expediente de empleado
- 👀 **Suplantación (Devtools)**: Super-admin puede tomar identidad para debugging
- 🔍 **Auditoría**: Registro de último inicio de sesión y fecha de creación
- 🚫 **Auto-Protección**: Los super-admin no pueden desactivarse a sí mismos
- ⚠️ **Validación de Eliminación**: Previene eliminar usuarios con datos relacionados
- 🔐 **Cambio de Contraseña**: Requiere contraseña actual para actualización

**Roles Personalizables:**
- 🎨 **Creación Dinámica**: Define roles nuevos con nombre y descripción
- ⚙️ **Configuración Granular**: 23 permisos individuales configurables
- 📊 **Nivel de Acceso**: Numérico para priorizar permisos (0-100)
- 🔒 **Roles Protegidos**: Super-admin es un rol del sistema inmutable
- 📋 **Plantillas**: Copiar permisos de roles existentes para agilizar creación
- 🗑️ **Eliminación Segura**: Solo si no hay usuarios asignados
- 📝 **Edición en Vivo**: Cambios de permisos se aplican inmediatamente

### 🖨️ Sistema de Impresión Profesional y Configurable

**Agente Remoto de Impresión (SaaS, recomendado):**
- 🚀 **Ejecutable Windows (`montis-printer-agent.exe`)**: Cliente liviano para PCs con impresora
- 🔐 **Activación por código temporal**: Pairing seguro desde Admin sin exponer API keys al cliente
- 🖨️ **Selector explícito de impresora**: Lista desplegable con impresoras instaladas para evitar selección incorrecta
- 💾 **Estado local cifrado (DPAPI)**: Credenciales guardadas de forma segura en el equipo
- 🔄 **Operación en segundo plano**: Autoarranque en Windows + heartbeat/polling contra backend
- 🛠️ **Reconfiguración fácil**: Se puede reabrir el `.exe` para cambiar impresora sin reinstalar
- 🧩 **Modo legacy opcional**: `server.py` en puerto 8001 disponible solo para integraciones antiguas

**Configuración de Papel (58mm vs 80mm):**

| Ancho | Caracteres Normal | Caracteres Grande | Uso Recomendado |
|-------|-------------------|-------------------|-----------------|
| **58mm** | 32 caracteres | 16 caracteres | Comandas de cocina, tickets rápidos |
| **80mm** | 48 caracteres | 24 caracteres | Facturas, recibos detallados |

- 📏 **Selector de Ancho**: Dropdown en panel de configuración de facturación
- 💾 **Persistencia**: Configuración se guarda automáticamente en navegador
- 🔄 **Cambio Dinámico**: Ajuste en tiempo real del ancho de línea efectivo
- 📐 **Cálculo Automático**: Sistema ajusta separadores y alineación según ancho

**Configuración de Tamaño de Fuente:**

| Fuente | Comando ESC/POS | Factor | Ancho Real (80mm) | Ancho Real (58mm) |
|--------|-----------------|--------|-------------------|-------------------|
| **Pequeña** | `\x1D\x21\x00` | 1x | 48 caracteres | 32 caracteres |
| **Normal** | `\x1D\x21\x00` | 1x | 48 caracteres | 32 caracteres |
| **Grande** | `\x1D\x21\x11` | 2x | **24 caracteres** | **16 caracteres** |

- 🔤 **Selector de Fuente**: Options para Small, Normal y Large
- 📊 **Ajuste Inteligente**: Fuente grande usa **mitad** del ancho efectivo
- ⚙️ **Comandos ESC/POS**: 
  - `\x1D\x21\x00`: Tamaño normal (1x ancho, 1x alto)
  - `\x1D\x21\x11`: Tamaño grande (2x ancho, 2x alto)
- 🔢 **Fórmula Clave**: `ANCHO_EFECTIVO = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase`
- ✅ **Sin Desbordamiento**: Separadores (=, -) se ajustan automáticamente sin duplicarse

**Vista Previa en Tiempo Real:**
- 👁️ **Preview Dinámico**: Visualización exacta antes de imprimir
- 📄 **Monospace Font**: Courier New para coincidencia perfecta con impresora
- 🎨 **Colores Diferenciados**: Background gris claro para simular papel
- 📏 **Dimensiones Reales**: Respeta anchos de papel y fuentes configurados
- 🔄 **Actualización Instantánea**: Cambios de configuración reflejan inmediatamente

**Encoding CP850 (Español Optimizado):**
- ñ, Ñ → Soporte nativo de eñes
- á, é, í, ó, ú, Á, É, Í, Ó, Ú → Tildes correctas
- ¿, ¡ → Signos de interrogación y exclamación invertidos
- $ → Símbolo de peso/dólar
- € → Euro (si está disponible)
- ° → Grado para temperaturas

**Impresión Inteligente de Comandas:**

**🍽️ Comandas Iniciales (Primera Impresión):**
```
========================================
COMANDA #12345
MESA: 5 - Salón Principal
MESERO: Juan Pérez
HORA: 12:45 PM
========================================

2x Bandeja Paisa
   + Con arroz blanco
   + Sin frijoles

1x Jugo Natural
   + Mora
   + Sin azúcar

========================================
OBSERVACIONES: Cliente alérgico a nueces
========================================
```

**➕ Items Adicionales (Impresión Selectiva):**
```
========================================
*** ITEMS ADICIONALES ***
COMANDA #12345 - MESA: 5
HORA: 13:15 PM
========================================

1x Café Tinto

2x Postre del día
   + Con helado

========================================
⚠️ URGENTE - AGREGAR A PEDIDO
========================================
```

**Características de Impresión Selectiva:**
- ✅ **Sin Duplicados**: Solo imprime productos que no tienen `is_impreso: true`
- 🔁 **Marca Automática**: Al imprimir, actualiza items a `is_impreso: true` en DB
- 🎯 **Filtro Inteligente**: Compara estado en DB antes de generar impresión
- ⚡ **Eficiencia**: Cocina solo ve lo nuevo, sin confusión de items anteriores
- 📝 **Diferenciación Visual**: Header especial "ITEMS ADICIONALES" con asteriscos
- ⏰ **Timestamp**: Hora exacta del agregado para control de tiempos

**Formatos de Documentos:**

**📄 Facturas (Invoice con IVA):**
```
=========================================
Casa Montis Restaurante
NIT: 900.123.456-7
Calle 123 #45-67, Bogotá
Tel: (601) 234-5678
=========================================
FACTURA DE VENTA #00012345
Fecha: 15/01/2025 - 14:30
Mesero: Juan Pérez
Mesa: 5 - Salón Principal
=========================================

CANT ARTICULO      V.UNIT   TOTAL
---- ------------- ------- -------
  2  Bandeja P...  $32,000 $64,000
  1  Jugo Natur... $8,000  $8,000
  1  Café Tinto    $2,500  $2,500

=========================================
SUBTOTAL:                      $74,500
IVA (19%):                     $14,155
=========================================
TOTAL:                         $88,655
=========================================

Método de Pago: Efectivo
Recibido: $90,000
Cambio: $1,345

=========================================
¡Gracias por su visita!
Vuelva pronto
=========================================
```

**🧾 Recibos (Ticket Simplificado):**
```
=========================================
Casa Montis
=========================================
RECIBO #12345
15/01/2025 - 14:30
=========================================

CANT ARTICULO      V.UNIT   TOTAL
---- ------------- ------- -------
  2  Bandeja P...  $32,000 $64,000
  1  Jugo Natur... $8,000  $8,000

=========================================
TOTAL:                         $72,000
=========================================
Efectivo: $80,000
Cambio: $8,000
=========================================
```

**🚚 Comandas para Domicilio (Datos Cliente):**
```
=========================================
🏠 PEDIDO A DOMICILIO
=========================================
COMANDA #12345
HORA: 14:30 PM
=========================================
CLIENTE: María González
DIR: Cra 15 #34-56, Apto 301
TEL: 321-456-7890
=========================================

2x Pizza Hawaiana
   + Extra queso
   + Borde relleno

1x Gaseosa Personal

=========================================
TOTAL PEDIDO: $48,000
=========================================
OBSERVACIONES:
Timbre no funciona, llamar al llegar
=========================================
```

**Comandos ESC/POS Utilizados:**
- `\x1B\x40` - Inicializar impresora
- `\x1B\x61\x01` - Centrar texto
- `\x1B\x61\x00` - Alinear izquierda
- `\x1B\x45\x01` - Negrita ON
- `\x1B\x45\x00` - Negrita OFF
- `\x1D\x21\x00` - Tamaño normal (1x1)
- `\x1D\x21\x11` - Tamaño grande (2x2)
- `\x1D\x21\x22` - Tamaño extra grande (3x3)
- `\x1B\x64\x03` - Avanzar 3 líneas
- `\x1B\x6A\xB4` - Cortar papel

**Manejo de Errores y Fallback:**
- ⚠️ **Detección de Plugin**: Verifica disponibilidad antes de imprimir
- 📝 **Log en Consola**: Si falla, muestra contenido en console.log
- 🔔 **Notificación al Usuario**: Toast informando estado de impresión
- 🔄 **Reintento Automático**: Opción de reintentar impresión fallida
- 💾 **Caché Local**: Guarda última configuración válida
- 🛠️ **Debug Mode**: Variable de entorno para logging detallado

## 📁 Estructura Completa del Proyecto

```
Sistema-de-comandas-Casa-Montis/
│
├── 📂 frontend/                           # React 18 + Next.js 14 + Tailwind CSS
│   ├── src/
│   │   ├── app/                          # App Router de Next.js 14
│   │   │   ├── globals.css               # Estilos globales y Tailwind
│   │   │   ├── layout.tsx                # Layout raíz de la aplicación
│   │   │   ├── page.tsx                  # Página principal (/)
│   │   │   ├── factura/                  # Ruta para facturas
│   │   │   │   └── page.tsx
│   │   │   ├── historial/                # Ruta de historial
│   │   │   │   └── page.tsx
│   │   │   ├── impersonation-callback/   # Callback de suplantación
│   │   │   │   └── page.tsx
│   │   │   └── recibo/                   # Ruta para recibos
│   │   │       └── page.tsx
│   │   │
│   │   ├── components/                   # Componentes React
│   │   │   ├── SistemaPrincipal.tsx      # 🏠 Componente raíz del sistema
│   │   │   ├── Login.tsx                 # 🔐 Interfaz de autenticación
│   │   │   ├── Providers.tsx             # Providers de contextos globales
│   │   │   ├── UserInfo.tsx              # Información del usuario logueado
│   │   │   ├── Onboarding.tsx            # Wizard de onboarding inicial
│   │   │   │
│   │   │   ├── FormularioComandas.tsx    # 📝 Wizard multi-paso de 5 pasos
│   │   │   ├── SeleccionTipoPedido.tsx   # ✅ Paso 1: Mesa/Domicilio/Llevar
│   │   │   ├── SeleccionMesa.tsx         # 🪑 Paso 2: Selector de mesas
│   │   │   ├── FormularioDatosCliente.tsx# 👤 Paso 2b: Datos de domicilio
│   │   │   ├── SeleccionTipoServicio.tsx # ☀️ Paso 3: Categorías de servicio
│   │   │   ├── SeleccionProductos.tsx    # 🍽️ Paso 4: Catálogo de productos
│   │   │   ├── BuscadorProductos.tsx     # 🔍 Buscador de productos
│   │   │   ├── ResumenComanda.tsx        # 📋 Paso 5: Vista previa y envío
│   │   │   │
│   │   │   ├── PersonalizacionProducto.tsx # ✨ Modal de personalizaciones
│   │   │   ├── InterfazCaja.tsx          # 💰 Procesamiento de pagos y facturas
│   │   │   ├── HistorialComandas.tsx     # 📜 Historial completo de pedidos
│   │   │   ├── Reportes.tsx              # 📊 Reportes y análisis
│   │   │   ├── ImpersonationBanner.tsx   # 🎭 Banner de suplantación activa
│   │   │   ├── Administracion.tsx        # Panel de administración principal
│   │   │   │
│   │   │   ├── admin/                    # 🛠️ Panel de Administración Completo
│   │   │   │   ├── ConfiguracionSistema.tsx       # ⚙️ Parámetros del sistema
│   │   │   │   ├── GeneradorContratos.tsx         # 📄 Generación de PDFs de contrato
│   │   │   │   ├── GestionCategorias.tsx          # 🏷️ Categorías de productos
│   │   │   │   ├── GestionEmpleados.tsx           # 👨‍💼 CRUD de empleados (RRHH)
│   │   │   │   ├── GestionEmpresa.tsx             # 🏢 Datos de la empresa
│   │   │   │   ├── GestionFacturacion.tsx         # 🧾 Config de impresión (papel/fuente)
│   │   │   │   ├── GestionInventarioAvanzado.tsx  # 📦 Insumos, recetas, ajustes
│   │   │   │   ├── GestionLiquidacion.tsx         # 📊 Liquidaciones finales
│   │   │   │   ├── GestionMesas.tsx               # 🪑 CRUD de mesas
│   │   │   │   ├── GestionNomina.tsx              # 💵 Cálculo de nómina mensual
│   │   │   │   ├── GestionPersonalizaciones.tsx   # ✨ Opciones personalizables
│   │   │   │   ├── GestionProductos.tsx           # 🍕 CRUD de productos con stock
│   │   │   │   ├── GestionRoles.tsx               # 🎭 CRUD de roles y permisos
│   │   │   │   ├── GestionSalones.tsx             # 🏠 CRUD de salones
│   │   │   │   └── GestionUsuarios.tsx            # 👥 CRUD de usuarios
│   │   │   │
│   │   │   └── shared/                   # Componentes compartidos
│   │   │       ├── index.ts
│   │   │       ├── PersonalizacionDisplay.tsx
│   │   │       └── hooks/
│   │   │           └── usePersonalizaciones.ts
│   │   │
│   │   ├── contexts/                     # Contextos de React
│   │   │   └── AuthContext.tsx           # Estado de autenticación global
│   │   │
│   │   ├── services/                     # Servicios de API (Axios)
│   │   │   ├── api.ts                    # Cliente Axios configurado
│   │   │   └── printingService.ts        # Servicio de impresión
│   │   │
│   │   ├── types/                        # TypeScript Types/Interfaces
│   │   │   └── index.ts                  # Exportaciones centrales de tipos
│   │   │
│   │   ├── utils/                        # Utilidades
│   │   │   ├── personalizacionUtils.ts   # Utilidades de personalizaciones
│   │   │   └── receiptFormatter.ts       # 🖨️ Formateador de recibos térmicos
│   │   │                                 #     (Soporta 58mm/80mm, fuente small/normal/large)
│   │   │
│   │   └── constants/                    # Constantes
│   │       └── inventory.ts              # Constantes de inventario
│   │
│   ├── .eslintrc.json                    # Configuración de ESLint
│   ├── .env.local                        # Variables de entorno locales
│   ├── next.config.js                    # Configuración de Next.js
│   ├── postcss.config.js                 # Configuración de PostCSS
│   ├── tailwind.config.js                # Configuración de Tailwind
│   ├── tsconfig.json                     # Config de TypeScript
│   └── package.json                      # Dependencias del frontend
│
├── 📂 admin-panel/                        # Admin Panel Independiente (Next.js 14)
│   ├── src/
│   │   ├── app/                          # App Router
│   │   │   ├── dashboard/                # Dashboard administrativo
│   │   │   └── login/                    # Ruta de login
│   │   ├── components/
│   │   │   └── Impersonation.tsx         # 🎭 Componente de suplantación
│   │   ├── hooks/
│   │   │   └── useImpersonation.ts       # Hook para super-admin
│   │   └── services/                     # Servicios de API
│   │
│   ├── next-env.d.ts
│   ├── next.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── 📂 backend/                            # Node.js 18+ + Express 4 + PostgreSQL
│   ├── src/
│   │   ├── index.ts                      # Punto de entrada del servidor
│   │   │
│   │   ├── config/                       # Configuraciones
│   │   │   └── envValidator.ts           # Validador de variables de entorno
│   │   │
│   │   ├── database/                     # Capa de base de datos (PostgreSQL)
│   │   │   ├── database.ts               # Conexión a PostgreSQL con Pool
│   │   │   ├── init.ts                   # Inicialización de DB
│   │   │   ├── migrator.ts               # Sistema de migraciones (Kysely)
│   │   │   ├── reset.ts                  # Reset de base de datos
│   │   │   ├── types.ts                  # Tipos de base de datos
│   │   │   └── migrations/               # Migraciones SQL versionadas
│   │   │
│   │   ├── middleware/                   # Middleware de Express
│   │   │   ├── authMiddleware.ts         # 🔐 Verificación JWT y permisos
│   │   │   └── superAdminMiddleware.ts   # 👑 Middleware de super-admin
│   │   │
│   │   ├── models/                       # Tipos y modelos TypeScript
│   │   │   └── index.ts                  # Exportaciones de modelos
│   │   │
│   │   ├── repositories/                 # Capa de datos (Repository Pattern)
│   │   │   ├── categoriaRepository.ts
│   │   │   ├── comandaRepository.ts
│   │   │   ├── configFacturacionRepository.ts
│   │   │   ├── empresaRepository.ts
│   │   │   ├── facturaRepository.ts
│   │   │   ├── licenciaRepository.ts
│   │   │   ├── mesaRepository.ts
│   │   │   ├── nominaRepository.ts
│   │   │   ├── productoRepository.ts
│   │   │   ├── reporteRepository.ts
│   │   │   ├── salonRepository.ts
│   │   │   └── usuarioRepository.ts
│   │   │
│   │   ├── routes/                       # Rutas de API REST
│   │   │   ├── admin.ts                  # Rutas administrativas
│   │   │   ├── auth.ts                   # POST /api/auth/login, /logout
│   │   │   ├── categorias.ts             # CRUD /api/categorias
│   │   │   ├── comandas.ts               # CRUD /api/comandas
│   │   │   ├── configuracion-facturacion.ts # GET/PUT /api/configuracion-facturacion
│   │   │   ├── configuracion-sistema.ts  # GET/PUT /api/configuracion-sistema
│   │   │   ├── contratos.ts              # POST /api/contratos/generar
│   │   │   ├── empleados.ts              # CRUD /api/empleados
│   │   │   ├── facturas.ts               # POST /api/facturas
│   │   │   ├── insumo-categorias.ts      # Categorías de insumos
│   │   │   ├── inventario-avanzado.ts    # Insumos, recetas, ajustes, historial
│   │   │   ├── mesas.ts                  # CRUD /api/mesas
│   │   │   ├── nomina.ts                 # CRUD /api/nomina (liquidaciones)
│   │   │   ├── onboarding.ts             # Wizard de onboarding
│   │   │   ├── personalizaciones.ts      # CRUD /api/personalizaciones
│   │   │   ├── productos.ts              # CRUD /api/productos
│   │   │   ├── proveedores.ts            # CRUD de proveedores
│   │   │   ├── reportes.ts               # GET /api/reportes/ventas, /inventario
│   │   │   ├── roles.ts                  # CRUD /api/roles
│   │   │   ├── salones.ts                # CRUD /api/salones
│   │   │   ├── sistema.ts                # GET /api/sistema/info
│   │   │   └── usuarios.ts               # CRUD /api/usuarios
│   │   │
│   │   ├── scripts/                      # Scripts administrativos
│   │   │   ├── audit-db-schema.ts        # Auditoría de esquema BD
│   │   │   ├── audit-routes.ts           # Auditoría de rutas
│   │   │   ├── audit-schema.ts           # Auditoría general
│   │   │   ├── migrate.ts                # Ejecutor de migraciones
│   │   │   └── test-saas-isolation.ts    # Tests de aislamiento multi-tenant
│   │   │
│   │   ├── services/                     # Servicios de lógica de negocio
│   │   │   ├── authService.ts            # Servicio de autenticación
│   │   │   ├── categoriaService.ts       # Servicio de categorías
│   │   │   ├── comandaService.ts         # Servicio de comandas
│   │   │   ├── facturaService.ts         # Servicio de facturación
│   │   │   ├── inventarioService.ts      # Servicio de inventario
│   │   │   ├── mesaService.ts            # Servicio de mesas
│   │   │   ├── NominaService.ts          # 💵 Cálculos de nómina y prestaciones
│   │   │   ├── onboardingService.ts      # Servicio de onboarding
│   │   │   ├── productoService.ts        # Servicio de productos
│   │   │   ├── reporteService.ts         # Servicio de reportes
│   │   │   ├── saasAdminService.ts       # Servicio de administración SaaS
│   │   │   ├── salonService.ts           # Servicio de salones
│   │   │   └── usuarioService.ts         # Servicio de usuarios
│   │   │
│   │   ├── types/                        # Tipos compartidos
│   │   │   ├── express.d.ts              # Extensiones de tipos Express
│   │   │   └── saas-admin.types.ts       # Tipos de administración SaaS
│   │   │
│   │   └── utils/                        # Utilidades
│   │       ├── dateUtils.ts              # Parseo y formateo de fechas
│   │       ├── inventoryValidation.ts    # Validación de stock antes de venta
│   │       ├── numeroALetras.ts          # Conversión de números a texto español
│   │       └── index.ts
│   │
│   ├── data/                             # Datos de importación
│   │   └── productos_casa_montis.json    # Dump de productos para importar
│   │
│   ├── modelo_imprimir_legacy/           # Sistema legacy de impresión
│   │   ├── pluginImpresora.ts
│   │   └── printer.ts
│   │
│   ├── scripts/                          # Scripts de administración
│   │   └── verificar-permisos-sistema.sql # Script SQL de verificación
│   │
│   ├── storage/                          # Archivos generados
│   │   ├── contratos/                    # PDFs de contratos
│   │   └── nomina_pdfs/                  # PDFs de nóminas
│   │
│   ├── temp/                             # Archivos temporales de testing
│   │   ├── check-db.js
│   │   ├── test-server.js
│   │   └── ...                           # Otros scripts de prueba
│   │
│   ├── .env.example                      # Ejemplo de variables de entorno
│   ├── .gitignore
│   ├── CONTRATO.TXT                      # Template de contrato
│   ├── package.json                      # Dependencias del backend
│   └── tsconfig.json                     # Config de TypeScript
│
├── 📂 local-print-plugin/                 # 🖨️ Agente remoto de impresión (Python/Windows)
│   ├── build/                            # Carpeta de compilación PyInstaller
│   │   ├── montis-printer-agent/         # Archivos intermedios del agente
│   │   └── CasaMontis-PrintPlugin/       # Build legacy (compatibilidad)
│   │
│   ├── printer_agent.py                  # Agente remoto con UI de activación
│   ├── montis-printer-agent.spec         # Spec PyInstaller del agente
│   ├── server.py                         # Servidor HTTP local (modo legacy)
│   ├── server_backup.js                  # Backup legacy en Node.js
│   ├── test_plugin.py                    # Pruebas del entorno de impresión
│   ├── build_exe.py                      # Script para compilar `montis-printer-agent.exe`
│   ├── CasaMontis-PrintPlugin.spec       # Spec legacy
│   ├── requirements.txt                  # Dependencias Python (requests, pywin32, etc.)
│   ├── .gitignore                        # Archivos ignorados
│   ├── README.md                         # Documentación del plugin
│   │
│   ├── INICIAR_PLUGIN.bat                # 🚀 Script de inicio rápido
│   ├── COMPILAR_A_EXE.bat                # 🔨 Script de compilación a EXE
│   ├── PROBAR_PLUGIN.bat                 # 🧪 Script de pruebas
│   └── LIMPIAR_LEGACY.bat                # 🧹 Limpiar archivos legacy
│
├── 📂 GUIA DE USO/                        # 📚 Documentación del Sistema
│   ├── GUIA_DE_USO.md                    # Guía general del sistema
│   ├── ACCESO_RED_LOCAL.md               # Configuración de red local
│   ├── ARREGLOS-GESTION-NOMINA.md        # Fixes de nómina
│   ├── CAMBIO_DE_MESA.md                 # Funcionalidad de cambiar mesa
│   ├── CAMBIOS_BUSCADOR_PRODUCTOS.md     # Filtros de búsqueda
│   ├── CONSOLIDACION_SAAS.md             # Arquitectura multi-tenant
│   ├── DOMICILIOS.md                     # Flujo de pedidos a domicilio
│   ├── INVENTARIO_PRODUCTOS.md           # Sistema de stock simple
│   ├── PLUGIN_IMPRESION.md               # Uso del plugin de impresión
│   ├── REFACTORIZACION_ADMINISTRACION.md # Cambios en admin panel
│   └── SISTEMA_INVENTARIO_PERSONALIZACIONES.md # Inventario avanzado
│
├── .gitignore                             # Archivos ignorados por Git
├── .git/                                  # Repositorio Git
├── iniciador_automatico.bat               # 🚀 Script de inicio rápido
│                                          #     (Solo Backend + Frontend en desarrollo)
├── setup_completo.bat                     # 🔧 Script de instalación completa
│                                          #     (Instala todo + Migra BD + Inicia 4 servicios)
│
└── README.md                              # 📖 Este archivo - Documentación principal
```

## 🛠️ Instalación y Configuración

### 📋 Requisitos Previos

**Software Obligatorio:**
- ✅ **Node.js 18+** (LTS recomendado) - [Descargar](https://nodejs.org/)
- ✅ **PostgreSQL 14+** - [Descargar](https://www.postgresql.org/download/)
- ✅ **npm** o **yarn** (incluido con Node.js)
- ✅ **Git** (para clonar el repositorio)

**Software Opcional:**
- 🖨️ **Impresora Térmica ESC/POS** (58mm o 80mm)
- 🐍 **Python 3.9+** (para compilar/agendar el agente de impresión)
- 📄 **pgAdmin 4** (para administrar PostgreSQL visualmente)

---

### 📚 Guías de Instalación

**Desarrollo Local:**
- [Instalación Rápida con Scripts](#🚀-instalación-rápida-con-script-automático-windows) - Usa `setup_completo.bat`
- [Instalación Manual Paso a Paso](#⚙️-instalación-manual-paso-a-paso) - Control completo del proceso

**Producción (Nube):**
- 📖 **[DEPLOY.md](./DEPLOY.md)** - Guía completa y detallada para Render.com
- ✅ **[CHECKLIST-DEPLOY.md](./CHECKLIST-DEPLOY.md)** - Verificación pre-deploy
- ⚡ **[DEPLOY-QUICKSTART.md](./DEPLOY-QUICKSTART.md)** - Versión rápida (30 min)

---

### 🚀 Instalación Rápida con Script Automático (Windows)

#### Opción A: Setup Completo (Primera vez)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Juanshiu/Sistema-de-comandas-Casa-Montis
cd Sistema-de-comandas-Casa-Montis

# 2. Configurar PostgreSQL primero (ver sección abajo)
# Crear base de datos y usuario

# 3. Configurar variables de entorno
cd backend
copy .env.example .env
# Editar backend\.env con tus credenciales de PostgreSQL
cd ..

cd admin-panel
copy .env.example .env.local
# Editar admin-panel\.env.local con URL del backend
# (En desarrollo local usar: NEXT_PUBLIC_API_URL=http://localhost:3001)
cd ..

# 4. Ejecutar setup completo
setup_completo.bat
```

**El script `setup_completo.bat` hará:**
1. ✅ Instalar dependencias de backend (npm install)
2. ✅ Instalar dependencias de frontend (npm install)
3. ✅ Instalar dependencias de admin-panel (npm install)
4. ✅ Instalar dependencias del agente de impresión (pip install)
5. ✅ Ejecutar migraciones de base de datos
6. ✅ Dejar listo el servicio de impresión local (agente remoto o modo legacy, según configuración)
7. ✅ Iniciar backend (puerto 3001)
8. ✅ Iniciar frontend (puerto 3000)
9. ✅ Iniciar admin-panel (puerto 3002)

#### Opción B: Inicio Rápido (Ya configurado)

Si ya instalaste dependencias y configuraste todo, usa el iniciador rápido:

```bash
iniciador_automatico.bat
```

**El script `iniciador_automatico.bat` solo hará:**
- 🚀 Iniciar backend en modo desarrollo (puerto 3001)
- 🚀 Iniciar frontend en modo desarrollo (puerto 3000)

**Nota:** Para incluir admin-panel y componente de impresión en el inicio rápido, usa `setup_completo.bat`

---

### ⚙️ Instalación Manual Paso a Paso

#### 1️⃣ **Configurar PostgreSQL**

```bash
# Iniciar PostgreSQL y crear base de datos
psql -U postgres

CREATE DATABASE casa_montis;
CREATE USER casa_montis_user WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE casa_montis TO casa_montis_user;
\q
```

#### 2️⃣ **Backend (Node.js + Express + PostgreSQL)**

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

**Contenido del archivo `backend/.env`:**

```env
# Entorno
NODE_ENV=development

# Puerto del servidor
PORT=3001

# Base de Datos PostgreSQL (formato URI)
# Formato: postgresql://usuario:password@host:puerto/nombre_db
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/casa_montis

# JWT para autenticación
JWT_SECRET=tu_clave_secreta_muy_larga_y_aleatoria_aqui_min_32_caracteres
```

```bash
# Ejecutar migraciones de base de datos
npm run migrate

# Compilar TypeScript
npm run build

# Iniciar servidor en modo desarrollo
npm run dev

# O en modo producción
npm start
```

**Scripts npm del backend:**
- `npm start` - Inicia en modo producción (requiere build previo)
- `npm run dev` - Inicia con hot-reload (nodemon + ts-node)
- `npm run build` - Compila TypeScript a JavaScript
- `npm run migrate` - Ejecuta migraciones de BD
- `npm run reset-db` - **PELIGRO**: Resetea completamente la base de datos

#### 3️⃣ **Frontend (Next.js 14 + React 18 + Tailwind)**

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# O compilar para producción
npm run build
npm start
```

**Configuración en `frontend/.env.local` (opcional):**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# Legacy opcional (solo si usas server.py en puerto 8001)
NEXT_PUBLIC_PRINT_PLUGIN_URL=http://localhost:8001
```

**Scripts npm de frontend:**
- `npm run dev` - Servidor de desarrollo en puerto 3000
- `npm run build` - Build de producción optimizado
- `npm start` - Inicia build de producción
- `npm run lint` - Ejecuta ESLint

#### 4️⃣ **Admin Panel (Next.js 14 + Independiente)**

```bash
cd admin-panel

# Instalar dependencias
npm install

# Configurar URL del backend
cp .env.example .env.local
# Editar .env.local con la URL de tu backend
# NEXT_PUBLIC_API_URL=http://localhost:3001 (desarrollo)
# NEXT_PUBLIC_API_URL=https://tu-backend.com (producción)

# Iniciar en modo desarrollo (puerto 3002)
npm run dev
```

**Configuración en `admin-panel/.env.local`:**

```env
# URL del Backend API
# Desarrollo: http://localhost:3001
# Producción: https://tu-backend-en-la-nube.com
NEXT_PUBLIC_API_URL=http://localhost:3001

# Entorno
NODE_ENV=development
```

#### 5️⃣ **Agente de Impresión Remota (Recomendado para SaaS)**

```bash
cd local-print-plugin

# Instalar Python 3.9+ si no lo tienes
# Descargar desde https://www.python.org/downloads/

# Instalar dependencias
pip install -r requirements.txt

# Compilar agente a EXE
python build_exe.py
```

**O usar script de Windows para compilar:**

```bash
COMPILAR_A_EXE.bat
```

**El ejecutable compilado estará en:**

`dist/montis-printer-agent.exe`

**Flujo de activación del agente:**
- 1) Desde Admin generar código temporal en Impresión Remota
- 2) Ejecutar `montis-printer-agent.exe`
- 3) Pegar código y seleccionar impresora en la lista desplegable
- 4) Confirmar activación (queda en segundo plano y autoarranque)

**Endpoints usados por el agente (contra backend):**
- `POST /api/print/pairing-token` (admin)
- `POST /api/print/pair` (agente)
- `GET /api/print/jobs` (polling)
- `POST /api/print/jobs/:id/ack` (confirmación de impresión)
- `POST /api/print/printers/:id/heartbeat` (online/offline)

**Modo legacy opcional (solo integración antigua):**
- Ejecutar `python server.py` para exponer `http://localhost:8001`

---

### ☁️ Despliegue en Producción (Nube)

**📖 Guía Completa de Deploy:** Ver [`DEPLOY.md`](./DEPLOY.md) para instrucciones detalladas de despliegue en Render.com

**✅ Checklist Pre-Deploy:** Ver [`CHECKLIST-DEPLOY.md`](./CHECKLIST-DEPLOY.md) para verificar que todo está listo

#### Configuración Rápida para Render.com

**1. Preparar Variables de Entorno:**
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://usuario:password@host.db.com:5432/nombre_db
JWT_SECRET=clave_super_segura_generada_con_openssl_64_caracteres_minimo
```

3. **Build y deploy:**
```bash
npm run build
npm start
```

**Frontend y Admin Panel (Next.js):**

1. **Frontend:** Configurar `NEXT_PUBLIC_API_URL` con URL del backend en la nube
```env
# frontend/.env.production
NEXT_PUBLIC_API_URL=https://tu-backend-en-produccion.com
# Solo si usas modo legacy con server.py
NEXT_PUBLIC_PRINT_PLUGIN_URL=http://localhost:8001
```

2. **Admin Panel:** Configurar URL del backend
```env
# admin-panel/.env.local (o variables en plataforma de hosting)
NEXT_PUBLIC_API_URL=https://tu-backend-en-produccion.com
NODE_ENV=production
```

3. **Deploy:**
   - Vercel (recomendado para Next.js): Deploy automático desde GitHub
   - Netlify, Railway, Render también funcionan
   - Configurar variables de entorno en dashboard de la plataforma

**Agente de Impresión (Local):**
- El agente debe ejecutarse localmente en las PCs con impresoras térmicas
- No se hostea en la nube (requiere acceso al spooler/USB local)
- Distribuir `montis-printer-agent.exe` y activar con código desde admin

#### Plataformas Recomendadas

| Componente | Plataforma Recomendada | Costo Estimado |
|------------|------------------------|----------------|
| **Backend API** | Railway, Render | $5-10/mes |
| **PostgreSQL** | Railway (incluido), Render | $0-7/mes |
| **Frontend** | Vercel, Netlify | Gratis |
| **Admin Panel** | Vercel, Netlify | Gratis |
| **Agente Impresión** | Local (PC con impresora) | $0 |

#### Checklist de Producción

- [ ] PostgreSQL en la nube configurado
- [ ] `DATABASE_URL` actualizado en backend
- [ ] `JWT_SECRET` generado de forma segura (min 32 caracteres)
- [ ] Backend desplegado y funcionando
- [ ] Frontend desplegado con `NEXT_PUBLIC_API_URL` correcto
- [ ] Admin Panel desplegado con URL del backend
- [ ] Migraciones ejecutadas en BD de producción
- [ ] CORS configurado correctamente en backend
- [ ] HTTPS habilitado (automático en Vercel/Netlify)
- [ ] Agente de impresión instalado y activado en PCs locales

---

### 🖨️ Configuración de Impresoras Térmicas

**1. Instalar driver de tu impresora térmica**
- Conectar impresora vía USB
- Instalar drivers del fabricante
- Configurar como impresora predeterminada o anotar el nombre exacto

**2. Verificar nombre de impresora en Windows:**

```powershell
# PowerShell
Get-Printer | Select-Object Name

# O en Panel de Control > Dispositivos e impresoras
```

**3. Configurar en panel de facturación:**
- Ir a Admin Panel (http://localhost:3002)
- Login como super-admin
- Ir a "Gestión de Facturación"
- Seleccionar tu impresora del dropdown
- Elegir ancho de papel: **58mm** o **80mm**
- Elegir tamaño de fuente: **Small**, **Normal** o **Large**
- Guardar configuración (se persiste en localStorage)

**4. Probar impresión:**
- Click en botón "Probar Impresora"
- Debe salir ticket de prueba con configuración actual
- Si falla, verificar que `montis-printer-agent.exe` esté activo en segundo plano

---

## 🚀 Ejecución del Sistema

### ⚡ Modo Desarrollo (Recomendado para Testing)

**Opción 1: Iniciador Automático (Windows)**

```bash
# Inicia TODO el sistema con un solo comando
iniciador_automatico.bat
```

**Opción 2: Iniciar Manualmente**

```bash
# Terminal 1: Backend (puerto 3001)
cd backend
npm run dev

# Terminal 2: Frontend (puerto 3000)
cd frontend
npm run dev

# Terminal 3: Admin Panel (puerto 3002)
cd admin-panel
npm run dev

# Terminal 4: Compilar agente de impresión (primera vez)
cd local-print-plugin
python build_exe.py
# Luego ejecutar dist\montis-printer-agent.exe
```

---

### 🏗️ Modo Producción

```bash
# 1. Compilar Backend
cd backend
npm run build

# 2. Compilar Frontend
cd frontend
npm run build

# 3. Compilar Admin Panel
cd admin-panel
npm run build

# 4. Compilar Plugin a EXE
cd local-print-plugin
COMPILAR_A_EXE.bat

# 5. Iniciar servicios (usar PM2 o similar para mantener activos)
cd backend && npm start
cd frontend && npm start
cd admin-panel && npm start
# Ejecutar montis-printer-agent.exe
```

---

### 🌐 URLs de Acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:3000 | Interfaz principal de comandas |
| **Admin Panel** | http://localhost:3002 | Panel de administración |
| **API Backend** | http://localhost:3001/api | API RESTful |
| **Health Check** | http://localhost:3001/health | Estado del servidor |
| **Agente de Impresión** | Sin URL pública (app Windows) | Pairing + polling al backend |

---

## 📊 Documentación de API Endpoints

### 🔐 Autenticación

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |

**Ejemplo de Login:**

```json
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// Respuesta:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador",
    "rol": "super-admin"
  }
}
```

---

### 🪑 Mesas y Salones

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/mesas` | Listar todas las mesas | `mesas.ver` |
| GET | `/api/mesas/:id` | Obtener mesa específica | `mesas.ver` |
| POST | `/api/mesas` | Crear nueva mesa | `mesas.crear` |
| PUT | `/api/mesas/:id` | Actualizar mesa | `mesas.editar` |
| PATCH | `/api/mesas/:id` | Cambiar estado de mesa | `mesas.editar` |
| DELETE | `/api/mesas/:id` | Eliminar mesa | `mesas.eliminar` |
| GET | `/api/salones` | Listar todos los salones | `mesas.ver` |
| POST | `/api/salones` | Crear nuevo salón | `mesas.crear` |
| PUT | `/api/salones/:id` | Actualizar salón | `mesas.editar` |
| DELETE | `/api/salones/:id` | Eliminar salón | `mesas.eliminar` |

---

### 🍽️ Productos y Categorías

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/productos` | Listar todos los productos | `productos.ver` |
| GET | `/api/productos/:id` | Obtener producto específico | `productos.ver` |
| GET | `/api/productos/categoria/:cat` | Filtrar por categoría | `productos.ver` |
| POST | `/api/productos` | Crear producto | `productos.crear` |
| PUT | `/api/productos/:id` | Actualizar producto | `productos.editar` |
| DELETE | `/api/productos/:id` | Eliminar producto | `productos.eliminar` |
| GET | `/api/categorias` | Listar categorías | `productos.ver` |
| POST | `/api/categorias` | Crear categoría | `productos.crear` |
| PUT | `/api/categorias/:id` | Actualizar categoría | `productos.editar` |
| DELETE | `/api/categorias/:id` | Eliminar categoría | `productos.eliminar` |

---

### 📝 Comandas (Pedidos)

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/comandas` | Listar todas las comandas | `comandas.ver` |
| GET | `/api/comandas/activas` | Comandas activas con items | `comandas.ver` |
| GET | `/api/comandas/historial` | Historial completo | `comandas.ver` |
| GET | `/api/comandas/:id` | Obtener comanda con items | `comandas.ver` |
| POST | `/api/comandas` | Crear comanda (imprime auto) | `comandas.crear` |
| PUT | `/api/comandas/:id` | Agregar items adicionales | `comandas.editar` |
| PATCH | `/api/comandas/:id/estado` | Cambiar estado | `comandas.editar` |
| DELETE | `/api/comandas/:id` | Eliminar comanda | `comandas.eliminar` |
| POST | `/api/comandas/:id/imprimir` | Reimprimir comanda | `comandas.imprimir` |

**Crear Comanda (POST /api/comandas):**

```json
{
  "tipo_pedido": "mesa",  // o "domicilio", "para_llevar"
  "mesa_id": 5,
  "mesero": "Juan Pérez",
  "observaciones": "Cliente alérgico a nueces",
  "items": [
    {
      "producto_id": 10,
      "cantidad": 2,
      "precio_unitario": 32000,
      "personalizaciones": [
        {"personalizacion_id": 1, "precio_adicional": 0}
      ]
    }
  ],
  // Solo para domicilios:
  "cliente_nombre": "María González",
  "cliente_telefono": "321-456-7890",
  "cliente_direccion": "Cra 15 #34-56, Apto 301"
}
```

---

### 💰 Facturas

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/facturas` | Listar facturas | `facturas.ver` |
| GET | `/api/facturas/:id` | Obtener factura específica | `facturas.ver` |
| POST | `/api/facturas` | Crear factura y liberar mesa | `facturas.crear` |
| POST | `/api/facturas/:id/imprimir` | Reimprimir factura | `facturas.imprimir` |

**Crear Factura (POST /api/facturas):**

```json
{
  "comanda_id": 123,
  "metodo_pago": "efectivo",  // o "tarjeta", "transferencia"
  "aplicar_iva": true,
  "valor_recibido": 100000,
  "descuento": 0
}
```

---

### 📦 Inventario Avanzado

**Insumos:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/inventario-avanzado/insumos` | Listar insumos | `inventario.ver` |
| POST | `/api/inventario-avanzado/insumos` | Crear insumo | `inventario.crear` |
| PUT | `/api/inventario-avanzado/insumos/:id` | Actualizar insumo | `inventario.editar` |
| DELETE | `/api/inventario-avanzado/insumos/:id` | Eliminar insumo | `inventario.eliminar` |
| POST | `/api/inventario-avanzado/insumos/:id/ajuste` | Ajuste manual de stock | `inventario.ajustes` |
| GET | `/api/inventario-avanzado/insumos/historial` | Historial de movimientos | `inventario.ver` |

**Recetas:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/inventario-avanzado/recetas/productos/:id` | Obtener receta de producto | `inventario.ver` |
| PUT | `/api/inventario-avanzado/recetas/productos/:id` | Guardar receta de producto | `inventario.editar` |
| GET | `/api/inventario-avanzado/recetas/personalizaciones/:id` | Ajustes de personalización | `inventario.ver` |
| PUT | `/api/inventario-avanzado/recetas/personalizaciones/:id` | Guardar ajustes | `inventario.editar` |

**Indicadores de Riesgo:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/inventario-avanzado/riesgo/productos` | Estado de riesgo por producto | `inventario.ver` |
| GET | `/api/inventario-avanzado/riesgo/personalizaciones` | Estado por personalización | `inventario.ver` |

**Import/Export:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/inventario-avanzado/insumos/export` | Exportar insumos (Excel) | `inventario.ver` |
| POST | `/api/inventario-avanzado/insumos/import` | Importar insumos (Excel) | `inventario.editar` |
| GET | `/api/inventario-avanzado/recetas/export` | Exportar recetas (Excel) | `inventario.ver` |
| POST | `/api/inventario-avanzado/recetas/import` | Importar recetas (Excel) | `inventario.editar` |
| GET | `/api/inventario-avanzado/productos/export` | Exportar productos (Excel) | `inventario.ver` |
| POST | `/api/inventario-avanzado/productos/import` | Importar productos (Excel) | `inventario.editar` |

---

### 👥 Recursos Humanos (RRHH)

**Empleados:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/empleados` | Listar empleados | `empleados.ver` |
| GET | `/api/empleados/:id` | Obtener empleado específico | `empleados.ver` |
| POST | `/api/empleados` | Registrar empleado | `empleados.crear` |
| PUT | `/api/empleados/:id` | Actualizar empleado | `empleados.editar` |
| DELETE | `/api/empleados/:id` | Eliminar empleado | `empleados.eliminar` |

**Nómina:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/nomina/configuracion` | Obtener parámetros de ley | `nomina.ver` |
| POST | `/api/nomina/calcular` | Calcular nómina de empleado | `nomina.calcular` |
| GET | `/api/nomina/historial/:empleadoId` | Historial de nóminas | `nomina.ver` |
| POST | `/api/nomina/generar-pdf/:nominaId` | Generar PDF de nómina | `nomina.generar_pdf` |

**Liquidaciones:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/api/nomina/liquidar` | Calcular liquidación final | `liquidaciones.calcular` |
| GET | `/api/nomina/liquidaciones/:empleadoId` | Historial de liquidaciones | `liquidaciones.ver` |
| POST | `/api/nomina/liquidaciones/generar-pdf/:id` | Generar PDF | `liquidaciones.generar_pdf` |

**Contratos:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| POST | `/api/contratos/generar` | Generar contrato en PDF | `empleados.crear` |

---

### 👤 Usuarios y Roles

**Usuarios:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/usuarios` | Listar usuarios | `usuarios.ver` |
| GET | `/api/usuarios/:id` | Obtener usuario específico | `usuarios.ver` |
| POST | `/api/usuarios` | Crear usuario | `usuarios.crear` |
| PUT | `/api/usuarios/:id` | Actualizar usuario | `usuarios.editar` |
| DELETE | `/api/usuarios/:id` | Eliminar usuario | `usuarios.eliminar` |
| POST | `/api/usuarios/:id/cambiar-password` | Cambiar contraseña | `usuarios.editar` |

**Roles:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/roles` | Listar roles | `roles.ver` |
| GET | `/api/roles/:id` | Obtener rol con permisos | `roles.ver` |
| POST | `/api/roles` | Crear rol personalizado | `roles.crear` |
| PUT | `/api/roles/:id` | Actualizar permisos de rol | `roles.editar` |
| DELETE | `/api/roles/:id` | Eliminar rol | `roles.eliminar` |

---

### 📈 Reportes

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/reportes/ventas` | Reporte de ventas por periodo | `reportes.ver` |
| GET | `/api/reportes/inventario` | Estado de inventario | `reportes.ver` |
| GET | `/api/reportes/productos-mas-vendidos` | Top productos vendidos | `reportes.ver` |
| GET | `/api/reportes/ventas-por-mesero` | Ventas por mesero | `reportes.ver` |
| GET | `/api/reportes/ventas-por-mesa` | Ventas por mesa | `reportes.ver` |
| GET | `/api/reportes/export-excel` | Exportar reporte a Excel | `reportes.exportar` |

---

### ⚙️ Configuración del Sistema

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/api/configuracion-sistema` | Obtener configuración | `configuracion.ver` |
| PUT | `/api/configuracion-sistema` | Actualizar configuración | `configuracion.editar` |
| GET | `/api/configuracion-facturacion` | Config de impresión | `configuracion.ver` |
| PUT | `/api/configuracion-facturacion` | Actualizar config impresión | `configuracion.editar` |
| GET | `/api/sistema/info` | Información del sistema | Público |
| GET | `/health` | Health check | Público |

---
- `GET /api/configuracion/sistema` - Obtener configuración
- `PUT /api/configuracion/sistema` - Actualizar configuración (`critico_modo`)

### Personalizaciones
- `GET /api/personalizaciones/categorias` - Obtener categorías de personalización
- `POST /api/personalizaciones/categorias` - Crear categoría
- `GET /api/personalizaciones/opciones` - Obtener opciones por categoría
- `POST /api/personalizaciones/opciones` - Crear opción

### Impresión Remota SaaS (Agente + Backend)
- `POST /api/print/pairing-token` - Generar código temporal de activación (admin)
- `POST /api/print/pair` - Emparejar agente con código (sin login de usuario)
- `GET /api/print/jobs` - Obtener trabajos pendientes por impresora
- `POST /api/print/jobs/:id/ack` - Confirmar impreso o reportar fallo
- `POST /api/print/printers/:id/heartbeat` - Reportar estado ONLINE/OFFLINE

## 💡 Flujo de Trabajo Detallado

### 🍽️ Pedidos en Mesa

1. **Selección de Tipo**: Usuario elige "Mesa"
2. **Selección de Mesa(s)**: Se pueden asignar múltiples mesas a una misma comanda
3. **Tipo de Servicio**: Desayuno, Almuerzo, o Carta Completa
4. **Selección de Productos**:
   - Desayuno: Formulario especializado con personalizaciones (bebidas, panes, acompañamientos)
   - Almuerzo: Formulario con opciones de entrada, principal, acompañamientos, postre
   - Carta Completa: Selección libre de cualquier producto del menú
5. **Resumen y Envío**: Vista previa con todas las opciones seleccionadas
6. **Impresión Automática**: Comanda se imprime en cocina automáticamente

### 🏠 Pedidos a Domicilio / Para Llevar

1. **Selección de Tipo**: Usuario elige "Domicilio"
2. **Datos del Cliente**:
   - Nombre (requerido)
   - Dirección (requerida para delivery, opcional para pickup)
   - Teléfono (opcional)
   - Checkbox "¿Es para llevar?" (si se marca, no se requiere dirección)
3. **Tipo de Servicio**: Igual que mesa
4. **Selección de Productos**: Igual que mesa
5. **Resumen y Envío**: Muestra datos del cliente en lugar de mesas
6. **Impresión**: Ticket incluye claramente datos del cliente y dirección

### ✏️ Edición de Comandas

1. **Acceso**: Desde historial o lista de comandas activas
2. **Agregar Items**: Se pueden agregar productos adicionales a una comanda existente
3. **Filtrado Inteligente**: Sistema detecta automáticamente qué items son nuevos
   - Identifica items sin ID o con ID temporal (prefijo `temp_`)
   - Verifica formato UUID para distinguir items existentes
   - Solo inserta items nuevos en base de datos
4. **Impresión Selectiva**: Solo imprime los items adicionales
   - Header especial: "** PRODUCTOS ADICIONALES **"
   - Incluye ID de comanda y referencia a mesa/cliente
   - No reimprime items existentes
5. **Sin Duplicados**: Sistema previene duplicación de items en DB y ticket

### 💰 Interface de Caja

1. **Selección de Comanda**: Ver todas las comandas activas con totales
2. **Generación de Factura**: Cálculo automático de totales con IVA
3. **Métodos de Pago**:
   - Efectivo (con cálculo automático de cambio)
   - Tarjeta
   - Transferencia
   - Mixto (efectivo + otro método)
4. **Impresión de Recibo**: Ticket de pago para el cliente
5. **Liberación Automática**: Mesas quedan disponibles tras facturar

### 🖨️ Sistema de Impresión

El sistema utiliza un **agente remoto de impresión (`montis-printer-agent.exe`)** que garantiza impresión estable en SaaS sin abrir puertos locales:

**Características del Agente:**
- **Activación por código temporal** desde el panel admin
- **Selección manual de impresora** con listado de impresoras instaladas
- **Estado cifrado local** (DPAPI) con `printerId` + `apiKey`
- **Heartbeat + polling** contra `/api/print/*` para recibir y confirmar trabajos
- **Autoarranque en Windows** y operación silenciosa en segundo plano
- **Reapertura de UI** para cambiar impresora sin reinstalar
- **Encoding**: CP850 (Code Page 850)
- **Comando ESC/POS**: `ESC t 2` (selecciona tabla de caracteres CP850)
- **Soporte completo**: á é í ó ú Á É Í Ó Ú ñ Ñ ¿ ¡
- **Sin marcas de agua** ni limitaciones de software externo

**Tipos de Impresión:**
- **Comanda Completa**: Imprime todos los items de una comanda nueva
- **Items Adicionales**: Solo imprime items agregados en edición
- **Factura**: Ticket de pago con totales y método de pago
- **Recibo**: Copia para el cliente

**Ejemplo de Formato:**
```
=========================================
         MONTIS CLOUD
=========================================
Fecha: 21/12/2024 14:30
Comanda #123
Mesa: 5 - Salón Principal
Mesero: Juan Pérez
-----------------------------------------
DESAYUNO
-----------------------------------------
1x Jugo Natural - Naranja      $5.00
1x Pan Francés
   ├─ Mermelada de fresa
   └─ Mantequilla
   Subtotal:                    $3.50
-----------------------------------------
TOTAL:                          $8.50
=========================================
```

**Para Domicilio:**
```
=========================================
         MONTIS CLOUD
      PEDIDO A DOMICILIO
=========================================
Comanda #124
Cliente: María García
Dirección: Calle Principal #123
Teléfono: 555-1234
-----------------------------------------
[... productos ...]
=========================================
```

## 🔧 Personalización y Administración

### Panel de Administración

El sistema incluye un panel completo de administración accesible desde la interfaz principal:

**Gestión de Seguridad y Acceso:**
- **Control de Usuarios**: Crear y administrar cuentas de acceso para el personal.
- **Roles y Permisos**: Definir perfiles (Administrador, Mesero, Cajero) con permisos granulares.
- **Auditoría de Acceso**: Seguimiento de últimos inicios de sesión y estados de cuenta.

**Gestión de Recursos Humanos:**
- **Expediente de Empleados**: Información personal, contractual y salarial centralizada.
- **Procesamiento de Nómina**: Liquidación periódica con cálculos automáticos de ley.
- **Liquidaciones Definitivas**: Gestión de retiros y pago de prestaciones sociales.

**Gestión de Productos:**
- Crear, editar y eliminar productos
- Organizar por categorías
- Establecer precios
- Marcar disponibilidad

**Gestión de Mesas:**
- Configurar número de mesas por salón
- Establecer capacidad
- Reorganizar distribución
- Ver estado en tiempo real

**Gestión de Salones:**
- Crear múltiples salones (Terraza, Interior, VIP, etc.)
- Asignar mesas a cada salón
- Configurar capacidades

**Gestión de Personalizaciones:**
- Configurar opciones para Desayunos (jugos, panes, acompañamientos)
- Configurar opciones para Almuerzos (entradas, principales, postres)
- Crear categorías personalizadas
- Establecer precios adicionales

**Inventario Avanzado (Insumos y Recetas):**
- **Insumos** con stock mínimo/crítico y estado automático (OK/Bajo/Crítico)
- **Recetas por producto** (consumo de insumos por unidad vendida)
- **Ajustes por personalización** (insumos adicionales o negativos por ítem)
- **Historial de movimientos** (consumos y ajustes manuales)
- **Bloqueo configurable** al confirmar comandas (solo crítico / bajo+crítico / no bloquear)
- **Importación y exportación Excel** por entidad
- **Indicadores de riesgo** en productos y personalizaciones

### Base de Datos

**Esquema Principal:**
- `comandas`: Pedidos con soporte multi-canal (mesa/domicilio)
  - `tipo_pedido`: 'mesa' | 'domicilio'
  - `cliente_nombre`, `cliente_direccion`, `cliente_telefono`
  - `es_para_llevar`: booleano para pickup
- `comanda_items`: Productos de cada comanda
- `comanda_mesas`: Relación muchos-a-muchos comandas-mesas
- `mesas`: Estado y configuración de mesas
- `salones`: Organización de espacios
- `productos`: Catálogo completo
- `facturas`: Registro de pagos
- `personalizaciones_categorias` y `personalizaciones_opciones`
- **Inventario avanzado**:
  - `insumos`: catálogo de insumos y stock
  - `producto_insumos`: receta por producto
  - `personalizacion_insumos`: ajustes de insumos por personalización
  - `insumo_historial`: historial de movimientos
  - `config_sistema`: configuración de bloqueo (`critico_modo`)

### Historial y Reportes

**Historial de Comandas:**
- Ver todas las comandas (activas y completadas)
- Filtrar por fecha, tipo, estado
- Ver detalles completos con items y totales
- Editar comandas existentes (agregar items)

**Reportes (Próximamente):**
- Ventas por período
- Productos más vendidos
- Análisis por tipo de servicio
- Reporte de domicilios vs mesas

## 🖨️ Configuración Avanzada de Impresoras

### Sistema de Impresión Propio

El sistema incluye un agente remoto para SaaS y mantiene un modo HTTP legacy para compatibilidad:

**Características Técnicas:**
- **Agente principal**: `local-print-plugin/printer_agent.py`
- **Ejecutable**: `local-print-plugin/dist/montis-printer-agent.exe`
- **Transporte principal**: polling seguro sobre `/api/print/*` (sin puertos locales)
- **Compatibilidad legacy**: `local-print-plugin/server.py` (HTTP local puerto 8001)
- **Encoding**: CP850 (Code Page 850) - Estándar para español
- **Sin dependencias externas**: No requiere software de terceros

**Comandos ESC/POS Soportados:**
- `ESC @`: Reset de impresora
- `ESC t 2`: Seleccionar tabla CP850
- `ESC E 1/0`: Negrita on/off
- `ESC a 0/1/2`: Alineación izq/centro/der
- `ESC d n`: Avanzar n líneas
- `GS V 66 0`: Cortar papel

**Encodings Disponibles:**
- `cp850`: Latin 1 (español) - **RECOMENDADO**
- `latin1`: ISO-8859-1
- `cp437`: US ASCII extendido
- `utf-8`: Unicode (requiere impresora compatible)

### Impresoras Compatibles

Cualquier impresora térmica de 58mm o 80mm con soporte ESC/POS:
- Epson TM-T20, TM-T88
- Xprinter XP-58, XP-80
- Bixolon SRP-350
- Star Micronics TSP143
- POS-58 (genéricas chinas)

### Configuración Windows

1. **Conectar impresora vía USB**
2. **Instalar drivers** (Windows normalmente los detecta automáticamente)
3. **Abrir `montis-printer-agent.exe`** y seleccionar la impresora en el desplegable
4. **Activar con código** generado desde Admin → Gestión de Facturación → Impresión Remota

### Solución de Problemas de Impresión

**La impresora no imprime:**
- Verificar que está encendida y conectada
- Verificar que `montis-printer-agent.exe` esté activo en Administrador de tareas
- Revisar log local del agente en `%APPDATA%/MontisPrinterAgent/agent.log`
- Reabrir el `.exe` y confirmar impresora seleccionada

**Caracteres raros o basura:**
- Verificar encoding en .env (debe ser `cp850`)
- Confirmar que impresora soporta CP850 (mayoría sí lo hace)
- Reiniciar backend para aplicar cambios de configuración

**No corta el papel:**
- Algunas impresoras requieren configuración de auto-corte
- Verificar comando GS V en código si es necesario
- Puede requerir ajuste manual del comando de corte

**Duplicados o items repetidos:**
- Ya resuelto: sistema tiene filtrado inteligente
- Solo imprime items nuevos al editar
- Verifica logs para confirmar comportamiento

## 📱 Uso en Dispositivos

### Tablets (Recomendado)
- **Resolución óptima**: 1280x800 o superior
- **Sistema**: Android 8+ o iPad OS
- **Navegador**: Chrome, Safari, Edge
- **Experiencia**: Interfaz touch-friendly, botones grandes
- **Ideal para**: Meseros tomando órdenes

### Celulares
- **Compatibilidad**: Diseño 100% responsive
- **Pantallas**: Desde 375px de ancho
- **Limitaciones**: Menos información visible simultáneamente
- **Ideal para**: Consultas rápidas, toma de pedidos simple

### PCs / Laptops
- **Pantallas grandes**: Aprovecha espacio para mostrar más datos
- **Navegación**: Teclado y mouse optimizados
- **Ideal para**: Estaciones de caja, administración, reportes
- **Impresión**: Conexión directa a impresoras USB

### Recomendaciones de Hardware

**Para Meseros:**
- Tablet Android 10" (ej: Samsung Tab A)
- Funda protectora con soporte
- Batería externa si jornadas largas

**Para Caja:**
- PC o Laptop Windows 10+
- Impresora térmica 80mm USB
- Monitor táctil opcional

**Para Cocina:**
- PC compacta o Laptop vieja
- Impresora térmica 58mm o 80mm
- Soporte para colgar tickets

## 🔐 Seguridad y Mejores Prácticas

**Implementado:**
- **Autenticación y Autorización**: Sistema JWT con hashing de contraseñas bcrypt.
- **Control de Roles (RBAC)**: Permisos granulares por módulo y rol de usuario.
- **Seguridad de Red**: Headers de seguridad con Helmet.
- **Validación de Datos**: Validación en todas las rutas de API.
- **Integridad de Datos**: Transacciones PostgreSQL para procesos críticos.
- **Sanitización**: Limpieza de inputs para prevenir inyecciones.

**Recomendaciones Futuras:**
- Backup automático de base de datos en la nube.
- Configuración de HTTPS en producción.
- Rate limiting para prevenir ataques de fuerza bruta.
- Auditoría de logs y monitoreo de seguridad.

## 📈 Estado Actual del Proyecto

### ✅ Características Implementadas
- ✅ PostgreSQL con arquitectura escalable
- ✅ Soporte multi-mesa y multi-salón
- ✅ Sistema multi-canal (mesa/domicilio/llevar)
- ✅ Edición de comandas sin duplicados
- ✅ Impresión térmica con encoding CP850 perfecto
- ✅ Gestión completa de RRHH y Nómina
- ✅ Autenticación JWT y Control de Roles (RBAC)
- ✅ Inventario avanzado con insumos y recetas
- ✅ Sistema de facturación con múltiples métodos de pago
- ✅ Configuración flexible de impresoras (58mm/80mm)

### 🎯 Expansión Multi-Sucursal
Esquema para cadenas con múltiples ubicaciones:
1. ✅ Base PostgreSQL (completado)
2. Implementar replicación maestro-esclavo
3. API Gateway central con load balancing
4. Sincronización en tiempo real con WebSockets
5. Dashboard corporativo consolidado
6. Gestión centralizada de productos y precios

## 🤝 Contribuir y Desarrollo

### Estructura de Branches
- `main`: Producción estable
- `develop`: Desarrollo activo
- `feature/*`: Nuevas funcionalidades
- `fix/*`: Correcciones de bugs

### Flujo de Contribución
1. Fork el repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Implementar cambios con commits descriptivos
4. Agregar tests si aplica
5. Crear Pull Request con descripción detallada

### Standards de Código
- **TypeScript**: Strict mode activado
- **ESLint**: Configuración estándar
- **Prettier**: Formateo automático
- **Commits**: Conventional Commits (feat:, fix:, docs:)

---

## 🛠️ Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.x | Librería de UI con hooks |
| **Next.js** | 14.x | Framework SSR con App Router |
| **TypeScript** | 5.x | Type safety en todo el código |
| **Tailwind CSS** | 3.x | Utility-first styling |
| **Axios** | 1.x | Cliente HTTP para API calls |
| **React Context** | - | State management global |
| **date-fns** | 2.x | Manipulación de fechas |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 18+ | Runtime de JavaScript |
| **Express** | 4.x | Framework de servidor web |
| **TypeScript** | 5.x | Type safety en backend |
| **PostgreSQL** | 14+ | Base de datos relacional |
| **Kysely** | 0.27.x | Query builder type-safe |
| **JWT** | 9.x | Autenticación con tokens |
| **bcrypt** | 5.x | Hashing de passwords |
| **Helmet** | 7.x | Headers de seguridad |
| **Compression** | 1.x | Compresión gzip de respuestas |
| **Morgan** | 1.x | Logger de requests HTTP |

### Agente de Impresión
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Python** | 3.9+ | Lenguaje del agente |
| **requests** | 2.x | Comunicación con backend `/api/print/*` |
| **pywin32** | 306+ | DPAPI + interacción con impresoras Windows |
| **Tkinter** | builtin | UI de activación y selección de impresora |
| **PyInstaller** | 6.x | Compilación a `montis-printer-agent.exe` |

### Desarrollo y Herramientas
| Herramienta | Propósito |
|-------------|-----------|
| **VS Code** | Editor de código recomendado |
| **Git** | Control de versiones |
| **pgAdmin 4** | Administración visual de PostgreSQL |
| **Postman** | Testing de API endpoints |
| **ESLint** | Linting de código TypeScript/JavaScript |
| **Prettier** | Formateo automático de código |

---

## 🎯 Casos de Uso Clave

### 🏢 Restaurantes de Mesa
- **Toma de pedidos** con tablets en mesas
- **Impresión automática** en cocina
- **Gestión de mesas** en tiempo real
- **Facturación** con IVA y métodos de pago múltiples
- **Control de turnos** con roles de meseros y cajeros

### 🍕 Pizzerías y Fast Food
- **Pedidos para llevar** sin necesidad de mesa
- **Domicilios** con data completa del cliente
- **Categorías personalizables** (pizzas, hamburguesas, bebidas)
- **Personalizaciones** complejas (ingredientes, tamaños, extras)
- **Impresión optimizada** para cocina (58mm o 80mm)

### ☕ Cafeterías y Panaderías
- **Catálogo de productos** con imágenes
- **Desayunos personalizables** (bebida + pan + proteína)
- **Control de inventario** de insumos (café, leche, panes)
- **Reportes de ventas** por producto y periodo
- **Facturación rápida** para filas de clientes

### 🍽️ Cadenas Multi-Sucursal (Futuro)
- **Arquitectura escalable** con PostgreSQL
- **API centralizada** para múltiples puntos
- **Sincronización en tiempo real** entre sucursales
- **Dashboard corporativo** consolidado
- **Replicación maestro-esclavo** para alta disponibilidad

---

## 📈 Roadmap Futuro

### 🔜 Corto Plazo (Q1-Q2 2026)
- [ ] **Dashboard de Analíticas**: Gráficos de ventas, productos estrella, tendencias
- [ ] **App Móvil Nativa**: React Native para Android/iOS
- [ ] **Modo Offline**: Sincronización cuando se recupere conexión
- [ ] **Sistema de Propinas**: Tracking y distribución entre meseros
- [ ] **Reservas Online**: Widget para página web del restaurante

### 📅 Mediano Plazo (Q3-Q4 2026)
- [ ] **CRM de Clientes**: Base de datos de clientes frecuentes con historial
- [ ] **Programa de Fidelización**: Puntos y descuentos por compras
- [ ] **Integración Delivery Apps**: Uber Eats, Rappi, DiDi Food
- [ ] **Pasarelas de Pago**: Mercado Pago, PayU, Stripe
- [ ] **WhatsApp Business**: Pedidos vía chat automatizado

### 🚀 Largo Plazo (2027+)
- [ ] **Machine Learning**: Predicción de demanda y sugerencias inteligentes
- [ ] **API Pública**: Para integraciones de terceros
- [ ] **Menú Digital con QR**: Clientes piden desde su celular
- [ ] **Sistema de Delivery Propio**: Con tracking GPS de domiciliarios

---

## 🌟 Ventajas Competitivas

### ✅ Comparado con Soluciones Comerciales

| Característica | Este Sistema | Rappi POS | Square POS | Toast POS |
|----------------|--------------|-----------|------------|-----------|
| **Costo Mensual** | $0 (auto-hospedado) | $50-200/mes | $60/mes | $165/mes |
| **Hardware Propio** | ✅ Usa cualquier PC/Tablet | ❌ Hardware propietario | ⚠️ Hardware recomendado | ❌ Hardware propietario |
| **Sin Comisiones** | ✅ 0% | ❌ 3-5% por transacción | ❌ 2.9% + 30¢ | ❌ 2.99% |
| **Código Abierto** | ✅ Personalizable | ❌ Cerrado | ❌ Cerrado | ❌ Cerrado |
| **Impresión Sin Marca** | ✅ Sin watermarks | ⚠️ Con logo empresa | ⚠️ Con logo empresa | ⚠️ Con logo empresa |
| **Inventario Avanzado** | ✅ Con recetas e insumos | ⚠️ Básico | ⚠️ Básico | ✅ Avanzado |
| **RRHH Integrado** | ✅ Nómina y liquidaciones | ❌ No incluido | ❌ No incluido | ⚠️ Addon pago |
| **Multi-Canal** | ✅ Mesa/Delivery/Llevar | ✅ Sí | ✅ Sí | ✅ Sí |
| **Roles y Permisos** | ✅ 23 módulos granulares | ⚠️ Básico | ⚠️ Básico | ✅ Avanzado |
| **Soporte 24/7** | ⚠️ Documentación | ✅ Sí | ✅ Sí | ✅ Sí |

### 🎁 Beneficios Clave

1. **💰 Sin Costos Recurrentes**: Auto-hospedado, sin mensualidades ni comisiones
2. **🔓 Control Total**: Acceso completo al código fuente para personalizaciones
3. **📦 Todo en Uno**: Comandas + Inventario + RRHH + Facturación en una sola plataforma
4. **🖨️ Impresión Profesional**: Plugin propio sin dependencias de terceros
5. **🔒 Seguridad**: Datos en tu propio servidor, no en la nube de terceros
6. **⚡ Performance**: Optimizado para velocidad y bajo consumo de recursos
7. **📱 Multi-Dispositivo**: Funciona en tablets, celulares, PCs sin apps nativas
8. **🇨🇴 Adaptado a Colombia**: Cálculos de nómina según ley colombiana

---

## 📄 Licencia y Soporte

**Licencia**: Proyecto propietario de **Montis Cloud**.

**Desarrollado por**: Juan Diego Montenegro Segura (@Juanshiu) - Ingeniero de Software Full Stack

**Versión Actual**: 2.0.0 (Febrero 2026)

**Soporte Técnico:**
- 📖 **Documentación completa** en este README
- 📂 **Guías adicionales** en carpeta `/GUIA DE USO/`
- 🐛 **Logs detallados** en consola del backend para debugging
- 🏥 **Health check**: `http://localhost:3001/health`
- 📧 **Contacto**: Para consultas o soporte, contactar al desarrollador

**Estado del Proyecto**: ✅ **Producción Estable** - Actualmente en uso en Casa Montis Restaurante

---

## 🙏 Agradecimientos

Este sistema fue desarrollado como solución integral para la gestión operativa de **Casa Montis Restaurante**, integrando:
- Toma de comandas multi-canal (mesa, domicilio, para llevar)
- Sistema de inventario inteligente con recetas e insumos
- Módulo completo de recursos humanos con nómina y liquidaciones
- Impresión térmica con encoding perfecto para español
- Control de acceso con roles y permisos granulares

Agradecimientos especiales a:
- **Casa Montis** por confiar en la visión del proyecto
- **Comunidad Open Source** por las librerías y herramientas utilizadas
- **Claude/Anthropic** por asistencia en desarrollo y documentación

---

## 📝 Changelog Reciente

### Versión 2.0.0 (Enero 2025) - "Enterprise Ready"

**🆕 Nuevas Características:**
- ✨ **Configuración de Impresoras**: Selector de ancho de papel (58mm/80mm) y tamaño de fuente (Small/Normal/Large)
- 💰 **V.UNIT en Facturas**: Columna de Valor Unitario agregada a facturas y recibos
- 🔐 **Sistema de Roles Completo**: RBAC con 23 módulos y permisos granulares
- 👥 **Módulo de RRHH**: Nómina, liquidaciones, contratos y expedientes
- 📦 **Inventario Avanzado**: Insumos, recetas, ajustes automáticos, indicadores de riesgo
- 🗄️ **Migración a PostgreSQL**: De SQLite a PostgreSQL para escalabilidad
- 📊 **Preview dinámico**: Vista previa de recibos con configuración en tiempo real

**🐛 Correcciones:**
- ✅ Overflow de descripciones de productos en tablas (GestionProductos y SeleccionProductos)
- ✅ Separadores que se desbordaban con fuente grande (ajuste de caracteres efectivos)
- ✅ Impresión selectiva de items adicionales (sin duplicados)
- ✅ Marcado automático de `is_impreso` en items de comanda

**🔧 Mejoras:**
- ⚡ Optimización de consultas con PostgreSQL y Kysely
- 🎨 UI/UX mejorada en panel de administración
- 📱 Responsiveness perfeccionado para todos los dispositivos
- 🔒 Seguridad endurecida con middleware y validaciones
- 📝 Documentación completa actualizada (este README)

### Versión 1.5.0 (Diciembre 2024) - "Multi-Canal"
- ✅ Soporte para pedidos a domicilio y para llevar
- ✅ Formulario de datos de cliente
- ✅ Impresión diferenciada según tipo de pedido
- ✅ Edición de comandas con agregado de items

### Versión 1.0.0 (Noviembre 2024) - "MVP"
- ✅ Sistema de comandas para mesas
- ✅ Catálogo de productos con categorías
- ✅ Impresión térmica básica
- ✅ Facturación con IVA

---

## 🎉 Conclusión

**Sistema de Comandas Casa Montis** es una solución integral, moderna y escalable para la gestión operativa de restaurantes. Construido con tecnologías de última generación y arquitectura modular, ofrece todas las funcionalidades necesarias para:

✅ **Operaciones Diarias**: Toma de pedidos, facturación, gestión de mesas  
✅ **Control Administrativo**: Inventario, RRHH, roles y permisos  
✅ **Impresión Profesional**: Sistema propio sin dependencias externas  
✅ **Escalabilidad**: Preparado para crecer de un punto a múltiples sucursales  

**¿Por qué elegir este sistema?**
- 💸 **Sin costos recurrentes** vs $50-200/mes de competidores
- 🔓 **Control total** del código y los datos
- 🇨🇴 **Adaptado a Colombia** (nómina según ley colombiana)
- ⚡ **Performance** optimizado y lightweight
- 📈 **Activamente desarrollado** con roadmap claro

**Estado Actual**: ✅ **Producción Estable** - Sistema completo y funcional usado diariamente en Casa Montis Restaurante.

---

<div align="center">

**⭐ Si este proyecto te resulta útil, considera dejarnos una estrella en GitHub**

**Desarrollado con ❤️ por Juan Diego Montenegro Segura**

**© 2026 Montis Cloud. Todos los derechos reservados.**

</div>

