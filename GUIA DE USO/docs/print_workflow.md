# Impresión remota comercial (SaaS) — flujo de activación

Documento interno para administración/operación del SaaS.  
Objetivo: que el cliente final solo use `montis-printer-agent.exe` + código de activación.

## 1) Flujo comercial final

1. Admin abre **Gestión de Facturación → Impresión Remota**.
2. Admin ingresa alias (ej. `Cocina Principal`) y pulsa **Generar código**.
3. Se muestra un **código de activación temporal** (10 min).
4. Cliente descarga y ejecuta `montis-printer-agent.exe` (doble clic).
5. Cliente escribe el código en la ventana de activación.
6. El agente:
   - detecta impresora local automáticamente,
   - se vincula al backend,
   - guarda credenciales cifradas localmente,
   - se registra en autoarranque de Windows,
   - comienza heartbeat/polling en segundo plano.
7. Admin ve la impresora en estado `ONLINE`.

## 2) Componentes implementados

- Backend:
  - `printers` / `print_jobs` (cola de impresión)
  - `print_pairing_tokens` (tokens de emparejamiento temporal)
  - endpoint `POST /api/print/pairing-token` (admin)
  - endpoint `POST /api/print/pair` (agente)
  - binding por `device_fingerprint`
- Agente Windows (`printer_agent.py` -> `.exe`):
  - UI mínima de activación por código
  - detección automática de impresora
  - estado cifrado local con DPAPI (pywin32)
  - autoinicio vía registro `HKCU\...\Run`
  - operación silenciosa (sin terminal al compilar con `--noconsole`)

## 3) Endpoints relevantes

### 3.1 Generar código (admin)

- `POST /api/print/pairing-token`
- Auth: JWT + permiso `gestionar_sistema`
- Body:
  - `alias?: string`
  - `ttlMinutes?: number` (5..30, default 10)
- Respuesta:
  - `activationCode: string`
  - `expiresAt: string`

### 3.2 Emparejar agente (cliente, sin login)

- `POST /api/print/pair`
- Body:
  - `pairingToken: string`
  - `fingerprint: string`
  - `hostname?: string`
  - `os?: string`
  - `printerName?: string`
- Respuesta:
  - `printerId: string`
  - `apiKey: string` *(solo backend ↔ agente)*
  - `paired: true`

> `apiKey` nunca se muestra en Admin ni se pide al cliente.

## 4) Seguridad aplicada

- Código de activación temporal:
  - expira (TTL)
  - uso único (`used_at`)
  - se almacena hasheado (`token_hash`)
- Credenciales de impresión:
  - `api_key_hash` en base de datos
  - `apiKey` solo entregada al agente durante pairing
- Vinculación de dispositivo:
  - impresora enlazada a `device_fingerprint`
  - middleware de apiKey valida fingerprint en cada request

## 5) Operación y soporte

- Si cliente cambia de PC:
  - generar nuevo código desde admin
  - ejecutar `.exe` en PC nueva
- Si cliente reinstala Windows:
  - repetir activación (nuevo fingerprint)
- Si impresora aparece `OFFLINE`:
  - verificar que el proceso `montis-printer-agent.exe` esté activo
  - si no está activo, reabrir el `.exe`

## 6) Empaquetado del agente

Build recomendado:

```bash
python -m PyInstaller --onefile --noconsole --name montis-printer-agent printer_agent.py
```

Salida:

- `local-print-plugin/dist/montis-printer-agent.exe`

## 7) Checklist de release

- [ ] Migraciones aplicadas incluyendo `032_print_pairing_tokens.ts`
- [ ] Endpoint `POST /api/print/pairing-token` operativo con permisos
- [ ] Endpoint `POST /api/print/pair` operativo sin auth de usuario
- [ ] Admin muestra código de activación (no API keys)
- [ ] Agente se activa con código y queda en autoarranque
- [ ] Estado de impresora visible en admin (`ONLINE/OFFLINE`)
