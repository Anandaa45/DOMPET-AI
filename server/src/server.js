import 'dotenv/config'
import app from './app.js'
import { startScheduler } from './services/scheduler.js'

const port = process.env.PORT || 9000

const server = app.listen(port, () => {
  console.log(`Dompet AI server running on port ${port}`)
  // Start the reminder scheduler
  startScheduler()
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the old server or set PORT to another value.`)
    process.exit(1)
  }

  throw error
})
