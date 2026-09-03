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
 * ADMIN_VOTE et autorisés à voter — requireRole(['VOTER','ADMIN_VOTE'])).
 * SUPER_ADMIN est implicitement ajouté partout où ADMIN_VOTE est autorisé —
 * un super-admin peut tout faire qu'un admin peut faire, en plus de gérer
 * les rôles (voir requireSuperAdmin, réservé à ça exclusivement). */
export function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role]
  const expanded = allowed.includes('ADMIN_VOTE') && !allowed.includes('SUPER_ADMIN')
    ? [...allowed, 'SUPER_ADMIN']
    : allowed
  return (req, res, next) => {
    if (!expanded.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Accès refusé.' })
    }
    next()
  }
}

/** Réservé à la gestion des rôles (promouvoir/rétrograder admins et
 * super-admins) — volontairement PAS étendu par requireRole, contrairement à
 * ADMIN_VOTE : un admin normal ne doit pas pouvoir se promouvoir lui-même. */
export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Réservé aux super-administrateurs.' })
  }
  next()
}
