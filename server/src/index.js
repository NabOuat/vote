import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { voterRouter } from './routes/voter.routes.js'
import { candidateRouter } from './routes/candidate.routes.js'
import { startScheduler } from './services/scheduler.js'
import { UPLOADS_DIR } from './middleware/upload.js'
import './db.js' // exécute la migration au démarrage

const app = express()
const PORT = process.env.VOTE_PORT ?? 4300

app.use(cors())
app.use(express.json())

// Doivent être montés avant voterRouter (qui écoute sur '/' avec une auth
// obligatoire) — sinon toute requête, y compris /health et les photos
// statiques, se fait intercepter par le middleware d'auth du votant.
app.get('/health', (req, res) => res.json({ status: 'ok' }))
app.use('/uploads/candidates', express.static(UPLOADS_DIR))
app.use('/candidates', candidateRouter)

app.use('/auth', authRouter)
app.use('/admin', adminRouter)
app.use('/', voterRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Erreur interne du serveur.' })
})

startScheduler()

app.listen(PORT, () => {
  console.log(`[vote-server] écoute sur http://localhost:${PORT}`)
})
