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
export async function castBallot({ tourId, voterId, candidateId }) {
  const { rows: [tour] } = await db.execute({ sql: 'SELECT * FROM tours WHERE id = ?', args: [tourId] })
  if (!tour) throw new BallotError(404, 'Tour introuvable.')
  if (tour.status !== 'ONGOING') throw new BallotError(409, "Ce tour n'est pas ouvert au vote.")

  // Vérifie l'éligibilité du votant selon la catégorie du vote.
  const { rows: [vote] } = await db.execute({ sql: 'SELECT category FROM votes WHERE id = ?', args: [tour.vote_id] })
  if (vote?.category && vote.category !== 'both') {
    const { rows: [voter] } = await db.execute({ sql: 'SELECT category FROM users WHERE id = ?', args: [voterId] })
    if (voter?.category && voter.category !== vote.category) {
      throw new BallotError(403, `Ce vote est réservé à la catégorie ${vote.category}.`)
    }
  }

  const { rows: [candidate] } = await db.execute({
    sql: 'SELECT id FROM candidates WHERE id = ? AND tour_id = ?',
    args: [candidateId, tourId],
  })
  if (!candidate) throw new BallotError(400, 'Candidat invalide pour ce tour.')

  const tx = await db.transaction('write')
  try {
    try {
      await tx.execute({ sql: 'INSERT INTO vote_receipts (tour_id, voter_id) VALUES (?, ?)', args: [tourId, voterId] })
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        await tx.rollback()
        throw new BallotError(409, 'Vous avez déjà voté pour ce tour.')
      }
      throw err
    }
    await tx.execute({ sql: 'INSERT INTO ballots_staging (tour_id, candidate_id) VALUES (?, ?)', args: [tourId, candidateId] })
    await tx.commit()
  } catch (err) {
    if (!(err instanceof BallotError)) await tx.rollback().catch(() => {})
    throw err
  }
}

/** Mélange et migre les bulletins en attente d'un tour vers la table définitive. */
export async function flushStaging(tourId) {
  const { rows } = await db.execute({ sql: 'SELECT id, candidate_id FROM ballots_staging WHERE tour_id = ?', args: [tourId] })
  if (rows.length === 0) return
  shuffle(rows)

  const tx = await db.transaction('write')
  try {
    for (const row of rows) {
      await tx.execute({ sql: 'INSERT INTO ballots (tour_id, candidate_id) VALUES (?, ?)', args: [tourId, row.candidate_id] })
      await tx.execute({ sql: 'DELETE FROM ballots_staging WHERE id = ?', args: [row.id] })
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

/** Flush de tous les tours ayant des bulletins en attente (appelé à chaque requête). */
export async function flushAllStaging() {
  const { rows } = await db.execute('SELECT DISTINCT tour_id FROM ballots_staging')
  for (const row of rows) await flushStaging(row.tour_id)
}

export async function hasVoted(tourId, voterId) {
  const { rows } = await db.execute({
    sql: 'SELECT 1 FROM vote_receipts WHERE tour_id = ? AND voter_id = ?',
    args: [tourId, voterId],
  })
  return rows.length > 0
}
