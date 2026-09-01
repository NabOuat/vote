import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { isMicrosoftLoginConfigured, buildAuthorizeUrl, generateState, wasSilentAttempt, exchangeCode, fetchJobTitle, fetchProfilePhoto, fetchFullProfile } from '../services/microsoftAuth.service.js'
import { storeCandidatePhoto } from '../middleware/upload.js'

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
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Identifiants incorrects.' })
  }

  const token = signToken(user)
  res.json({ token, role: user.role, fullName: user.full_name, poste: user.poste ?? '', photoPath: user.photo_path ?? '' })
}))

/** Définit (ou redéfinit) le mot de passe personnel de l'utilisateur connecté
 * — appelé depuis le modal d'accueil à la première connexion Microsoft, pour
 * pouvoir ensuite se connecter aussi par email + mot de passe. */
authRouter.post('/set-password', requireAuth, asyncHandler(async (req, res) => {
  const { password } = req.body ?? {}
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  }
  const hash = bcrypt.hashSync(password, 10)
  await db.execute({
    sql: 'UPDATE users SET password_hash = ?, ms_onboarded = 1 WHERE id = ?',
    args: [hash, req.user.sub],
  })
  res.json({ message: 'Mot de passe défini.' })
}))

/** "Plus tard" dans le modal d'accueil — ne redemandera plus, sans définir
 * de mot de passe (la personne continue avec Microsoft uniquement). */
authRouter.post('/skip-password-setup', requireAuth, asyncHandler(async (req, res) => {
  await db.execute({ sql: 'UPDATE users SET ms_onboarded = 1 WHERE id = ?', args: [req.user.sub] })
  res.json({ message: 'OK' })
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
  // ?silent=1 : déclenché automatiquement au chargement de la page si
  // l'utilisateur a coché "Se souvenir de moi" la dernière fois — voir
  // buildAuthorizeUrl pour ce que ça change côté Microsoft.
  const silent = req.query.silent === '1'
  const state = generateState(silent)
  res.setHeader('Set-Cookie', `ms_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`)
  res.redirect(buildAuthorizeUrl(state, silent))
})

authRouter.get('/microsoft/callback', asyncHandler(async (req, res) => {
  const frontendBase = `${req.protocol}://${req.get('host')}`
  const { code, state, error, error_description } = req.query
  const silent = wasSilentAttempt(state)
  // Une tentative silencieuse qui échoue (pas de session Microsoft active,
  // ou compte non autorisé) ne doit jamais afficher de bandeau d'erreur —
  // c'est un comportement attendu, pas une vraie erreur pour l'utilisateur.
  // Il retombe silencieusement sur le formulaire de connexion classique.
  const fail = (message) => res.redirect(
    silent ? `${frontendBase}/?msSilentFailed=1` : `${frontendBase}/?msError=${encodeURIComponent(message)}`
  )

  if (!isMicrosoftLoginConfigured()) return fail('Connexion Microsoft non configurée.')
  if (error || error_description) return fail(String(error_description ?? error))

  const cookies = parseCookies(req.headers.cookie)
  if (!state || state !== cookies.ms_oauth_state) return fail('Requête invalide (état expiré ou incorrect) — réessaie.')
  res.setHeader('Set-Cookie', 'ms_oauth_state=; Path=/; HttpOnly; Max-Age=0')

  let email, accessToken, idTokenClaims
  try {
    ;({ email, accessToken, idTokenClaims } = await exchangeCode(code))
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

  // Idem pour la photo de profil — beaucoup de comptes n'en ont pas, dans ce
  // cas fetchProfilePhoto renvoie simplement null et on ne touche à rien.
  if (!user.photo_path) {
    const photo = await fetchProfilePhoto(accessToken)
    if (photo) {
      const ext = photo.contentType.includes('png') ? '.png' : '.jpg'
      const url = await storeCandidatePhoto({ buffer: photo.buffer, mimetype: photo.contentType, originalname: `profile${ext}` }, 'users')
      await db.execute({ sql: 'UPDATE users SET photo_path = ? WHERE id = ?', args: [url, user.id] })
      user.photo_path = url
    }
  }

  const token = signToken(user)
  const params = new URLSearchParams({
    token, role: user.role, fullName: user.full_name,
    poste: user.poste ?? '', photoPath: user.photo_path ?? '',
    needsPassword: user.ms_onboarded ? '0' : '1',
  })

  // TEMP DEBUG — à retirer : dump complet de ce que Microsoft nous a envoyé
  // (claims du id_token + profil Graph sans filtre), pour décider quels
  // champs vaut la peine d'exploiter. Encodé dans l'URL plutôt que stocké
  // en base — purement transitoire, jamais persisté.
  try {
    const graphProfile = await fetchFullProfile(accessToken)
    const debugPayload = Buffer.from(JSON.stringify({ idTokenClaims, graphProfile }, null, 2)).toString('base64url')
    params.set('msDebug', debugPayload)
  } catch { /* le dump ne doit jamais bloquer la connexion */ }

  res.redirect(`${frontendBase}/auth/ms-callback?${params.toString()}`)
}))
