import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_PATH = process.env.VOTE_DB_PATH ?? join(__dirname, '..', 'vote.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/** Ajoute une colonne si elle n'existe pas déjà — évite un vrai système de
 * migration pour ce projet de cette taille, sans casser les bases existantes
 * (ALTER TABLE ADD COLUMN n'est pas idempotent, contrairement à CREATE TABLE
 * IF NOT EXISTS utilisé dans 001_init.sql). */
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

function runMigrations() {
  const sql = readFileSync(join(__dirname, 'migrations', '001_init.sql'), 'utf-8')
  db.exec(sql)

  // 002 — lien d'auto-saisie du programme par le candidat lui-même.
  ensureColumn('candidates', 'edit_token', 'TEXT')
  const missingToken = db.prepare('SELECT id FROM candidates WHERE edit_token IS NULL').all()
  if (missingToken.length > 0) {
    const setToken = db.prepare('UPDATE candidates SET edit_token = ? WHERE id = ?')
    const tx = db.transaction(() => {
      for (const c of missingToken) setToken.run(randomUUID(), c.id)
    })
    tx()
  }
}

runMigrations()

export default db
