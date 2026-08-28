import { app } from '../server/src/app.js'

// Point d'entrée unique de l'API. Le catch-all par nom de fichier
// (api/[...slug].js) ne capturait que le premier segment de chemin sur
// Vercel (/api/health OK, /api/auth/login → 404 platform, jamais atteint la
// fonction) — on repasse donc par le pattern standard "Express on Vercel" :
// vercel.json réécrit /api/:path* vers /api (donc vers ce fichier), Vercel
// conserve le chemin d'origine dans req.url, qu'Express route ensuite
// normalement puisque ses routes sont montées sous /api/*.
export default app
