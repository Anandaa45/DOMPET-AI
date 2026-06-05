import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const { processWhatsAppTextMessage } = await import('./messageProcessor.js')

const app = express()
const port = process.env.PORT || 4000
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

app.use(cors())
app.use(express.json())

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
      })

      if (message.type === 'text') {
        try {
          await processWhatsAppTextMessage(message)
        } catch (error) {
          console.error('Failed to process WhatsApp text message:', error)
        }
      }
    }
  })
})

app.listen(port, () => {
  console.log(`Dompet AI server running on port ${port}`)
})
