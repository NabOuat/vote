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
 * verifyState). */
export function buildAuthorizeUrl(state) {
  const url = new URL(AUTHORIZE_ENDPOINT)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', 'openid profile email')
  url.searchParams.set('state', state)
  return url.toString()
}

export function generateState() {
  return randomBytes(24).toString('hex')
}

/** Échange le code d'autorisation contre un id_token, le vérifie (signature,
 * émetteur, audience), et renvoie l'email de l'utilisateur Microsoft. */
export async function exchangeCodeForEmail(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: 'openid profile email',
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
  return email.toLowerCase()
}
