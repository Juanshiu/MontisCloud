import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { db } from '../database/database'

export function generateApiKey(): string {
  // 32 bytes -> 43 chars base64url aprox
  return crypto.randomBytes(32).toString('base64url')
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex')
}

function extractApiKey(req: Request, options?: { allowAuthorizationBearer?: boolean }): string | null {
  const headerKey = (req.headers['x-api-key'] as string | undefined)?.trim()
  if (headerKey) return headerKey

  if (options?.allowAuthorizationBearer) {
    const authHeader = (req.headers.authorization || '').trim()
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim()
      return token || null
    }
  }

  return null
}

/**
 * Middleware para autenticar agentes de impresión por apiKey.
 * - Valida el secreto comparando hash (sha256) contra printers.api_key_hash
 * - Inyecta req.printContext = { printerId, empresaId }
 */
export async function verificarApiKeyImpresora(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = extractApiKey(req, { allowAuthorizationBearer: true })
    if (!apiKey) {
      res.status(401).json({ error: 'API key requerida', codigo: 'API_KEY_REQUIRED' })
      return
    }

    const apiKeyHash = hashApiKey(apiKey)

    const printer = await db
      .selectFrom('printers')
      .select(['id', 'empresa_id', 'activo', 'device_fingerprint'])
      .where('api_key_hash', '=', apiKeyHash)
      .executeTakeFirst()

    if (!printer || !printer.activo) {
      res.status(401).json({ error: 'API key inválida o impresora desactivada', codigo: 'API_KEY_INVALID' })
      return
    }

    const incomingFingerprint = (req.headers['x-device-fingerprint'] as string | undefined)?.trim() || null
    if (printer.device_fingerprint && incomingFingerprint !== printer.device_fingerprint) {
      res.status(401).json({ error: 'Dispositivo no autorizado para esta impresora', codigo: 'DEVICE_FINGERPRINT_MISMATCH' })
      return
    }

    req.printContext = {
      printerId: printer.id,
      empresaId: printer.empresa_id
    }

    next()
  } catch (error) {
    console.error('Error en auth apiKey impresora:', error)
    res.status(500).json({ error: 'Error interno al validar apiKey' })
  }
}

/**
 * Middleware opcional:
 * Si viene apiKey, autentica e inyecta req.printContext.
 * Si no viene, continúa para que otras auth (JWT) apliquen.
 */
export async function verificarApiKeyImpresoraOpcional(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // En modo opcional NO leemos Authorization Bearer para evitar chocar con JWT.
  const apiKey = extractApiKey(req, { allowAuthorizationBearer: false })
  if (!apiKey) {
    next()
    return
  }
  await verificarApiKeyImpresora(req, res, next)
}
