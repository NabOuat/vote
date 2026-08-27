import { db } from '../db.js'
import { shuffle } from '../lib/shuffle.js'

export class BallotError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Dépose un bulletin : enregistre la preuve de participation (unicité) et met
 * le choix en attente dans ballots_staging (jamais dans la même ligne, jamais
 * avec le même identifiant). Le flush périodique (voir flushStaging) mélange
 * et migre ensuite vers `ballots`, qui ne contient aucune trace de l'électeur.
 */
export function castBallot({ tourId, voterId, candidateId }) {
  const tour = db.prepare('SELECT * FROM tours WHERE id = ?').get(tourId)
  if (!tour) throw new BallotError(404, 'Tour introuvable.')
  if (tour.status !== 'ONGOING') throw new BallotError(409, "Ce tour n'est pas ouvert au vote.")

  const candidate = db.prepare('SELECT id FROM candidates WHERE id = ? AND tour_id = ?').get(candidateId, tourId)
  if (!candidate) throw new BallotError(400, 'Candidat invalide pour ce tour.')

  const tx = db.transaction(() => {
    try {
      db.prepare('INSERT INTO vote_receipts (tour_id, voter_id) VALUES (?, ?)').run(tourId, voterId)
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        throw new BallotError(409, 'Vous avez déjà voté pour ce tour.')
      }
      throw err
    }
    db.prepare('INSERT INTO ballots_staging (tour_id, candidate_id) VALUES (?, ?)').run(tourId, candidateId)
  })
  tx()
}

/** Mélange et migre les bulletins en attente d'un tour vers la table définitive. */
export function flushStaging(tourId) {
  const rows = db.prepare('SELECT id, candidate_id FROM ballots_staging WHERE tour_id = ?').all(tourId)
  if (rows.length === 0) return
  shuffle(rows)

  const insert = db.prepare('INSERT INTO ballots (tour_id, candidate_id) VALUES (?, ?)')
  const del = db.prepare('DELETE FROM ballots_staging WHERE id = ?')
  const tx = db.transaction(() => {
    for (const row of rows) {
      insert.run(tourId, row.candidate_id)
      del.run(row.id)
    }
  })
  tx()
}

/** Flush de tous les tours ayant des bulletins en attente (appelé périodiquement). */
export function flushAllStaging() {
  const tourIds = db.prepare('SELECT DISTINCT tour_id FROM ballots_staging').all().map(r => r.tour_id)
  for (const tourId of tourIds) flushStaging(tourId)
}

export function hasVoted(tourId, voterId) {
  return !!db.prepare('SELECT 1 FROM vote_receipts WHERE tour_id = ? AND voter_id = ?').get(tourId, voterId)
}
