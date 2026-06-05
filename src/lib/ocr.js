import { recognize } from 'tesseract.js'

export async function readReceiptText(file, onProgress) {
  const { data } = await recognize(file, 'ind+eng', {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(Math.round(message.progress * 100))
      }
    },
  })

  return data.text.trim()
}
