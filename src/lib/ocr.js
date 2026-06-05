import { createWorker } from 'tesseract.js'

export async function readReceiptText(file, onProgress) {
  const worker = await createWorker('ind+eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onProgress?.(Math.round(message.progress * 100))
      }
    },
  })

  try {
    const { data } = await worker.recognize(file)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
