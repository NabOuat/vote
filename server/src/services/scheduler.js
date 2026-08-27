import cron from 'node-cron'
import { db } from '../db.js'
import { flushStaging, flushAllStaging } from './ballot.service.js'
import { tallyTour, pickQualifiers } from './tally.service.js'

function activateDueTours() {
  const now = new Date().toISOString()
  const due = db.prepare(
    "SELECT id FROM tours WHERE status = 'UPCOMING' AND starts_at <= ?"
  ).all(now)
  const activate = db.prepare("UPDATE tours SET status = 'ONGOING', activated_at = ? WHERE id = ?")
  for (const tour of due) activate.run(now, tour.id)
}

function qualifyNextTour(closedTour) {
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(closedTour.vote_id)
  if (vote.rounds_count !== 2 || closedTour.tour_number !== 1) return

  const tour2 = db.prepare('SELECT * FROM tours WHERE vote_id = ? AND tour_number = 2').get(vote.id)
  if (!tour2) return // vote mal configuré (tour 2 attendu mais absent) — rien à faire de plus ici

  const ranked = tallyTour(closedTour.id)
  const qualifiers = pickQualifiers(ranked)

  const insertCandidate = db.prepare(`
    INSERT INTO candidates (tour_id, full_name, photo_path, program, qualified_from_candidate_id)
    VALUES (?, ?, ?, ?, ?)
  `)
  const tx = db.transaction(() => {
    for (const q of qualifiers) {
      insertCandidate.run(tour2.id, q.full_name, q.photo_path, q.program, q.id)
    }
  })
  tx()
}

function closeDueTours() {
  const now = new Date().toISOString()
  const due = db.prepare(
    "SELECT * FROM tours WHERE status = 'ONGOING' AND ends_at <= ?"
  ).all(now)

  for (const tour of due) {
    flushStaging(tour.id) // les bulletins doivent être définitifs avant dépouillement
    db.prepare("UPDATE tours SET status = 'CLOSED', closed_at = ? WHERE id = ?").run(now, tour.id)
    qualifyNextTour(tour)
  }
}

export function startScheduler() {
  // Toutes les 30s : transitions de statut + qualification tour 2.
  cron.schedule('*/30 * * * * *', () => {
    activateDueTours()
    closeDueTours()
  })
  // Toutes les 20s : mélange et migration des bulletins en attente. Tourne aussi
  // pendant qu'un tour est ONGOING — c'est voulu pour l'anonymat (voir
  // ballots_staging dans la migration), mais cela ne rend JAMAIS un dépouillement
  // consultable avant la clôture : les endpoints /results ne lisent `ballots`
  // que pour un tour au statut CLOSED (cf. routes/admin.routes.js, routes/voter.routes.js).
  // Un intervalle court réduit la fenêtre où l'ordre d'insertion (receipt vs
  // staging) reste corrélable pour qui aurait un accès direct à la base.
  cron.schedule('*/20 * * * * *', () => {
    flushAllStaging()
  })
}
