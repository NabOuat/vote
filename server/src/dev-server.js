import { app } from './app.js'

const PORT = process.env.VOTE_PORT ?? 4300

app.listen(PORT, () => {
  console.log(`[vote-server] écoute sur http://localhost:${PORT}`)
})
