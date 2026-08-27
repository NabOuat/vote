import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uploadCandidatePhoto } from '../middleware/upload.js'
import { tallyTour } from '../services/tally.service.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireRole('ADMIN_VOTE'))

/* ── Sessions ─────────────────────────────────────────────────────── */
adminRouter.post('/sessions', (req, res) => {
  const { label, description } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ message: 'Le libellé est requis.' })
  const result = db.prepare('INSERT INTO sessions (label, description, created_by) VALUES (?, ?, ?)')
    .run(label.trim(), description ?? null, req.user.sub)
  res.status(201).json(db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid))
})

adminRouter.get('/sessions', (req, res) => {
  res.json(db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all())
})

adminRouter.get('/sessions/:sessionId', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ message: 'Session introuvable.' })
  const votes = db.prepare('SELECT * FROM votes WHERE session_id = ? ORDER BY created_at').all(session.id)
  res.json({ ...session, votes })
})

/* ── Votes (+ tours) ──────────────────────────────────────────────── */
adminRouter.post('/sessions/:sessionId/votes', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ message: 'Session introuvable.' })

  const { label, roundsCount, tour1, tour2 } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ message: 'Le libellé du vote est requis.' })
  if (![1, 2].includes(roundsCount)) return res.status(400).json({ message: 'roundsCount doit être 1 ou 2.' })
  if (!tour1?.startsAt || !tour1?.endsAt) return res.status(400).json({ message: 'Période du tour 1 requise.' })
  if (roundsCount === 2 && (!tour2?.startsAt || !tour2?.endsAt)) {
    return res.status(400).json({ message: 'Période du tour 2 requise pour un vote à 2 tours (passage automatique).' })
  }
  if (new Date(tour1.endsAt) <= new Date(tour1.startsAt)) {
    return res.status(400).json({ message: 'La fin du tour 1 doit être postérieure à son début.' })
  }
  if (roundsCount === 2 && new Date(tour2.startsAt) < new Date(tour1.endsAt)) {
    return res.status(400).json({ message: 'Le tour 2 doit commencer après la fin du tour 1.' })
  }

  const tx = db.transaction(() => {
    const vote = db.prepare('INSERT INTO votes (session_id, label, rounds_count) VALUES (?, ?, ?)')
      .run(session.id, label.trim(), roundsCount)
    const voteId = vote.lastInsertRowid

    db.prepare('INSERT INTO tours (vote_id, tour_number, starts_at, ends_at) VALUES (?, 1, ?, ?)')
      .run(voteId, tour1.startsAt, tour1.endsAt)
    if (roundsCount === 2) {
      db.prepare('INSERT INTO tours (vote_id, tour_number, starts_at, ends_at) VALUES (?, 2, ?, ?)')
        .run(voteId, tour2.startsAt, tour2.endsAt)
    }
    return voteId
  })

  const voteId = tx()
  res.status(201).json(getVoteDetail(voteId))
})

function getVoteDetail(voteId) {
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(voteId)
  if (!vote) return null
  const tours = db.prepare('SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number').all(voteId)
  const toursWithCandidates = tours.map(t => ({
    ...t,
    candidates: db.prepare('SELECT id, full_name, photo_path, program, edit_token FROM candidates WHERE tour_id = ?').all(t.id),
  }))
  return { ...vote, tours: toursWithCandidates }
}

adminRouter.get('/votes/:voteId', (req, res) => {
  const detail = getVoteDetail(req.params.voteId)
  if (!detail) return res.status(404).json({ message: 'Vote introuvable.' })
  res.json(detail)
})

/* ── Candidats ────────────────────────────────────────────────────── */
adminRouter.post('/tours/:tourId/candidates', (req, res) => {
  uploadCandidatePhoto(req, res, err => {
    if (err) return res.status(400).json({ message: err.message })

    const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.tourId)
    if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
    if (tour.status !== 'UPCOMING') {
      return res.status(409).json({ message: 'Impossible de modifier les candidats une fois le tour ouvert.' })
    }
    const { fullName, program } = req.body ?? {}
    if (!fullName?.trim()) return res.status(400).json({ message: 'Le nom du candidat est requis.' })
    if (!req.file) return res.status(400).json({ message: 'La photo est obligatoire.' })

    const photoPath = `candidates/${req.file.filename}`
    const editToken = randomUUID()
    const result = db.prepare(
      'INSERT INTO candidates (tour_id, full_name, photo_path, program, edit_token) VALUES (?, ?, ?, ?, ?)'
    ).run(tour.id, fullName.trim(), photoPath, program?.trim() || null, editToken)

    res.status(201).json(db.prepare('SELECT * FROM candidates WHERE id = ?').get(result.lastInsertRowid))
  })
})

adminRouter.delete('/candidates/:candidateId', (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.candidateId)
  if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' })
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(candidate.tour_id)
  if (tour.status !== 'UPCOMING') {
    return res.status(409).json({ message: 'Impossible de supprimer un candidat une fois le tour ouvert.' })
  }
  db.prepare('DELETE FROM candidates WHERE id = ?').run(candidate.id)
  res.status(204).end()
})

/* ── Votants (import en masse) ────────────────────────────────────── */
adminRouter.post('/voters/import', (req, res) => {
  const { voters } = req.body ?? {}
  if (!Array.isArray(voters) || voters.length === 0) {
    return res.status(400).json({ message: 'La liste des votants est vide.' })
  }

  const insert = db.prepare(
    'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)'
  )
  const created = []
  const errors = []
  const tx = db.transaction(() => {
    for (const v of voters) {
      if (!v.username?.trim() || !v.fullName?.trim() || !v.password) {
        errors.push({ username: v.username ?? null, message: 'username, fullName et password sont requis.' })
        continue
      }
      try {
        const hash = bcrypt.hashSync(v.password, 10)
        const result = insert.run(v.username.trim(), hash, 'VOTER', v.fullName.trim())
        created.push({ id: result.lastInsertRowid, username: v.username.trim() })
      } catch (err) {
        errors.push({ username: v.username, message: String(err.message).includes('UNIQUE') ? 'Identifiant déjà utilisé.' : err.message })
      }
    }
  })
  tx()

  res.status(201).json({ created, errors })
})

/* ── Résultats & publication ──────────────────────────────────────────
 * Le dépouillement d'un tour n'est jamais exposé (même à l'admin) tant que ce
 * tour précis n'est pas CLOSED — "les résultats sont calculés à la clôture".
 * La publication est une action PAR TOUR (pas par vote) : publier le tour 1
 * ne doit jamais révéler un dépouillement en direct du tour 2 encore ouvert. */
adminRouter.get('/votes/:voteId/results', (req, res) => {
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(req.params.voteId)
  if (!vote) return res.status(404).json({ message: 'Vote introuvable.' })
  const tours = db.prepare('SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number').all(vote.id)
  const results = tours.map(t => ({
    tourId: t.id,
    tourNumber: t.tour_number,
    status: t.status,
    publishedAt: t.results_published_at,
    ranking: t.status === 'CLOSED' ? tallyTour(t.id) : null,
  }))
  res.json({ voteId: vote.id, results })
})

adminRouter.post('/tours/:tourId/publish', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.tourId)
  if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
  if (tour.status !== 'CLOSED') {
    return res.status(409).json({ message: 'Impossible de publier les résultats avant la clôture de ce tour.' })
  }
  const now = new Date().toISOString()
  db.prepare('UPDATE tours SET results_published_at = ? WHERE id = ?').run(now, tour.id)
  res.json({ tourId: tour.id, publishedAt: now })
})
