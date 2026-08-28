import { db } from '../db.js'
import { flushStaging, flushAllStaging } from './ballot.service.js'
import { tallyTour, pickQualifiers } from './tally.service.js'

async function activateDueTours() {
  const now = new Date().toISOString()
  await db.execute({
    sql: "UPDATE tours SET status = 'ONGOING', activated_at = ? WHERE status = 'UPCOMING' AND starts_at <= ?",
    args: [now, now],
  })
}

async function qualifyNextTour(closedTour) {
  const { rows: [vote] } = await db.execute({ sql: 'SELECT * FROM votes WHERE id = ?', args: [closedTour.vote_id] })
  if (vote.rounds_count !== 2 || closedTour.tour_number !== 1) return

  const { rows: [tour2] } = await db.execute({
    sql: "SELECT * FROM tours WHERE vote_id = ? AND tour_number = 2",
    args: [vote.id],
  })
  if (!tour2) return // vote mal configuré (tour 2 attendu mais absent) — rien à faire de plus ici

  const ranked = await tallyTour(closedTour.id)
  const qualifiers = pickQualifiers(ranked)

  const tx = await db.transaction('write')
  try {
    for (const q of qualifiers) {
      await tx.execute({
        sql: `INSERT INTO candidates (tour_id, full_name, photo_path, program, qualified_from_candidate_id)
              VALUES (?, ?, ?, ?, ?)`,
        args: [tour2.id, q.full_name, q.photo_path, q.program, q.id],
      })
    }
    await tx.commit()
  } catch (err) {
    await tx.rollback()
    throw err
  }
}

/**
 * Clôture les tours dus. En environnement serverless, plusieurs invocations
 * peuvent tomber sur la même échéance en même temps : l'UPDATE ne cible que
 * les lignes encore 'ONGOING', et seule l'invocation dont rowsAffected===1
 * pour CE tour continue vers le flush + la qualification tour 2 — les autres
 * s'arrêtent là, ce qui évite de dupliquer les candidats du tour 2.
 */
async function closeDueTours() {
  const now = new Date().toISOString()
  const { rows: due } = await db.execute({
    sql: "SELECT * FROM tours WHERE status = 'ONGOING' AND ends_at <= ?",
    args: [now],
  })

  for (const tour of due) {
    const result = await db.execute({
      sql: "UPDATE tours SET status = 'CLOSED', closed_at = ? WHERE id = ? AND status = 'ONGOING'",
      args: [now, tour.id],
    })
    if (Number(result.rowsAffected) !== 1) continue // une autre invocation a déjà traité ce tour

    await flushStaging(tour.id) // les bulletins doivent être définitifs avant dépouillement
    await qualifyNextTour(tour)
  }
}

/**
 * Remplace le scheduler node-cron : appelé à chaque requête (middleware dans
 * app.js) plutôt que par un process de fond persistant, absent en serverless.
 * Le flush de ballots_staging à chaque appel (et non plus toutes les 20s)
 * réduit encore la fenêtre de corrélation d'ordre d'insertion pour l'anonymat.
 */
export async function syncDueTours() {
  await activateDueTours()
  await closeDueTours()
  await flushAllStaging()
}
