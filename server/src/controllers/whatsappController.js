import { sendWhatsAppText } from '../whatsapp.js'
import { logSystemEvent } from '../logger.js'
import { processWhatsAppTextMessage, processWhatsAppImageMessage } from '../messageProcessor.js'

export function getWhatsAppStatus(req, res) {
  res.json({
    ok: true,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
  })
}

export async function sendWhatsAppMessage(req, res, next) {
  try {
    const { to, message } = req.body

    if (!to || !message) {
      return res.status(400).json({ ok: false, message: 'Field "to" dan "message" wajib diisi' })
    }

    const result = await sendWhatsAppText(to, message)

    logSystemEvent('whatsapp_send', `WhatsApp sent to ${to}`, { to, messageId: result.messages?.[0]?.id })

    res.json({ ok: true, data: result })
  } catch (error) {
    console.error('sendWhatsAppMessage error:', error)
    next(error)
  }
}

export function verifyWhatsAppWebhook(req, res) {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).type('text/plain').send(String(challenge || ''))
    return
  }

  res.sendStatus(403)
}

export async function receiveWhatsAppWebhook(req, res, next) {
  const payload = req.body

  console.log('WhatsApp webhook payload:', JSON.stringify(payload, null, 2))

  const messages = payload.entry?.flatMap((entry) => {
    return entry.changes?.flatMap((change) => change.value?.messages || []) || []
  }) || []

  for (const message of messages) {
    console.log('WhatsApp incoming message:', {
      from: message.from || null,
      type: message.type || null,
      text: message.text?.body || null,
    })

    try {
      if (message.type === 'text') {
        await processWhatsAppTextMessage(message)
      } else if (message.type === 'image') {
        await processWhatsAppImageMessage(message)
      }
    } catch (error) {
      console.error('Error processing WhatsApp message:', error)
      // Don't fail the webhook - just log and continue
    }
  }

  res.sendStatus(200)
}
