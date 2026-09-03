/** Résout une adresse IP en "Ville, Pays" pour les statistiques de connexion
 * — best effort uniquement : jamais bloquant pour le login si le service
 * externe est lent ou indisponible (timeout court, échec silencieux). */

const PRIVATE_IP_RE = /^(127\.|10\.|192\.168\.|::1$|fc00:|fe80:)|^172\.(1[6-9]|2\d|3[01])\./

export function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket?.remoteAddress) ?? ''
  return ip.trim().replace(/^::ffff:/, '')
}

export async function lookupLocation(ip) {
  if (!ip || PRIVATE_IP_RE.test(ip)) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal })
    clearTimeout(timeout)
    const data = await res.json()
    if (!data.success) return null
    return [data.city, data.country].filter(Boolean).join(', ') || null
  } catch {
    return null
  }
}
