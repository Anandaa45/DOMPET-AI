export function getWhatsAppStatus(req, res) {
  res.json({
    ok: true,
    verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
  })
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

export function receiveWhatsAppWebhook(req, res) {
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
  }

  res.sendStatus(200)
}
