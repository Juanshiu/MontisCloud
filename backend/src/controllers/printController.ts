import { Request, Response } from 'express'
import { PrintService, PrintJobStatus } from '../services/printService'

const printService = new PrintService()

export async function registerPrinter(req: Request, res: Response) {
  const { empresaId } = req.context
  const { name, meta, isDefault } = req.body || {}

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name es requerido' })
    return
  }

  const result = await printService.registerPrinter({
    empresaId,
    name: name.trim(),
    meta: meta && typeof meta === 'object' ? meta : null,
    isDefault: Boolean(isDefault)
  })

  res.status(201).json(result)
}

export async function createPairingToken(req: Request, res: Response) {
  const { empresaId, userId } = req.context
  const { alias, ttlMinutes } = req.body || {}

  const result = await printService.generatePairingToken({
    empresaId,
    createdByUsuarioId: userId,
    alias: typeof alias === 'string' ? alias : null,
    ttlMinutes: typeof ttlMinutes === 'number' ? ttlMinutes : undefined
  })

  res.status(201).json(result)
}

export async function pairPrinter(req: Request, res: Response) {
  const { pairingToken, fingerprint, hostname, os, printerName } = req.body || {}

  if (!pairingToken || !fingerprint) {
    res.status(400).json({ error: 'pairingToken y fingerprint son requeridos' })
    return
  }

  try {
    const result = await printService.pairPrinterWithToken({
      pairingToken,
      fingerprint,
      hostname,
      osName: os,
      printerName
    })

    res.status(200).json(result)
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'No se pudo completar el emparejamiento' })
  }
}

export async function listPrinters(req: Request, res: Response) {
  const { empresaId } = req.context
  const printers = await printService.listPrintersByEmpresa(empresaId)
  res.json({ success: true, printers })
}

export async function updatePrinterConfig(req: Request, res: Response) {
  const { empresaId } = req.context
  const { id } = req.params
  const { paperWidth, fontSize } = req.body || {}

  const ok = await printService.updatePrinterConfig({
    empresaId,
    printerId: id,
    paperWidth,
    fontSize
  })

  if (!ok) {
    res.status(404).json({ error: 'Impresora no encontrada' })
    return
  }

  res.status(200).json({ success: true })
}

export async function deletePrinter(req: Request, res: Response) {
  const { empresaId } = req.context
  const { id } = req.params

  const ok = await printService.deletePrinter({ empresaId, printerId: id })
  if (!ok) {
    res.status(404).json({ error: 'Impresora no encontrada' })
    return
  }

  res.status(200).json({ success: true })
}

export async function createJob(req: Request, res: Response) {
  const { empresaId } = req.context
  const { printerId, externalId, type, payload } = req.body || {}

  if (!printerId || !externalId || !type || !payload) {
    res.status(400).json({ error: 'printerId, externalId, type y payload son requeridos' })
    return
  }

  const result = await printService.createPrintJob({
    empresaId,
    printerId,
    externalId,
    type,
    payload
  })

  res.status(result.alreadyExisted ? 200 : 201).json({ jobId: result.jobId, alreadyExisted: result.alreadyExisted })
}

export async function getJobs(req: Request, res: Response) {
  // Modo agente (apiKey) o modo admin (JWT)
  const isAgent = Boolean(req.printContext)

  const status = (req.query.status as PrintJobStatus | undefined) ?? 'pending'
  const limit = Math.min(parseInt((req.query.limit as string) || '10', 10) || 10, 50)

  if (isAgent) {
    const { printerId, empresaId } = req.printContext!

    if (status === 'pending') {
      const jobs = await printService.claimPendingJobs(printerId, limit)
      res.json({ success: true, jobs })
      return
    }

    // Para agente, solo permitimos ver su propia cola
    const jobs = await printService.listJobs({ printerId, empresaId, status, limit })
    res.json({ success: true, jobs })
    return
  }

  // Admin JWT
  const { empresaId } = req.context
  const printerId = (req.query.printerId as string | undefined) || undefined
  const jobs = await printService.listJobs({ empresaId, printerId, status, limit })
  res.json({ success: true, jobs })
}

export async function ackJob(req: Request, res: Response) {
  if (!req.printContext) {
    res.status(401).json({ error: 'apiKey requerida' })
    return
  }

  const { printerId } = req.printContext
  const { id } = req.params
  const { status, info, reason, printedAt } = req.body || {}

  if (status !== 'done' && status !== 'failed') {
    res.status(400).json({ error: 'status debe ser done o failed' })
    return
  }

  const ok = await printService.ackJob({
    printerId,
    jobId: id,
    status,
    info,
    reason,
    printedAt
  })

  if (!ok) {
    res.status(404).json({ error: 'Job no encontrado para esta impresora' })
    return
  }

  res.status(200).json({ success: true })
}

export async function heartbeat(req: Request, res: Response) {
  if (!req.printContext) {
    res.status(401).json({ error: 'apiKey requerida' })
    return
  }

  const { printerId, empresaId } = req.printContext
  const { id } = req.params

  if (id && id !== printerId) {
    res.status(403).json({ error: 'Impresora no autorizada', codigo: 'PRINTER_MISMATCH' })
    return
  }
  const { status, uptime, meta } = req.body || {}

  await printService.heartbeat({ printerId, empresaId, status, uptime, meta })
  res.status(200).json({ success: true })
}
