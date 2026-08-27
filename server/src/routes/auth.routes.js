import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db.js'
import { signToken } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Identifiants incorrects.' })
  }

  const token = signToken(user)
  res.json({ token, role: user.role, fullName: user.full_name })
})
