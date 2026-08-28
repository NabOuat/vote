/**
 * Migration one-shot des données réelles (server/vote.db + photos locales)
 * vers une base Turso + Vercel Blob. À exécuter UNE SEULE FOIS, en local,
 * avec les vraies variables d'environnement de production :
 *
 *   TURSO_DATABASE_URL=libsql://<ta-base>.turso.io \
 *   TURSO_AUTH_TOKEN=<token turso> \
 *   BLOB_READ_WRITE_TOKEN=<token vercel blob> \
 *   node scripts/migrate-to-turso.mjs
 *
 * Ne jamais committer ce fichier avec des identifiants en dur, ni l'exécuter
 * en CI — c'est un script d'opérateur, à lancer manuellement une fois.
 */
import { createClient } from '@libsql/client'
import { put } from '@vercel/blob'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const VOTE_DB_URL = process.env.TURSO_DATABASE_URL ?? process.env.VOTE_DB_URL
const VOTE_DB_TOKEN = process.env.TURSO_AUTH_TOKEN ?? process.env.VOTE_DB_TOKEN
if (!VOTE_DB_URL || !VOTE_DB_TOKEN) {
  console.error('TURSO_DATABASE_URL et TURSO_AUTH_TOKEN (base Turso cible) sont requis.')
  process.exit(1)
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN est requis pour migrer les photos des candidats.')
  process.exit(1)
}

const sourcePath = join(__dirname, '..', 'server', 'vote.db')
if (!existsSync(sourcePath)) {
  console.error(`Base source introuvable : ${sourcePath}`)
  process.exit(1)
}

const source = createClient({ url: `file:${sourcePath}` })
const target = createClient({ url: VOTE_DB_URL, authToken: VOTE_DB_TOKEN })

// Crée le schéma sur la base cible si elle est vide (même fichier que db.js).
const schemaSql = readFileSync(join(__dirname, '..', 'server', 'src', 'migrations', '001_init.sql'), 'utf-8')
await target.executeMultiple(schemaSql)

async function copyTable(table, columns, { transformRow } = {}) {
  const { rows } = await source.execute(`SELECT ${columns.join(', ')} FROM ${table}`)
  console.log(`${table}: ${rows.length} ligne(s)`)
  for (const row of rows) {
    const values = transformRow ? await transformRow(row) : row
    const args = columns.map((c) => values[c])
    await target.execute({
      sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      args,
    })
  }
}

const uploadsDir = join(__dirname, '..', 'server', 'uploads', 'candidates')

await copyTable('users', ['id', 'username', 'password_hash', 'role', 'full_name', 'active', 'created_at'])
await copyTable('sessions', ['id', 'label', 'description', 'created_by', 'created_at'])
await copyTable('votes', ['id', 'session_id', 'label', 'rounds_count', 'created_at'])
await copyTable('tours', ['id', 'vote_id', 'tour_number', 'starts_at', 'ends_at', 'status', 'activated_at', 'closed_at', 'results_published_at'])

await copyTable('candidates', ['id', 'tour_id', 'full_name', 'photo_path', 'program', 'edit_token', 'qualified_from_candidate_id'], {
  transformRow: async (row) => {
    // Ancien format local (`candidates/<fichier>`) → ré-upload vers Blob.
    // Les URLs déjà absolues (ré-exécution du script) sont laissées telles quelles.
    if (row.photo_path && !/^https?:\/\//.test(row.photo_path)) {
      const filename = row.photo_path.replace(/^candidates\//, '')
      const filePath = join(uploadsDir, filename)
      if (existsSync(filePath)) {
        const buffer = readFileSync(filePath)
        const ext = filename.split('.').pop()
        const contentType = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] ?? 'application/octet-stream'
        const blob = await put(`candidates/${filename}`, buffer, { access: 'public', contentType })
        console.log(`  photo migrée : ${filename} → ${blob.url}`)
        return { ...row, photo_path: blob.url }
      }
      console.warn(`  photo introuvable sur disque, gardée telle quelle : ${row.photo_path}`)
    }
    return row
  },
})

await copyTable('vote_receipts', ['id', 'tour_id', 'voter_id', 'voted_at'])
await copyTable('ballots_staging', ['id', 'tour_id', 'candidate_id'])
await copyTable('ballots', ['id', 'tour_id', 'candidate_id'])

console.log('Migration terminée.')
