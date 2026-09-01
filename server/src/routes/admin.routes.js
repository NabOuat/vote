import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uploadCandidatePhoto, storeCandidatePhoto } from '../middleware/upload.js'
import { tallyTour } from '../services/tally.service.js'
import { asyncHandler } from '../lib/asyncHandler.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireRole('ADMIN_VOTE'))

/* ── Sessions ─────────────────────────────────────────────────────── */
adminRouter.post('/sessions', asyncHandler(async (req, res) => {
  const { label, description } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ message: 'Le libellé est requis.' })
  const result = await db.execute({
    sql: 'INSERT INTO sessions (label, description, created_by) VALUES (?, ?, ?)',
    args: [label.trim(), description ?? null, req.user.sub],
  })
  const { rows: [session] } = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [result.lastInsertRowid] })
  res.status(201).json(session)
}))

adminRouter.get('/sessions', asyncHandler(async (req, res) => {
  const { rows } = await db.execute('SELECT * FROM sessions ORDER BY created_at DESC')
  res.json(rows)
}))

adminRouter.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { rows: [session] } = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [req.params.sessionId] })
  if (!session) return res.status(404).json({ message: 'Session introuvable.' })
  const { rows: votes } = await db.execute({ sql: 'SELECT * FROM votes WHERE session_id = ? ORDER BY created_at', args: [session.id] })
  res.json({ ...session, votes })
}))

/** Nombre de bulletins déjà déposés (reçus, pas les bulletins eux-mêmes) sur
 * l'ensemble des tours d'un vote — sert de garde-fou avant toute suppression. */
async function countReceiptsForVote(voteId) {
  const { rows } = await db.execute({
    sql: `SELECT COUNT(*) as n FROM vote_receipts WHERE tour_id IN (SELECT id FROM tours WHERE vote_id = ?)`,
    args: [voteId],
  })
  return Number(rows[0].n)
}

/** Supprime un vote et tout ce qui en dépend (tours, candidats, bulletins).
 * Pas d'ON DELETE CASCADE fiable ici : le client Turso distant (HTTP) ne
 * garantit pas qu'un PRAGMA foreign_keys=ON posé sur un appel persiste sur le
 * suivant — la cascade est donc faite explicitement, dans l'ordre des clés
 * étrangères, au sein d'une transaction. */
async function deleteVoteCascade(tx, voteId) {
  const { rows: tours } = await tx.execute({ sql: 'SELECT id FROM tours WHERE vote_id = ?', args: [voteId] })
  for (const t of tours) {
    await tx.execute({ sql: 'DELETE FROM ballots WHERE tour_id = ?', args: [t.id] })
    await tx.execute({ sql: 'DELETE FROM ballots_staging WHERE tour_id = ?', args: [t.id] })
    await tx.execute({ sql: 'DELETE FROM vote_receipts WHERE tour_id = ?', args: [t.id] })
    await tx.execute({ sql: 'DELETE FROM candidates WHERE tour_id = ?', args: [t.id] })
  }
  await tx.execute({ sql: 'DELETE FROM tours WHERE vote_id = ?', args: [voteId] })
  await tx.execute({ sql: 'DELETE FROM votes WHERE id = ?', args: [voteId] })
}

adminRouter.delete('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const { rows: [session] } = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [req.params.sessionId] })
  if (!session) return res.status(404).json({ message: 'Session introuvable.' })
  const { rows: votes } = await db.execute({ sql: 'SELECT id FROM votes WHERE session_id = ?', args: [session.id] })
  for (const v of votes) {
    if (await countReceiptsForVote(v.id) > 0) {
      return res.status(409).json({ message: 'Impossible de supprimer : au moins un vote de cette session a déjà reçu des bulletins.' })
    }
  }
  const tx = await db.transaction('write')
  try {
    for (const v of votes) await deleteVoteCascade(tx, v.id)
    await tx.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [session.id] })
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
  res.status(204).end()
}))

adminRouter.delete('/votes/:voteId', asyncHandler(async (req, res) => {
  const { rows: [vote] } = await db.execute({ sql: 'SELECT * FROM votes WHERE id = ?', args: [req.params.voteId] })
  if (!vote) return res.status(404).json({ message: 'Vote introuvable.' })
  if (await countReceiptsForVote(vote.id) > 0) {
    return res.status(409).json({ message: 'Impossible de supprimer : ce vote a déjà reçu des bulletins.' })
  }
  const tx = await db.transaction('write')
  try {
    await deleteVoteCascade(tx, vote.id)
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
  res.status(204).end()
}))

/* ── Votes (+ tours) ──────────────────────────────────────────────── */
adminRouter.post('/sessions/:sessionId/votes', asyncHandler(async (req, res) => {
  const { rows: [session] } = await db.execute({ sql: 'SELECT * FROM sessions WHERE id = ?', args: [req.params.sessionId] })
  if (!session) return res.status(404).json({ message: 'Session introuvable.' })

  const { label, roundsCount, tour1, tour2 } = req.body ?? {}
  if (!label?.trim()) return res.status(400).json({ message: 'Le libellé du vote est requis.' })
  if (![1, 2].includes(roundsCount)) return res.status(400).json({ message: 'roundsCount doit être 1 ou 2.' })
  if (!tour1?.startsAt || !tour1?.endsAt) return res.status(400).json({ message: 'Période du tour 1 requise.' })
  if (roundsCount === 2 && (!tour2?.startsAt || !tour2?.endsAt)) {
    return res.status(400).json({ message: 'Période du tour 2 requise pour un vote à 2 tours (passage automatique).' })
  }
  // Le tour 1 ne doit pas démarrer déjà passé — sinon il s'ouvre immédiatement,
  // avant même que des candidats aient pu être ajoutés (verrouillé une fois
  // ONGOING), ce qui bloque le vote sans recours possible depuis l'admin.
  if (new Date(tour1.startsAt).getTime() < Date.now() + 5 * 60000) {
    return res.status(400).json({ message: 'Le tour 1 doit démarrer au moins 5 minutes dans le futur (le temps d\'ajouter les candidats avant l\'ouverture).' })
  }
  if (new Date(tour1.endsAt) <= new Date(tour1.startsAt)) {
    return res.status(400).json({ message: 'La fin du tour 1 doit être postérieure à son début.' })
  }
  if (roundsCount === 2 && new Date(tour2.startsAt) < new Date(tour1.endsAt)) {
    return res.status(400).json({ message: 'Le tour 2 doit commencer après la fin du tour 1.' })
  }

  const tx = await db.transaction('write')
  let voteId
  try {
    const vote = await tx.execute({
      sql: 'INSERT INTO votes (session_id, label, rounds_count) VALUES (?, ?, ?)',
      args: [session.id, label.trim(), roundsCount],
    })
    voteId = vote.lastInsertRowid

    await tx.execute({
      sql: 'INSERT INTO tours (vote_id, tour_number, starts_at, ends_at) VALUES (?, 1, ?, ?)',
      args: [voteId, tour1.startsAt, tour1.endsAt],
    })
    if (roundsCount === 2) {
      await tx.execute({
        sql: 'INSERT INTO tours (vote_id, tour_number, starts_at, ends_at) VALUES (?, 2, ?, ?)',
        args: [voteId, tour2.startsAt, tour2.endsAt],
      })
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }

  res.status(201).json(await getVoteDetail(voteId))
}))

async function getVoteDetail(voteId) {
  const { rows: [vote] } = await db.execute({ sql: 'SELECT * FROM votes WHERE id = ?', args: [voteId] })
  if (!vote) return null
  const { rows: tours } = await db.execute({ sql: 'SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number', args: [voteId] })
  const toursWithCandidates = await Promise.all(tours.map(async (t) => {
    const { rows: candidates } = await db.execute({
      sql: 'SELECT id, full_name, poste, photo_path, program, edit_token FROM candidates WHERE tour_id = ?',
      args: [t.id],
    })
    return { ...t, candidates }
  }))
  return { ...vote, tours: toursWithCandidates }
}

adminRouter.get('/votes/:voteId', asyncHandler(async (req, res) => {
  const detail = await getVoteDetail(req.params.voteId)
  if (!detail) return res.status(404).json({ message: 'Vote introuvable.' })
  res.json(detail)
}))

/* ── Candidats ────────────────────────────────────────────────────── */
adminRouter.post('/tours/:tourId/candidates', (req, res, next) => {
  uploadCandidatePhoto(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    handleCreateCandidate(req, res).catch(next)
  })
})

async function handleCreateCandidate(req, res) {
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [req.params.tourId] })
  if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
  if (tour.status !== 'UPCOMING') {
    return res.status(409).json({ message: 'Impossible de modifier les candidats une fois le tour ouvert.' })
  }
  const { fullName, poste, program } = req.body ?? {}
  if (!fullName?.trim()) return res.status(400).json({ message: 'Le nom du candidat est requis.' })
  if (!req.file) return res.status(400).json({ message: 'La photo est obligatoire.' })

  const photoPath = await storeCandidatePhoto(req.file)
  const editToken = randomUUID()
  const result = await db.execute({
    sql: 'INSERT INTO candidates (tour_id, full_name, poste, photo_path, program, edit_token) VALUES (?, ?, ?, ?, ?, ?)',
    args: [tour.id, fullName.trim(), poste?.trim() || null, photoPath, program?.trim() || null, editToken],
  })

  const { rows: [candidate] } = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [result.lastInsertRowid] })
  res.status(201).json(candidate)
}

/** L'admin peut aussi renseigner/corriger le programme, en plus du lien
 * d'auto-saisie donné au candidat (utile quand le candidat n'a pas Internet,
 * ou pour corriger une coquille) — même contrainte temporelle : verrouillé
 * une fois le tour ouvert, pour ne jamais modifier un programme déjà vu par
 * des électeurs. */
adminRouter.put('/candidates/:candidateId', asyncHandler(async (req, res) => {
  const { rows: [candidate] } = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [req.params.candidateId] })
  if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' })
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [candidate.tour_id] })
  if (tour.status !== 'UPCOMING') {
    return res.status(409).json({ message: 'Impossible de modifier le programme une fois le tour ouvert.' })
  }
  const { program, poste } = req.body ?? {}
  await db.execute({
    sql: 'UPDATE candidates SET program = ?, poste = ? WHERE id = ?',
    args: [program?.trim() || null, poste !== undefined ? (poste?.trim() || null) : candidate.poste, candidate.id],
  })
  const { rows: [updated] } = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [candidate.id] })
  res.json(updated)
}))

adminRouter.delete('/candidates/:candidateId', asyncHandler(async (req, res) => {
  const { rows: [candidate] } = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [req.params.candidateId] })
  if (!candidate) return res.status(404).json({ message: 'Candidat introuvable.' })
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [candidate.tour_id] })
  if (tour.status !== 'UPCOMING') {
    return res.status(409).json({ message: 'Impossible de supprimer un candidat une fois le tour ouvert.' })
  }
  await db.execute({ sql: 'DELETE FROM candidates WHERE id = ?', args: [candidate.id] })
  res.status(204).end()
}))

/* ── Votants (import en masse) ────────────────────────────────────── *
 * Deux sources possibles côté frontend (mêmes règles ici) : collage CSV
 * manuel, ou fichier Excel (username/role/fullName/category/password — voir
 * VotersImport.jsx et scripts/import-employees.mjs). Le mot de passe est
 * toujours fourni en clair par la RH, jamais généré côté serveur. */
const VOTER_ROLES = new Set(['VOTER', 'ADMIN_VOTE'])
const VOTER_CATEGORIES = new Set(['Cadre', 'Agent'])
const AFOR_USERNAME_SUFFIX = '@afor.ci'

adminRouter.post('/voters/import', asyncHandler(async (req, res) => {
  const { voters } = req.body ?? {}
  if (!Array.isArray(voters) || voters.length === 0) {
    return res.status(400).json({ message: 'La liste des votants est vide.' })
  }

  const created = []
  const errors = []
  for (const v of voters) {
    const username = String(v.username ?? '').trim().toLowerCase()
    const fullName = v.fullName?.trim()
    const role = v.role?.trim()
    const category = v.category?.trim() || null
    const label = username || null

    if (!username || !fullName || !v.password) {
      errors.push({ username: label, message: 'username, fullName et password sont requis.' })
      continue
    }
    if (!username.endsWith(AFOR_USERNAME_SUFFIX)) {
      errors.push({ username: label, message: `username doit se terminer par ${AFOR_USERNAME_SUFFIX}.` })
      continue
    }
    if (role && !VOTER_ROLES.has(role)) {
      errors.push({ username: label, message: 'role doit être VOTER ou ADMIN_VOTE.' })
      continue
    }
    if (category && !VOTER_CATEGORIES.has(category)) {
      errors.push({ username: label, message: 'category doit être Cadre ou Agent.' })
      continue
    }

    try {
      const hash = bcrypt.hashSync(v.password, 10)
      const result = await db.execute({
        sql: 'INSERT INTO users (username, password_hash, role, full_name, poste, category) VALUES (?, ?, ?, ?, ?, ?)',
        args: [username, hash, role || 'VOTER', fullName, v.poste?.trim() || null, category],
      })
      created.push({ id: Number(result.lastInsertRowid), username })
    } catch (err) {
      errors.push({ username, message: String(err.message).includes('UNIQUE') ? 'Identifiant déjà utilisé.' : err.message })
    }
  }

  res.status(201).json({ created, errors })
}))

/** Vide la base des votants (role VOTER uniquement — les comptes ADMIN_VOTE
 * ne sont jamais touchés ici, pour ne pas se retrouver sans accès admin).
 *
 * Supprime TOUS les votants, y compris ceux ayant déjà voté : leurs
 * vote_receipts sont supprimés avec eux. Action irréversible, à réserver à
 * un reset de données de test, jamais sur un scrutin réel. */
adminRouter.delete('/voters', asyncHandler(async (req, res) => {
  const { rows: targets } = await db.execute(`SELECT id FROM users WHERE role = 'VOTER'`)

  if (targets.length > 0) {
    const tx = await db.transaction('write')
    try {
      for (const u of targets) {
        await tx.execute({ sql: 'DELETE FROM vote_receipts WHERE voter_id = ?', args: [u.id] })
        await tx.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [u.id] })
      }
      await tx.commit()
    } catch (err) {
      await tx.rollback()
      throw err
    }
  }

  res.json({ deleted: targets.length })
}))

/** Recherche parmi les comptes existants (votants + admins) — utilisé par
 * l'admin pour choisir un candidat parmi les employés déjà importés, plutôt
 * que de ressaisir un nom à la main. */
adminRouter.get('/users/search', asyncHandler(async (req, res) => {
  const q = (req.query.q ?? '').trim()
  if (q.length < 2) return res.json([])
  const { rows } = await db.execute({
    sql: 'SELECT id, full_name, poste FROM users WHERE active = 1 AND full_name LIKE ? ORDER BY full_name LIMIT 20',
    args: [`%${q}%`],
  })
  res.json(rows)
}))

/* ── Résultats & publication ──────────────────────────────────────────
 * Le dépouillement d'un tour n'est jamais exposé (même à l'admin) tant que ce
 * tour précis n'est pas CLOSED — "les résultats sont calculés à la clôture".
 * La publication est une action PAR TOUR (pas par vote) : publier le tour 1
 * ne doit jamais révéler un dépouillement en direct du tour 2 encore ouvert. */
adminRouter.get('/votes/:voteId/results', asyncHandler(async (req, res) => {
  const { rows: [vote] } = await db.execute({ sql: 'SELECT * FROM votes WHERE id = ?', args: [req.params.voteId] })
  if (!vote) return res.status(404).json({ message: 'Vote introuvable.' })
  const { rows: tours } = await db.execute({ sql: 'SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number', args: [vote.id] })
  const results = await Promise.all(tours.map(async (t) => ({
    tourId: t.id,
    tourNumber: t.tour_number,
    status: t.status,
    publishedAt: t.results_published_at,
    ranking: t.status === 'CLOSED' ? await tallyTour(t.id) : null,
  })))
  res.json({ voteId: vote.id, results })
}))

adminRouter.post('/tours/:tourId/publish', asyncHandler(async (req, res) => {
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [req.params.tourId] })
  if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
  if (tour.status !== 'CLOSED') {
    return res.status(409).json({ message: 'Impossible de publier les résultats avant la clôture de ce tour.' })
  }
  const now = new Date().toISOString()
  await db.execute({ sql: 'UPDATE tours SET results_published_at = ? WHERE id = ?', args: [now, tour.id] })
  res.json({ tourId: tour.id, publishedAt: now })
}))
