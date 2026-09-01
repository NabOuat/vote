import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { castBallot, hasVoted, BallotError } from '../services/ballot.service.js'
import { tallyTour } from '../services/tally.service.js'
import { asyncHandler } from '../lib/asyncHandler.js'

export const voterRouter = Router()
// Les comptes RH sont à la fois admin ET votants (même personne, un seul
// compte) — ils doivent donc pouvoir accéder à ces routes de vote comme
// n'importe quel VOTER.
voterRouter.use(requireAuth, requireRole(['VOTER', 'ADMIN_VOTE']))

/** Liste des votes (toutes sessions confondues) avec l'état de chaque tour pour ce votant.
 * Ne renvoie que les votes ouverts à la catégorie professionnelle du votant
 * (category = 'both' ou category = catégorie du votant). */
voterRouter.get('/me/votes', asyncHandler(async (req, res) => {
  const { rows: [voter] } = await db.execute({ sql: 'SELECT category FROM users WHERE id = ?', args: [req.user.sub] })
  const voterCategory = voter?.category ?? null

  const { rows: votes } = await db.execute(`
    SELECT v.*, s.label as session_label FROM votes v
    JOIN sessions s ON s.id = v.session_id
    WHERE v.category = 'both' OR v.category IS NULL OR v.category = ?
    ORDER BY v.created_at DESC
  `, [voterCategory])

  const payload = await Promise.all(votes.map(async (vote) => {
    const { rows: tours } = await db.execute({ sql: 'SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number', args: [vote.id] })
    const toursPayload = await Promise.all(tours.map(async (t) => {
      const { rows: candidates } = await db.execute({
        sql: 'SELECT id, full_name, poste, photo_path, program FROM candidates WHERE tour_id = ?',
        args: [t.id],
      })
      const base = {
        tourId: t.id,
        tourNumber: t.tour_number,
        status: t.status,
        startsAt: t.starts_at,
        endsAt: t.ends_at,
        candidates,
        hasVoted: await hasVoted(t.id, req.user.sub),
      }
      // Résultats visibles uniquement si CE tour est clôturé ET publié — jamais
      // avant, et jamais parce qu'un autre tour du même vote aurait été publié.
      if (t.status === 'CLOSED' && t.results_published_at) {
        base.results = await tallyTour(t.id)
        base.resultsPublishedAt = t.results_published_at
      }
      return base
    }))
    return {
      voteId: vote.id,
      sessionLabel: vote.session_label,
      label: vote.label,
      roundsCount: vote.rounds_count,
      category: vote.category ?? 'both',
      tours: toursPayload,
    }
  }))

  res.json(payload)
}))

/** Dépôt d'un bulletin pour un tour donné. */
voterRouter.post('/tours/:tourId/ballot', asyncHandler(async (req, res) => {
  const { candidateId } = req.body ?? {}
  if (!candidateId) return res.status(400).json({ message: 'candidateId requis.' })
  try {
    await castBallot({ tourId: Number(req.params.tourId), voterId: req.user.sub, candidateId: Number(candidateId) })
    res.status(201).json({ message: 'Vote enregistré.' })
  } catch (err) {
    if (err instanceof BallotError) return res.status(err.status).json({ message: err.message })
    throw err
  }
}))

/** Liste des votants de la MÊME catégorie que le votant connecté (pour
 * transparence : chacun peut voir qui est dans son collège électoral). */
voterRouter.get('/me/voters', asyncHandler(async (req, res) => {
  const { rows: [me] } = await db.execute({ sql: 'SELECT category FROM users WHERE id = ?', args: [req.user.sub] })
  const myCategory = me?.category ?? null
  const { rows } = await db.execute({
    sql: "SELECT id, full_name, poste, category FROM users WHERE role = 'VOTER' AND active = 1 AND (category = ? OR (? IS NULL AND category IS NULL)) ORDER BY full_name",
    args: [myCategory, myCategory],
  })
  res.json(rows)
}))

/** Résultats d'un tour, uniquement si CE tour est clôturé et publié par l'admin. */
voterRouter.get('/tours/:tourId/results', asyncHandler(async (req, res) => {
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [req.params.tourId] })
  if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
  if (tour.status !== 'CLOSED' || !tour.results_published_at) {
    return res.status(403).json({ message: "Les résultats n'ont pas encore été publiés." })
  }
  res.json({ tourId: tour.id, ranking: await tallyTour(tour.id) })
}))
