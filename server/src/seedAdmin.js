import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db } from './db.js'

const username = process.env.VOTE_ADMIN_USERNAME ?? 'admin_vote'
const password = process.env.VOTE_ADMIN_PASSWORD ?? 'ChangeMe2026!'
const fullName = process.env.VOTE_ADMIN_NAME ?? 'Administrateur Vote'

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
if (existing) {
  console.log(`Le compte admin "${username}" existe déjà (id=${existing.id}) — rien à faire.`)
  process.exit(0)
}

const hash = bcrypt.hashSync(password, 10)
const result = db.prepare(
  'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)'
).run(username, hash, 'ADMIN_VOTE', fullName)

console.log(`Compte ADMIN_VOTE créé (id=${result.lastInsertRowid}).`)
console.log(`  Identifiant : ${username}`)
console.log(`  Mot de passe : ${password}`)
console.log('Pense à changer ce mot de passe / à fixer VOTE_ADMIN_PASSWORD avant un vrai déploiement.')
