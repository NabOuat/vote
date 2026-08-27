import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { castBallot, hasVoted, BallotError } from '../services/ballot.service.js'
import { tallyTour } from '../services/tally.service.js'

export const voterRouter = Router()
voterRouter.use(requireAuth, requireRole('VOTER'))

/** Liste des votes (toutes sessions confondues) avec l'état de chaque tour pour ce votant. */
voterRouter.get('/me/votes', (req, res) => {
  const votes = db.prepare(`
    SELECT v.*, s.label as session_label FROM votes v
    JOIN sessions s ON s.id = v.session_id
    ORDER BY v.created_at DESC
  `).all()

  const payload = votes.map(vote => {
    const tours = db.prepare('SELECT * FROM tours WHERE vote_id = ? ORDER BY tour_number').all(vote.id)
    const toursPayload = tours.map(t => {
      const candidates = db.prepare('SELECT id, full_name, photo_path, program FROM candidates WHERE tour_id = ?').all(t.id)
      const base = {
        tourId: t.id,
        tourNumber: t.tour_number,
        status: t.status,
        startsAt: t.starts_at,
        endsAt: t.ends_at,
        candidates,
        hasVoted: hasVoted(t.id, req.user.sub),
      }
      // Résultats visibles uniquement si CE tour est clôturé ET publié — jamais
      // avant, et jamais parce qu'un autre tour du même vote aurait été publié.
      if (t.status === 'CLOSED' && t.results_published_at) {
        base.results = tallyTour(t.id)
        base.resultsPublishedAt = t.results_published_at
      }
      return base
    })
    return {
      voteId: vote.id,
      sessionLabel: vote.session_label,
      label: vote.label,
      roundsCount: vote.rounds_count,
      tours: toursPayload,
    }
  })

  res.json(payload)
})

/** Dépôt d'un bulletin pour un tour donné. */
voterRouter.post('/tours/:tourId/ballot', (req, res) => {
  const { candidateId } = req.body ?? {}
  if (!candidateId) return res.status(400).json({ message: 'candidateId requis.' })
  try {
    castBallot({ tourId: Number(req.params.tourId), voterId: req.user.sub, candidateId: Number(candidateId) })
    res.status(201).json({ message: 'Vote enregistré.' })
  } catch (err) {
    if (err instanceof BallotError) return res.status(err.status).json({ message: err.message })
    throw err
  }
})

/** Résultats d'un tour, uniquement si CE tour est clôturé et publié par l'admin. */
voterRouter.get('/tours/:tourId/results', (req, res) => {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(req.params.tourId)
  if (!tour) return res.status(404).json({ message: 'Tour introuvable.' })
  if (tour.status !== 'CLOSED' || !tour.results_published_at) {
    return res.status(403).json({ message: "Les résultats n'ont pas encore été publiés." })
  }
  res.json({ tourId: tour.id, ranking: tallyTour(tour.id) })
})
