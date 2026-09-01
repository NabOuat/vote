import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { signToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isMicrosoftLoginConfigured, buildAuthorizeUrl, generateState, exchangeCode, fetchJobTitle } from '../services/microsoftAuth.service.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis.' })
  }

  const { rows: [user] } = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ? AND active = 1',
    args: [username],
  })
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Identifiants incorrects.' })
  }

  const token = signToken(user)
  res.json({ token, role: user.role, fullName: user.full_name })
}))

/* ── Connexion Microsoft (Entra ID / Azure AD) ─────────────────────────
 * Le compte Microsoft ne fait qu'authentifier la personne — l'autorisation
 * de voter dépend uniquement de la présence de son email dans la table
 * `users` (déjà importée via Excel), jamais d'un provisioning automatique.
 * L'état anti-CSRF est stocké dans un cookie httpOnly de courte durée plutôt
 * qu'en session serveur (les fonctions Vercel sont sans état). */
function parseCookies(header) {
  const out = {}
  ;(header ?? '').split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx === -1) return
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  })
  return out
}

authRouter.get('/microsoft/login', (req, res) => {
  if (!isMicrosoftLoginConfigured()) {
    return res.status(503).json({ message: 'Connexion Microsoft non configurée sur ce déploiement.' })
  }
  const state = generateState()
  res.setHeader('Set-Cookie', `ms_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`)
  res.redirect(buildAuthorizeUrl(state))
})

authRouter.get('/microsoft/callback', asyncHandler(async (req, res) => {
  const frontendBase = `${req.protocol}://${req.get('host')}`
  const fail = (message) => res.redirect(`${frontendBase}/?msError=${encodeURIComponent(message)}`)

  if (!isMicrosoftLoginConfigured()) return fail('Connexion Microsoft non configurée.')

  const { code, state, error_description } = req.query
  if (error_description) return fail(String(error_description))

  const cookies = parseCookies(req.headers.cookie)
  if (!state || state !== cookies.ms_oauth_state) return fail('Requête invalide (état expiré ou incorrect) — réessaie.')
  res.setHeader('Set-Cookie', 'ms_oauth_state=; Path=/; HttpOnly; Max-Age=0')

  let email, accessToken
  try {
    ;({ email, accessToken } = await exchangeCode(code))
  } catch (err) {
    return fail(err.message ?? 'Échec de la connexion Microsoft.')
  }

  const { rows: [user] } = await db.execute({
    sql: 'SELECT * FROM users WHERE username = ? AND active = 1',
    args: [email],
  })
  if (!user) return fail(`Aucun compte de vote associé à ${email}.`)

  // Best effort : complète le poste depuis l'annuaire Microsoft s'il n'a
  // jamais été renseigné (import Excel sans la colonne, ou candidat créé
  // sans poste) — n'écrase jamais une valeur déjà saisie manuellement.
  if (!user.poste) {
    const jobTitle = await fetchJobTitle(accessToken)
    if (jobTitle) {
      await db.execute({ sql: 'UPDATE users SET poste = ? WHERE id = ?', args: [jobTitle, user.id] })
      user.poste = jobTitle
    }
  }

  const token = signToken(user)
  const params = new URLSearchParams({ token, role: user.role, fullName: user.full_name })
  res.redirect(`${frontendBase}/auth/ms-callback?${params.toString()}`)
}))
