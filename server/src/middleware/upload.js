import multer from 'multer'
import { randomUUID } from 'node:crypto'
import { extname, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads', 'candidates')
mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
})

export const uploadCandidatePhoto = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 Mo
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Format de photo non supporté (jpeg, png, webp uniquement).'))
    }
    cb(null, true)
  },
}).single('photo')
