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
