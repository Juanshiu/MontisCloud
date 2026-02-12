import { db } from '../database/database'
import { Kysely, sql } from 'kysely'
import { generateApiKey, hashApiKey } from '../utils/authApiKey'
import type { Database } from '../database/types'
import crypto from 'crypto'

export type PrintJobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface RegisterPrinterInput {
  empresaId: string
  name: string
  meta?: Record<string, any> | null
  isDefault?: boolean
}

export interface CreatePrintJobInput {
  empresaId: string
  printerId: string
  externalId: string
  type: string
  payload: Record<string, any>
}

export interface GeneratePairingTokenInput {
  empresaId: string
  createdByUsuarioId?: string | null
  alias?: string | null
  ttlMinutes?: number
}

export interface PairPrinterInput {
  pairingToken: string
  fingerprint: string
  hostname?: string | null
  osName?: string | null
  printerName?: string | null
}

export class PrintService {
  private normalizePairingCode(input: string): string {
    return (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  }

  private hashPairingCode(input: string): string {
    return crypto.createHash('sha256').update(this.normalizePairingCode(input), 'utf8').digest('hex')
  }

  private generatePairingCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const randomChunk = () => {
      let out = ''
      for (let index = 0; index < 4; index += 1) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)]
      }
      return out
    }
    return `MONTIS-${randomChunk()}-${randomChunk()}`
  }

  async registerPrinter(input: RegisterPrinterInput): Promise<{ printerId: string; apiKey: string }> {
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)

    const { empresaId, name, meta, isDefault } = input

    const result = await db.transaction().execute(async (trx) => {
      if (isDefault) {
        await trx
          .updateTable('printers')
          .set({ is_default: false, updated_at: sql`now()` })
          .where('empresa_id', '=', empresaId)
          .execute()
      }

      const inserted = await trx
        .insertInto('printers')
        .values({
          empresa_id: empresaId,
          name,
          api_key_hash: apiKeyHash,
          device_fingerprint: null,
          hostname: null,
          os_name: null,
          last_pairing_at: null,
          meta: meta ?? null,
          is_default: Boolean(isDefault),
          activo: true,
          last_seen_at: null,
          created_at: sql`now()`,
          updated_at: sql`now()`
        })
        .returning(['id'])
        .executeTakeFirstOrThrow()

      return inserted.id as string
    })

    return { printerId: result, apiKey }
  }

  async generatePairingToken(input: GeneratePairingTokenInput): Promise<{ activationCode: string; expiresAt: string }> {
    const { empresaId, createdByUsuarioId, alias } = input
    const ttlMinutes = Math.min(Math.max(input.ttlMinutes ?? 10, 5), 30)
    const activationCode = this.generatePairingCode()
    const tokenHash = this.hashPairingCode(activationCode)
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    await db
      .insertInto('print_pairing_tokens')
      .values({
        empresa_id: empresaId,
        token_hash: tokenHash,
        alias: alias?.trim() || null,
        expires_at: expiresAt,
        used_at: null,
        used_by_printer_id: null,
        created_by_usuario_id: createdByUsuarioId || null,
        created_at: sql`now()`
      })
      .executeTakeFirstOrThrow()

    return { activationCode, expiresAt }
  }

  async pairPrinterWithToken(input: PairPrinterInput): Promise<{ printerId: string; apiKey: string; paired: boolean }> {
    const tokenHash = this.hashPairingCode(input.pairingToken)
    const fingerprint = (input.fingerprint || '').trim()
    const hostname = input.hostname?.trim() || null
    const osName = input.osName?.trim() || null
    const detectedPrinterName = input.printerName?.trim() || null

    if (!fingerprint) {
      throw new Error('fingerprint es requerido')
    }

    const now = new Date().toISOString()
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)

    return await db.transaction().execute(async (trx) => {
      const token = await trx
        .selectFrom('print_pairing_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst()

      if (!token) {
        throw new Error('Código de activación inválido')
      }

      if (token.used_at) {
        throw new Error('Código de activación ya fue utilizado')
      }

      if (new Date(token.expires_at as any).getTime() < Date.now()) {
        throw new Error('Código de activación expirado')
      }

      const empresaId = token.empresa_id as string

      const existingPrinter = await trx
        .selectFrom('printers')
        .select(['id'])
        .where('empresa_id', '=', empresaId)
        .where('device_fingerprint', '=', fingerprint)
        .executeTakeFirst()

      const desiredName = token.alias || detectedPrinterName || hostname || 'Cocina Principal'

      let printerId: string
      if (existingPrinter?.id) {
        printerId = existingPrinter.id as string
        await trx
          .updateTable('printers')
          .set({
            name: desiredName,
            api_key_hash: apiKeyHash,
            hostname,
            os_name: osName,
            device_fingerprint: fingerprint,
            last_pairing_at: sql`now()`,
            activo: true,
            updated_at: sql`now()`
          })
          .where('id', '=', printerId)
          .where('empresa_id', '=', empresaId)
          .execute()
      } else {
        const hasDefault = await trx
          .selectFrom('printers')
          .select(['id'])
          .where('empresa_id', '=', empresaId)
          .where('is_default', '=', true)
          .where('activo', '=', true)
          .executeTakeFirst()

        const inserted = await trx
          .insertInto('printers')
          .values({
            empresa_id: empresaId,
            name: desiredName,
            api_key_hash: apiKeyHash,
            device_fingerprint: fingerprint,
            hostname,
            os_name: osName,
            last_pairing_at: sql`now()`,
            meta: null,
            is_default: !hasDefault,
            activo: true,
            last_seen_at: null,
            created_at: sql`now()`,
            updated_at: sql`now()`
          })
          .returning(['id'])
          .executeTakeFirstOrThrow()

        printerId = inserted.id as string
      }

      await trx
        .updateTable('print_pairing_tokens')
        .set({ used_at: now, used_by_printer_id: printerId })
        .where('id', '=', token.id)
        .execute()

      return { printerId, apiKey, paired: true }
    })
  }

  async listPrintersByEmpresa(empresaId: string) {
    return await db
      .selectFrom('printers')
      .select(['id', 'name', 'meta', 'is_default', 'activo', 'last_seen_at', 'created_at', 'updated_at'])
      .where('empresa_id', '=', empresaId)
      .orderBy('created_at', 'desc')
      .execute()
  }

  async getDefaultPrinterId(empresaId: string, trx?: Kysely<Database>) {
    const dbOrTrx = trx ?? db

    const preferred = await dbOrTrx
      .selectFrom('printers')
      .select(['id'])
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .where('is_default', '=', true)
      .orderBy('updated_at', 'desc')
      .executeTakeFirst()

    if (preferred?.id) return preferred.id as string

    const anyActive = await dbOrTrx
      .selectFrom('printers')
      .select(['id'])
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .orderBy('created_at', 'desc')
      .executeTakeFirst()

    return anyActive?.id ? (anyActive.id as string) : null
  }

  async createPrintJob(input: CreatePrintJobInput, trx?: Kysely<Database>): Promise<{ jobId: string; alreadyExisted?: boolean }> {
    const { empresaId, printerId, externalId, type, payload } = input
    const dbOrTrx = trx ?? db

    // Validar pertenencia (evita que un tenant cree jobs en printer ajena)
    const printer = await dbOrTrx
      .selectFrom('printers')
      .select(['id'])
      .where('id', '=', printerId)
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .executeTakeFirst()

    if (!printer) {
      throw new Error('Impresora no encontrada o no pertenece a la empresa')
    }

    const existing = await dbOrTrx
      .selectFrom('print_jobs')
      .select(['id', 'status'])
      .where('printer_id', '=', printerId)
      .where('external_id', '=', externalId)
      .where('type', '=', type)
      .where('status', '!=', 'failed')
      .executeTakeFirst()

    if (existing?.id) {
      return { jobId: existing.id as string, alreadyExisted: true }
    }

    const inserted = await dbOrTrx
      .insertInto('print_jobs')
      .values({
        empresa_id: empresaId,
        printer_id: printerId,
        external_id: externalId,
        type,
        payload,
        status: 'pending',
        attempts: 0,
        last_error: null,
        info: null,
        printed_at: null,
        created_at: sql`now()`,
        updated_at: sql`now()`
      })
      .returning(['id'])
      .executeTakeFirstOrThrow()

    return { jobId: inserted.id as string }
  }

  /**
   * Reclama jobs (pending -> processing) de manera atómica para evitar duplicados.
   * Incrementa attempts al reclamar.
   */
  async claimPendingJobs(printerId: string, limit: number = 10) {
    return await db.transaction().execute(async (trx) => {
      const result = await sql`
        with cte as (
          select id
          from print_jobs
          where printer_id = ${printerId}::uuid
            and status = 'pending'
          order by created_at asc
          for update skip locked
          limit ${limit}
        )
        update print_jobs
        set status = 'processing',
            attempts = attempts + 1,
            updated_at = now()
        where id in (select id from cte)
        returning id, printer_id, empresa_id, external_id, type, payload, status, attempts, last_error, info, printed_at, created_at, updated_at
      `.execute(trx)

      return result.rows
    })
  }

  async listJobs(params: {
    empresaId?: string
    printerId?: string
    status?: PrintJobStatus
    limit?: number
  }) {
    const { empresaId, printerId, status, limit = 50 } = params
    let q = db.selectFrom('print_jobs').selectAll().orderBy('created_at', 'desc').limit(limit)

    if (empresaId) q = q.where('empresa_id', '=', empresaId)
    if (printerId) q = q.where('printer_id', '=', printerId)
    if (status) q = q.where('status', '=', status)

    return await q.execute()
  }

  async ackJob(input: {
    printerId: string
    jobId: string
    status: Exclude<PrintJobStatus, 'pending' | 'processing'>
    info?: string
    reason?: string
    printedAt?: string | null
  }) {
    const { printerId, jobId, status, info, reason, printedAt } = input

    const printedAtValue = printedAt ? new Date(printedAt) : null

    const update = await db
      .updateTable('print_jobs')
      .set({
        status,
        info: info ?? null,
        last_error: status === 'failed' ? (reason ?? 'failed') : null,
        printed_at: status === 'done' ? (printedAtValue ?? sql`now()`) : null,
        updated_at: sql`now()`
      })
      .where('id', '=', jobId)
      .where('printer_id', '=', printerId)
      .returning(['id'])
      .executeTakeFirst()

    return Boolean(update?.id)
  }

  async heartbeat(input: { printerId: string; empresaId: string; status?: string; uptime?: number; meta?: any }) {
    const { printerId, empresaId, status, uptime, meta } = input

    const heartbeatMeta = {
      status: status || 'ready',
      uptime: uptime ?? null,
      ...(meta && typeof meta === 'object' ? meta : {})
    }

    await db
      .updateTable('printers')
      .set({
        meta: sql`coalesce(meta, '{}'::jsonb) || ${JSON.stringify(heartbeatMeta)}::jsonb`,
        last_seen_at: sql`now()`,
        updated_at: sql`now()`
      })
      .where('id', '=', printerId)
      .where('empresa_id', '=', empresaId)
      .execute()
  }
}
