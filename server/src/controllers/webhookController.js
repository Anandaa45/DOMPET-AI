import { logSystemEvent } from '../logger.js'
import { processWhatsAppImageMessage, processWhatsAppTextMessage } from '../messageProcessor.js'

export function verifyWhatsAppWebhook(req, res) {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge)
    return
  }

  res.sendStatus(403)
}

export function receiveWhatsAppWebhook(req, res) {
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
}
