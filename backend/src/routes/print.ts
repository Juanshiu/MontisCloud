import { Router, Request, Response, NextFunction } from 'express'
import { verificarAutenticacion, verificarPermiso } from '../middleware/authMiddleware'
import {
  registerPrinter,
  createPairingToken,
  pairPrinter,
  listPrinters,
  updatePrinterConfig,
  deletePrinter,
  createJob,
  getJobs,
  ackJob,
  heartbeat
} from '../controllers/printController'
import { verificarApiKeyImpresora, verificarApiKeyImpresoraOpcional } from '../utils/authApiKey'

const router = Router()

// Auth híbrida: si viene apiKey, se usa; si no, caemos a JWT.
const authApiKeyOrJwt = async (req: Request, res: Response, next: NextFunction) => {
  if (req.printContext) {
    next()
    return
  }
  await (verificarAutenticacion as any)(req, res, next)
}

// ==================== PRINTERS (ADMIN) ====================

router.post(
  '/printers/register',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => registerPrinter(req, res)
)

router.post(
  '/pairing-token',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => createPairingToken(req, res)
)

router.post('/pair', (req, res) => pairPrinter(req, res))

router.get(
  '/printers',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => listPrinters(req, res)
)

router.patch(
  '/printers/:id/config',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => updatePrinterConfig(req, res)
)

router.delete(
  '/printers/:id',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => deletePrinter(req, res)
)

// ==================== JOBS ====================

// Crear job (admin / integraciones)
router.post(
  '/jobs',
  verificarAutenticacion,
  verificarPermiso('gestionar_sistema'),
  (req, res) => createJob(req, res)
)

// Listar / reclamar jobs
router.get('/jobs', verificarApiKeyImpresoraOpcional, authApiKeyOrJwt, (req, res) => getJobs(req, res))

// Ack + heartbeat (solo agente)
router.post('/jobs/:id/ack', verificarApiKeyImpresora, (req, res) => ackJob(req, res))
router.post('/printers/:id/heartbeat', verificarApiKeyImpresora, (req, res) => heartbeat(req, res))

export default router
