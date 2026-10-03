import { Router } from 'express'
import {
  getWhatsAppStatus,
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook,
  sendWhatsAppMessage,
} from '../controllers/whatsappController.js'

const router = Router()

router.get('/status', getWhatsAppStatus)
router.get('/webhook', verifyWhatsAppWebhook)
router.post('/webhook', receiveWhatsAppWebhook)
router.post('/send', sendWhatsAppMessage)

export default router
