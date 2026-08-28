import multer from 'multer'
import { put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'
import { extname, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const LOCAL_UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** En mémoire uniquement — pas de disque persistant en environnement
 * serverless. Le buffer est ensuite envoyé vers Vercel Blob. */
export const uploadCandidatePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 Mo
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Format de photo non supporté (jpeg, png, webp uniquement).'))
    }
    cb(null, true)
  },
}).single('photo')

/** Envoie le buffer reçu vers Vercel Blob et retourne son URL publique
 * (stockée telle quelle dans candidates.photo_path). En dev local sans
 * BLOB_READ_WRITE_TOKEN, écrit sur disque et retourne une URL servie par
 * express.static (voir app.js) — évite de dépendre d'un compte Vercel Blob
 * juste pour développer en local. */
export async function storeCandidatePhoto(file) {
  const filename = `${randomUUID()}${extname(file.originalname).toLowerCase()}`

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const dir = join(LOCAL_UPLOADS_DIR, 'candidates')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, filename), file.buffer)
    return `/api/uploads/candidates/${filename}`
  }

  const blob = await put(`candidates/${filename}`, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
  })
  return blob.url
}
