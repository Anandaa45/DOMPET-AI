import cors from 'cors'
import express from 'express'
import aiRoutes from './routes/aiRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import webhookRoutes from './routes/webhookRoutes.js'
import whatsappRoutes from './routes/whatsappRoutes.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'dompet-ai-server',
    endpoints: {
      health: 'GET /health',
      parseReceipt: 'POST /api/ai/parse-receipt',
      parseTransaction: 'POST /api/ai/parse-transaction',
      whatsappStatus: 'GET /api/whatsapp/status',
      whatsappWebhookVerify: 'GET /api/whatsapp/webhook',
      whatsappWebhookReceive: 'POST /api/whatsapp/webhook',
      webhookVerify: 'GET /webhook',
      webhookReceive: 'POST /webhook',
    },
  })
})

app.use(healthRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/whatsapp', whatsappRoutes)
app.use(webhookRoutes)

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: 'Endpoint tidak ditemukan.',
  })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(error.status || 500).json({
    ok: false,
    message: error.message || 'Terjadi kesalahan server.',
  })
})

export default app
