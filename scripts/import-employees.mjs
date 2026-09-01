/**
 * Import en masse des comptes employés AFOR à partir d'un fichier Excel
 * (par défaut vote-deg/employees_import.xlsx — RH, jamais commité, voir
 * .gitignore : *.xlsx).
 *
 * Colonnes attendues (première feuille, en-têtes en 1ère ligne) :
 *   - username  : email pro, DOIT se terminer par @afor.ci
 *   - role      : "VOTER" ou "ADMIN_VOTE"
 *   - fullName  : nom complet affiché
 *   - category  : "Cadre" ou "Agent"
 *   - password  : mot de passe en clair, fourni par la RH (obligatoire)
 *
 * Le fichier contient donc des mots de passe en clair : ne jamais le
 * committer (déjà couvert par .gitignore : *.xlsx) ni le diffuser.
 *
 * Idempotent : un compte dont le username existe déjà est ignoré (pas de
 * doublon, pas d'écrasement de mot de passe existant), donc rejouable sans
 * risque si une partie a déjà été importée.
 *
 * Usage :
 *   TURSO_DATABASE_URL=libsql://<ta-base>.turso.io \
 *   TURSO_AUTH_TOKEN=<token turso> \
 *   node scripts/import-employees.mjs [chemin/vers/fichier.xlsx]
 */
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { read, utils } from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_URL = process.env.TURSO_DATABASE_URL
const DB_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!DB_URL || !DB_TOKEN) {
  console.error('TURSO_DATABASE_URL et TURSO_AUTH_TOKEN sont requis.')
  process.exit(1)
}

const xlsxPath = process.argv[2] ?? join(__dirname, '..', 'employees_import.xlsx')
if (!existsSync(xlsxPath)) {
  console.error(`Fichier introuvable : ${xlsxPath}`)
  process.exit(1)
}

const ROLES = new Set(['VOTER', 'ADMIN_VOTE'])
const CATEGORIES = new Set(['Cadre', 'Agent'])
const USERNAME_SUFFIX = '@afor.ci'

const workbook = read(readFileSync(xlsxPath))
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = utils.sheet_to_json(sheet, { defval: '' })

if (rows.length === 0) {
  console.error('Le fichier Excel ne contient aucune ligne.')
  process.exit(1)
}

/** Valide une ligne brute du fichier Excel et normalise ses champs. Les
 * en-têtes sont lus sans tenir compte de la casse (Username/username/…).
 * Renvoie `{ error }` si la ligne est invalide, sinon `{ employee }`. */
function parseRow(row, index) {
  const cells = {}
  for (const [key, value] of Object.entries(row)) {
    cells[key.trim().toLowerCase()] = String(value ?? '').trim()
  }

  const username = (cells.username ?? '').toLowerCase()
  const role = cells.role ?? ''
  const fullName = cells.fullname ?? ''
  const category = cells.category ?? ''
  const password = cells.password ?? ''
  const label = username || `ligne ${index + 2}`

  if (!username) return { error: { username: label, message: 'username manquant.' } }
  if (!username.endsWith(USERNAME_SUFFIX)) {
    return { error: { username: label, message: `username doit se terminer par ${USERNAME_SUFFIX}.` } }
  }
  if (!ROLES.has(role)) return { error: { username: label, message: 'role doit être VOTER ou ADMIN_VOTE.' } }
  if (!fullName) return { error: { username: label, message: 'fullName manquant.' } }
  if (!CATEGORIES.has(category)) return { error: { username: label, message: 'category doit être Cadre ou Agent.' } }
  if (!password) return { error: { username: label, message: 'password manquant.' } }

  return { employee: { username, role, fullName, category, password } }
}

const employees = []
const parseErrors = []
rows.forEach((row, index) => {
  const { employee, error } = parseRow(row, index)
  if (error) parseErrors.push(error)
  else employees.push(employee)
})

const db = createClient({ url: DB_URL, authToken: DB_TOKEN })

// La colonne "category" est additive (voir server/src/db.js, migration 004) —
// on s'assure qu'elle existe avant d'insérer, au cas où ce script tournerait
// contre une base Turso jamais démarrée par le serveur.
const { rows: userColumns } = await db.execute('PRAGMA table_info(users)')
if (!userColumns.some((c) => c.name === 'category')) {
  await db.execute('ALTER TABLE users ADD COLUMN category TEXT')
}

let created = 0
let skipped = 0
const errors = [...parseErrors]

for (const emp of employees) {
  const { rows } = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [emp.username] })
  if (rows.length > 0) { skipped++; continue }
  try {
    const hash = bcrypt.hashSync(emp.password, 10)
    await db.execute({
      sql: 'INSERT INTO users (username, password_hash, role, full_name, category) VALUES (?, ?, ?, ?, ?)',
      args: [emp.username, hash, emp.role, emp.fullName, emp.category],
    })
    created++
  } catch (err) {
    errors.push({ username: emp.username, message: String(err.message) })
  }
}

console.log(`Créés : ${created} | Déjà existants (ignorés) : ${skipped} | Erreurs : ${errors.length}`)
if (errors.length) console.log(JSON.stringify(errors, null, 2))
