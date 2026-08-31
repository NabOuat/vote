/**
 * Import en masse des comptes employés AFOR (568 comptes : 3 ADMIN_VOTE +
 * 565 VOTER) à partir de vote-deg/employees_import.json — généré une fois
 * par un script séparé à partir du fichier Excel RH, jamais commité (voir
 * .gitignore : employees_import.json contient des mots de passe en clair).
 *
 * NE PAS exécuter sans revue préalable du fichier JSON. Idempotent :
 * un compte dont le username existe déjà est ignoré (pas de doublon, pas
 * d'écrasement de mot de passe existant), donc rejouable sans risque si
 * une partie a déjà été importée.
 *
 * Usage :
 *   TURSO_DATABASE_URL=libsql://<ta-base>.turso.io \
 *   TURSO_AUTH_TOKEN=<token turso> \
 *   node scripts/import-employees.mjs
 */
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_URL = process.env.TURSO_DATABASE_URL
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!DB_URL || !DB_TOKEN) {
  console.error('TURSO_DATABASE_URL et TURSO_AUTH_TOKEN sont requis.')
  process.exit(1)
}

const jsonPath = join(__dirname, '..', 'employees_import.json')
const employees = JSON.parse(readFileSync(jsonPath, 'utf-8'))

const db = createClient({ url: DB_URL, authToken: DB_TOKEN })

let created = 0
let skipped = 0
const errors = []

for (const emp of employees) {
  const { rows } = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [emp.username] })
  if (rows.length > 0) { skipped++; continue }
  try {
    const hash = bcrypt.hashSync(emp.password, 10)
    await db.execute({
      sql: 'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      args: [emp.username, hash, emp.role, emp.fullName],
    })
    created++
  } catch (err) {
    errors.push({ username: emp.username, message: String(err.message) })
  }
}

console.log(`Créés : ${created} | Déjà existants (ignorés) : ${skipped} | Erreurs : ${errors.length}`)
if (errors.length) console.log(JSON.stringify(errors, null, 2))
