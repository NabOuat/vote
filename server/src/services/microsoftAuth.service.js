import { randomBytes } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const TENANT_ID = process.env.MS_TENANT_ID
const CLIENT_ID = process.env.MS_CLIENT_ID
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET
const REDIRECT_URI = process.env.MS_REDIRECT_URI

const AUTHORITY = TENANT_ID ? `https://login.microsoftonline.com/${TENANT_ID}` : null
const AUTHORIZE_ENDPOINT = AUTHORITY && `${AUTHORITY}/oauth2/v2.0/authorize`
const TOKEN_ENDPOINT = AUTHORITY && `${AUTHORITY}/oauth2/v2.0/token`
const ISSUER = AUTHORITY && `https://login.microsoftonline.com/${TENANT_ID}/v2.0`

// Le jeu de clés publiques de Microsoft, mis en cache et rafraîchi
// automatiquement par jose — sert à vérifier la signature des id_token reçus.
const JWKS = AUTHORITY ? createRemoteJWKSet(new URL(`${AUTHORITY}/discovery/v2.0/keys`)) : null

export function isMicrosoftLoginConfigured() {
  return Boolean(TENANT_ID && CLIENT_ID && CLIENT_SECRET && REDIRECT_URI)
}

/** URL vers laquelle rediriger l'utilisateur pour démarrer la connexion
 * Microsoft. `state` est un jeton anti-CSRF à vérifier au retour (voir
 * generateState). `silent` pilote le comportement SSO :
 *  - false (défaut, clic normal) → prompt=select_account : force l'écran de
 *    choix de compte même si une session Microsoft est déjà active.
 *  - true ("se souvenir de moi", déclenché automatiquement au chargement de
 *    la page si l'utilisateur l'a coché la dernière fois) → prompt=none :
 *    ne montre jamais d'interface Microsoft, réussit silencieusement si une
 *    session valide existe, échoue immédiatement sinon (voir le callback). */
export function buildAuthorizeUrl(state, silent) {
  const url = new URL(AUTHORIZE_ENDPOINT)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', 'openid profile email User.Read')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', silent ? 'none' : 'select_account')
  return url.toString()
}

/** Le préfixe encode si cette tentative était silencieuse ("se souvenir de
 * moi") — round-trip via `state`, qu'Azure AD nous renvoie inchangé, pour
 * que le callback sache comment réagir à un échec sans avoir besoin d'une
 * session serveur (les fonctions Vercel sont sans état). */
export function generateState(silent) {
  return `${silent ? 's' : 'i'}:${randomBytes(24).toString('hex')}`
}

export function wasSilentAttempt(state) {
  return typeof state === 'string' && state.startsWith('s:')
}

/** Échange le code d'autorisation contre un id_token (vérifié : signature,
 * émetteur, audience) + un access_token Graph. Renvoie l'email et
 * l'access_token (utilisable ensuite par fetchJobTitle, tant que le jeton
 * n'a pas expiré — durée de vie courte, ~1h, pas besoin de le stocker). */
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: 'openid profile email User.Read',
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description ?? 'Échec de l\'échange du code Microsoft.')
  }

  const { payload } = await jwtVerify(data.id_token, JWKS, {
    issuer: ISSUER,
    audience: CLIENT_ID,
  })

  const email = payload.email ?? payload.preferred_username
  if (!email) throw new Error('Le jeton Microsoft ne contient aucune adresse email.')
  return { email: email.toLowerCase(), accessToken: data.access_token, idTokenClaims: payload }
}

// TEMP DEBUG — à retirer une fois qu'on a décidé quels champs Microsoft
// exploiter réellement. Renvoie le profil Graph complet (sans $select),
// pour voir tout ce que l'annuaire AFOR expose vraiment.
export async function fetchFullProfile(accessToken) {
  if (!accessToken) return null
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return { error: `Graph a répondu ${res.status}` }
    return await res.json()
  } catch (err) {
    return { error: String(err.message ?? err) }
  }
}

/** Poste occupé (jobTitle) depuis Microsoft Graph — best effort : ne doit
 * jamais faire échouer la connexion si Graph est indisponible ou si le champ
 * est vide côté annuaire. */
export async function fetchJobTitle(accessToken) {
  if (!accessToken) return null
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=jobTitle', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.jobTitle?.trim() || null
  } catch {
    return null
  }
}

/** Photo de profil depuis Microsoft Graph — best effort, comme
 * fetchJobTitle : beaucoup de comptes n'en ont pas (Graph renvoie 404 dans
 * ce cas, ce n'est pas une erreur). Renvoie null ou { buffer, contentType }. */
export async function fetchProfilePhoto(accessToken) {
  if (!accessToken) return null
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    return { buffer, contentType }
  } catch {
    return null
  }
}
