import { db } from '../db.js'

/** Dépouillement d'un tour : liste des candidats avec leur nombre de voix, triée. */
export async function tallyTour(tourId) {
  const [{ rows: candidates }, { rows: counts }] = await Promise.all([
    db.execute({ sql: 'SELECT id, full_name, photo_path, program FROM candidates WHERE tour_id = ?', args: [tourId] }),
    db.execute({ sql: 'SELECT candidate_id, COUNT(*) as votes FROM ballots WHERE tour_id = ? GROUP BY candidate_id', args: [tourId] }),
  ])
  const countMap = new Map(counts.map((c) => [c.candidate_id, Number(c.votes)]))

  return candidates
    .map((c) => ({ ...c, votes: countMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes)
}

/**
 * Détermine les qualifiés pour le tour 2 : les 2 meilleurs scores, en incluant
 * tous les ex-æquo sur le seuil du 2e (donc potentiellement 3+ qualifiés).
 */
export function pickQualifiers(rankedCandidates) {
  if (rankedCandidates.length === 0) return []
  const thresholdVotes = rankedCandidates.length >= 2
    ? rankedCandidates[1].votes
    : rankedCandidates[0].votes
  return rankedCandidates.filter((c) => c.votes >= thresholdVotes)
}
