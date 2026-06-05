import { createWorker } from 'tesseract.js'

export async function readReceiptTextFromBuffer(buffer) {
  const worker = await createWorker('ind+eng')

  try {
    const { data } = await worker.recognize(buffer)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
