const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN
const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

function getWhatsAppConfig() {
  if (!whatsappAccessToken || !whatsappPhoneNumberId) {
    throw new Error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID.')
  }

  return {
    accessToken: whatsappAccessToken,
    phoneNumberId: whatsappPhoneNumberId,
  }
}

export async function sendWhatsAppText(to, text) {
  const { accessToken, phoneNumberId } = getWhatsAppConfig()
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body: text,
      },
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`WhatsApp reply failed: ${message}`)
  }

  return response.json()
}

export async function getWhatsAppMediaUrl(mediaId) {
  const { accessToken } = getWhatsAppConfig()
  const response = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`WhatsApp media metadata failed: ${message}`)
  }

  const data = await response.json()

  if (!data.url) {
    throw new Error('WhatsApp media URL was not returned.')
  }

  return data.url
}

export async function downloadWhatsAppMedia(mediaId) {
  const { accessToken } = getWhatsAppConfig()
  const mediaUrl = await getWhatsAppMediaUrl(mediaId)
  const response = await fetch(mediaUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`WhatsApp media download failed: ${message}`)
  }

  const arrayBuffer = await response.arrayBuffer()

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'image/jpeg',
  }
}
