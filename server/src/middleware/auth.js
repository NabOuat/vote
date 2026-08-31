import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.VOTE_JWT_SECRET ?? 'dev-only-change-me'

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: '12h' }
  )
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Authentification requise.' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Session invalide ou expirée.' })
  }
}

/** Accepte un rôle unique ou un tableau (ex. les comptes RH sont à la fois
 * ADMIN_VOTE et autorisés à voter — requireRole(['VOTER','ADMIN_VOTE'])). */
export function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role]
  return (req, res, next) => {
    if (!allowed.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    next()
  }
}
