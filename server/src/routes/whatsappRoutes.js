import { Router } from 'express'
import {
  getWhatsAppStatus,
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
} from '../controllers/whatsappController.js'

const router = Router()

router.get('/status', getWhatsAppStatus)
router.get('/webhook', verifyWhatsAppWebhook)
router.post('/webhook', receiveWhatsAppWebhook)

export default router
