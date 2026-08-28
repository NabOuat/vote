import { Router } from 'express'
import { db } from '../db.js'
import { asyncHandler } from '../lib/asyncHandler.js'

/**
 * Auto-saisie du programme par le candidat lui-même — pas de compte, pas
 * d'authentification : l'accès est protégé par un jeton unique (edit_token)
 * généré à la création du candidat et transmis par l'admin (lien à copier
 * depuis l'écran de gestion du vote). Volontairement non monté sous
 * requireAuth/voterRouter : un vrai candidat n'a souvent pas de compte votant.
 */
export const candidateRouter = Router()

async function getCandidateByToken(candidateId, token) {
  if (!token) return null
  const { rows: [candidate] } = await db.execute({ sql: 'SELECT * FROM candidates WHERE id = ?', args: [candidateId] })
  if (!candidate || candidate.edit_token !== token) return null
  return candidate
}

/** GET /candidates/:id/self?token=... — consulter ses propres infos. */
candidateRouter.get('/:candidateId/self', asyncHandler(async (req, res) => {
  const candidate = await getCandidateByToken(req.params.candidateId, req.query.token)
  if (!candidate) return res.status(404).json({ message: 'Lien invalide.' })

  const { rows: [tour] } = await db.execute({ sql: 'SELECT status FROM tours WHERE id = ?', args: [candidate.tour_id] })
  res.json({
    id: candidate.id,
    fullName: candidate.full_name,
    poste: candidate.poste,
    photoPath: candidate.photo_path,
    program: candidate.program,
    editable: tour?.status === 'UPCOMING',
  })
}))

/** PUT /candidates/:id/self?token=... — renseigner son programme, uniquement
 * tant que le tour n'a pas encore ouvert (empêche toute modification une
 * fois le vote lancé). */
candidateRouter.put('/:candidateId/self', asyncHandler(async (req, res) => {
  const candidate = await getCandidateByToken(req.params.candidateId, req.query.token)
  if (!candidate) return res.status(404).json({ message: 'Lien invalide.' })

  const { rows: [tour] } = await db.execute({ sql: 'SELECT status FROM tours WHERE id = ?', args: [candidate.tour_id] })
  if (tour?.status !== 'UPCOMING') {
    return res.status(409).json({ message: 'Le programme ne peut plus être modifié : le tour a déjà commencé.' })
  }

  const { program } = req.body ?? {}
  await db.execute({ sql: 'UPDATE candidates SET program = ? WHERE id = ?', args: [program?.trim() || null, candidate.id] })
  res.json({ id: candidate.id, program: program?.trim() || null })
}))
