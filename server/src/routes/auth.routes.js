import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { signToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'

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
