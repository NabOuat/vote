/** Client HTTP du module Vote — application entièrement autonome, aucune
 * dépendance avec E-CONGES (ni code, ni session, ni build). */

const BASE_URL = '/api'
const TOKEN_KEY = 'vote_access_token'

export const voteTokenStore = {
  get:   () => localStorage.getItem(TOKEN_KEY),
  set:   (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class VoteApiError extends Error {
  constructor(status, data) {
    super(data?.message ?? `Erreur HTTP ${status}`)
    this.status = status
    this.data = data
  }
}

export async function voteApiFetch(path, options = {}) {
  const token = voteTokenStore.get()
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    voteTokenStore.clear()
    window.dispatchEvent(new Event('vote:session-expired'))
    throw new VoteApiError(401, { message: 'Session expirée, veuillez vous reconnecter.' })
  }

  if (res.status === 204) return null
  const payload = await res.json().catch(() => null)
  if (!res.ok) throw new VoteApiError(res.status, payload)
  return payload
}
