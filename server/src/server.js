import 'dotenv/config'
import app from './app.js'

const port = process.env.PORT || 4000

const server = app.listen(port, () => {
  console.log(`Dompet AI server running on port ${port}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the old server or set PORT to another value.`)
    process.exit(1)
  }

  throw error
})
