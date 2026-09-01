import { voteApiFetch, voteTokenStore } from './voteClient.js'

/** Ping non authentifié — sert uniquement à savoir si le backend répond. */
export async function checkVoteBackendHealth() {
  try {
    const res = await fetch('/api/health')
    return res.ok
  } catch {
    return false
  }
}

/* ── Auth ─────────────────────────────────────────────────────────── */
export async function voteLogin({ username, password }) {
  const data = await voteApiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  voteTokenStore.set(data.token)
  return data
}

export function voteLogout() {
  voteTokenStore.clear()
}

/** Modal d'accueil à la première connexion Microsoft (voir VoteLayout.jsx /
 * WelcomePasswordModal.jsx). */
export const setPassword       = (password) => voteApiFetch('/auth/set-password', { method: 'POST', body: JSON.stringify({ password }) })
export const skipPasswordSetup = () => voteApiFetch('/auth/skip-password-setup', { method: 'POST' })

/* ── Admin — sessions & votes ─────────────────────────────────────── */
export const listSessions        = () => voteApiFetch('/admin/sessions')
export const createSession       = (data) => voteApiFetch('/admin/sessions', { method: 'POST', body: JSON.stringify(data) })
export const getSessionDetail    = (id) => voteApiFetch(`/admin/sessions/${id}`)
export const createVote          = (sessionId, data) => voteApiFetch(`/admin/sessions/${sessionId}/votes`, { method: 'POST', body: JSON.stringify(data) })
export const getVoteDetail       = (voteId) => voteApiFetch(`/admin/votes/${voteId}`)
export const getVoteResultsAdmin  = (voteId) => voteApiFetch(`/admin/votes/${voteId}/results`)
export const publishTourResults   = (tourId) => voteApiFetch(`/admin/tours/${tourId}/publish`, { method: 'POST' })
export const deleteSession        = (sessionId) => voteApiFetch(`/admin/sessions/${sessionId}`, { method: 'DELETE' })
export const deleteVote           = (voteId) => voteApiFetch(`/admin/votes/${voteId}`, { method: 'DELETE' })

/* ── Admin — candidats ────────────────────────────────────────────── */
/** `photo` (fichier uploadé) et `photoUrl` (photo Microsoft déjà en Blob,
 * réutilisée telle quelle depuis le sélecteur d'employé) sont mutuellement
 * exclusifs — l'un des deux est requis. */
export function createCandidate(tourId, { fullName, poste, program, photo, photoUrl }) {
  const form = new FormData()
  form.append('fullName', fullName)
  if (poste) form.append('poste', poste)
  if (program) form.append('program', program)
  if (photo) form.append('photo', photo)
  else if (photoUrl) form.append('photoUrl', photoUrl)
  return voteApiFetch(`/admin/tours/${tourId}/candidates`, { method: 'POST', body: form })
}
export const deleteCandidate = (candidateId) => voteApiFetch(`/admin/candidates/${candidateId}`, { method: 'DELETE' })
export const updateCandidateInfo = (candidateId, { program, poste }) => voteApiFetch(`/admin/candidates/${candidateId}`, { method: 'PUT', body: JSON.stringify({ program, poste }) })

/* ── Admin — votants ──────────────────────────────────────────────── */
export const importVoters = (voters) => voteApiFetch('/admin/voters/import', { method: 'POST', body: JSON.stringify({ voters }) })
export const searchUsers   = (q) => voteApiFetch(`/admin/users/search?q=${encodeURIComponent(q)}`)
/** Supprime TOUS les votants (role VOTER), y compris ceux ayant déjà voté
 * (leurs vote_receipts sont supprimés avec eux). Action irréversible. Les
 * comptes ADMIN_VOTE ne sont jamais touchés. */
export const clearVoters = () => voteApiFetch('/admin/voters', { method: 'DELETE' })

/* ── Votant ───────────────────────────────────────────────────────── */
export const listMyVotes    = () => voteApiFetch('/me/votes')
export const castBallot     = (tourId, candidateId) => voteApiFetch(`/tours/${tourId}/ballot`, { method: 'POST', body: JSON.stringify({ candidateId }) })
export const getTourResults = (tourId) => voteApiFetch(`/tours/${tourId}/results`)

/** photo_path est soit une URL Vercel Blob absolue (prod), soit un chemin
 * `/api/uploads/candidates/...` servi par express.static en dev sans compte
 * Blob (voir storeCandidatePhoto côté backend) — les deux se consomment tels
 * quels. Dernier cas : l'ancien format `candidates/xxx` d'avant la migration
 * Vercel, pour des données locales pas encore repassées par le script de
 * migration. */
export function candidatePhotoUrl(photoPath) {
  if (!photoPath) return null
  if (/^https?:\/\//.test(photoPath) || photoPath.startsWith('/api/uploads/')) return photoPath
  return `/api/uploads/${photoPath}`
}

/* ── Auto-saisie candidat (public, protégé par jeton — pas de compte) ────
 * Appels directs en fetch : aucune authentification n'entre en jeu ici. */
export async function getCandidateSelf(candidateId, token) {
  const res = await fetch(`/api/candidates/${candidateId}/self?token=${encodeURIComponent(token)}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message ?? 'Lien invalide.')
  return data
}

export async function updateCandidateSelf(candidateId, token, program) {
  const res = await fetch(`/api/candidates/${candidateId}/self?token=${encodeURIComponent(token)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ program }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message ?? 'Erreur lors de l\'enregistrement.')
  return data
}

/** Construit le lien à transmettre au candidat pour qu'il saisisse son programme. */
export function candidateSelfLink(candidateId, token) {
  return `${window.location.origin}/candidat/${candidateId}?token=${token}`
}
