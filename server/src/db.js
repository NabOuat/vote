import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Sans variable d'env → fichier SQLite local (dev). En prod, l'intégration
// Turso de Vercel injecte TURSO_DATABASE_URL/TURSO_AUTH_TOKEN (on garde
// VOTE_DB_URL/VOTE_DB_TOKEN en repli, pour un nommage manuel si besoin) —
// même client, même API, aucun autre changement de code entre les deux
// environnements.
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? process.env.VOTE_DB_URL ?? `file:${join(__dirname, '..', 'vote.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.VOTE_DB_TOKEN,
})

/** Ajoute une colonne si elle n'existe pas déjà — évite un vrai système de
 * migration pour ce projet de cette taille, sans casser les bases existantes
 * (ALTER TABLE ADD COLUMN n'est pas idempotent, contrairement à CREATE TABLE
 * IF NOT EXISTS utilisé dans 001_init.sql). */
async function ensureColumn(table, column, definition) {
  const { rows } = await db.execute(`PRAGMA table_info(${table})`)
  const cols = rows.map((c) => c.name)
  if (!cols.includes(column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

async function runMigrations() {
  const sql = readFileSync(join(__dirname, 'migrations', '001_init.sql'), 'utf-8')
  await db.executeMultiple(sql)

  // 002 — lien d'auto-saisie du programme par le candidat lui-même.
  await ensureColumn('candidates', 'edit_token', 'TEXT')
  const { rows: missingToken } = await db.execute('SELECT id FROM candidates WHERE edit_token IS NULL')
  if (missingToken.length > 0) {
    const tx = await db.transaction('write')
    try {
      for (const c of missingToken) {
        await tx.execute({ sql: 'UPDATE candidates SET edit_token = ? WHERE id = ?', args: [randomUUID(), c.id] })
      }
      await tx.commit()
    } catch (err) {
      await tx.rollback()
      throw err
    }
  }

  // 003 — poste occupé, affiché à côté du nom (votants et candidats).
  await ensureColumn('users', 'poste', 'TEXT')
  await ensureColumn('candidates', 'poste', 'TEXT')

  // 004 — catégorie professionnelle (Cadre/Agent), renseignée par l'import Excel.
  await ensureColumn('users', 'category', 'TEXT')

  // 005 — photo de profil récupérée depuis Microsoft Graph à la connexion.
  await ensureColumn('users', 'photo_path', 'TEXT')

  // 006 — accueil à la première connexion Microsoft : propose de définir
  // (ou re-définir) un mot de passe personnel pour pouvoir aussi se
  // connecter par email — indépendant du mot de passe déjà attribué par la
  // RH à l'import, que la personne ne connaît pas forcément dans la vraie
  // vie. Se déclenche une seule fois par compte, la première fois qu'il se
  // connecte via Microsoft (peu importe qu'il ait déjà utilisé le login
  // classique avant).
  await ensureColumn('users', 'ms_onboarded', 'INTEGER NOT NULL DEFAULT 0')

  // 007 — téléphone mobile, récupéré depuis Microsoft Graph comme le poste.
  await ensureColumn('users', 'mobile_phone', 'TEXT')
}

let migrated = null
/** Garantit que la migration ne tourne qu'une fois par instance de fonction
 * serverless (les cold starts suivants la relancent, ce qui est sans risque
 * grâce à IF NOT EXISTS / ensureColumn, mais inutile de la refaire à chaque
 * requête d'une même instance encore chaude). */
export function migrate() {
  if (!migrated) migrated = runMigrations()
  return migrated
}

export default db
