import { Router } from 'express'
import { parseReceipt, parseTransaction } from '../controllers/aiController.js'

const router = Router()

router.post('/parse-receipt', parseReceipt)
router.post('/parse-transaction', parseTransaction)

export default router
