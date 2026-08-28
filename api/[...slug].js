import { app } from '../server/src/app.js'

// Vercel route "attrape-tout" : toute requête vers /api/* est transmise à
// cette fonction avec le chemin d'origine intact (req.url = /api/...), ce
// que l'app Express attend puisque ses routes sont montées sous /api/*.
export default app
