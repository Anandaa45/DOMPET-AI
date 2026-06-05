import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const { processWhatsAppImageMessage, processWhatsAppTextMessage } = await import('./messageProcessor.js')
const { logSystemEvent } = await import('./logger.js')

const app = express()
const port = process.env.PORT || 4000
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'dompet-ai-server',
    endpoints: {
      health: '/health',
      webhookVerify: 'GET /webhook',
      webhookReceive: 'POST /webhook',
    },
  })
})

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'dompet-ai-server',
  })
})

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
})

app.post('/webhook', async (req, res) => {
  const body = req.body
  const messages = body.entry?.flatMap((entry) => {
    return entry.changes?.flatMap((change) => change.value?.messages || []) || []
  }) || []

  res.sendStatus(200)

  queueMicrotask(async () => {
    for (const message of messages) {
      console.log('Incoming WhatsApp message:', {
        from: message.from,
        id: message.id,
        type: message.type,
        text: message.text?.body || null,
        mediaId: message.image?.id || null,
      })

      if (message.type === 'text') {
        try {
          await processWhatsAppTextMessage(message)
        } catch (error) {
          console.error('Failed to process WhatsApp text message:', error)
          await logSystemEvent('whatsapp_text_error', error.message, {
            severity: 'error',
            metadata: {
              message_id: message.id,
              type: message.type,
            },
          })
        }
      }

      if (message.type === 'image') {
        try {
          await processWhatsAppImageMessage(message)
        } catch (error) {
          console.error('Failed to process WhatsApp image message:', error)
          await logSystemEvent('whatsapp_receipt_error', error.message, {
            severity: 'error',
            metadata: {
              message_id: message.id,
              type: message.type,
            },
          })
        }
      }
    }
  })
})

const server = app.listen(port, () => {
  console.log(`Dompet AI server running on port ${port}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the old server or set PORT to another value.`)
    process.exit(1)
  }

  throw error
})
