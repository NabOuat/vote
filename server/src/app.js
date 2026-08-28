import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.routes.js'
import { adminRouter } from './routes/admin.routes.js'
import { voterRouter } from './routes/voter.routes.js'
import { candidateRouter } from './routes/candidate.routes.js'
import { syncDueTours } from './services/tourSync.service.js'
import { LOCAL_UPLOADS_DIR } from './middleware/upload.js'
import { migrate } from './db.js'

export const app = express()

app.use(cors())
app.use(express.json())

// Sert les photos écrites en local par storeCandidatePhoto() quand
// BLOB_READ_WRITE_TOKEN est absent (dev sans compte Vercel Blob). En prod,
// storeCandidatePhoto renvoie une URL Blob absolue et ce dossier reste vide.
app.use('/api/uploads', express.static(LOCAL_UPLOADS_DIR))

// Remplace le scheduler node-cron (absent en serverless) : recalcule à
// chaque requête les transitions de statut dues, la qualification du tour 2
// et le flush des bulletins en attente. Voir tourSync.service.js.
app.use(async (req, res, next) => {
  try {
    await migrate()
    await syncDueTours()
  } catch (err) {
    console.error(err)
  }
  next()
})

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/candidates', candidateRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', voterRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Erreur interne du serveur.' })
})
