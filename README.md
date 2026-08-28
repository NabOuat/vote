# vote-deg — Système de vote (délégué du personnel)

Application **entièrement indépendante** d'E-CONGES : son propre frontend React
(`frontend/`), son propre backend Node/Express (`server/`, servi comme fonction
serverless via `api/[...slug].js`), son propre compte de connexion (aucun lien
avec Keycloak/E-CONGES). Hébergée entièrement sur **Vercel**.

## Architecture

- **Base de données** : [Turso](https://turso.tech) (libSQL, compatible SQLite)
  via `@libsql/client`. En local sans variable d'env → fichier SQLite
  (`server/vote.db`), en prod → base Turso distante. Même code, même API.
- **Photos de candidats** : [Vercel Blob](https://vercel.com/docs/storage/vercel-blob).
  En local sans `BLOB_READ_WRITE_TOKEN`, les photos sont écrites sur disque
  (`server/uploads/`) et servies par `express.static` — aucun compte Vercel
  requis pour développer.
- **Ouverture/clôture des tours** : pas de scheduler en tâche de fond (impossible
  en serverless). Un middleware Express recalcule les transitions dues à
  *chaque requête* (voir `server/src/services/tourSync.service.js`).

## Développement local

```bash
npm run install:all   # installe la racine, frontend/ ET server/
npm run seed:admin    # crée le premier compte ADMIN_VOTE (fichier local vote.db)
npm run dev           # lance frontend (5174) + backend (4300) ensemble
```

Le frontend proxifie `/api/*` vers `http://localhost:4300` en dev
(cf. `frontend/vite.config.js`) — même préfixe qu'en prod, pas de réécriture.

## Déploiement (Vercel)

1. **Importer le repo** sur Vercel (`github.com/NabOuat/vote`). Root Directory
   par défaut (`./`) — `api/` et `frontend/` sont tous les deux à la racine.
2. **Storage** → ajouter une base **Turso** et un store **Vercel Blob** depuis
   l'onglet Storage/Marketplace du projet : les variables d'environnement
   correspondantes (`VOTE_DB_URL`/`VOTE_DB_TOKEN` selon le nommage de
   l'intégration, `BLOB_READ_WRITE_TOKEN`) sont ajoutées automatiquement.
3. **Variable manuelle obligatoire** : `VOTE_JWT_SECRET` — une vraie valeur
   aléatoire longue.
4. **Build** : `vercel.json` définit déjà `installCommand`/`buildCommand`/
   `outputDirectory` (build du frontend uniquement — l'API est une fonction
   serverless, pas un build classique).

### Première mise en production avec les vraies données

Les données réelles existantes (comptes admin/votants/candidats en local dans
`server/vote.db` + photos dans `server/uploads/`) sont à migrer une seule fois
vers Turso/Blob :

```bash
VOTE_DB_URL=libsql://<ta-base>.turso.io \
VOTE_DB_TOKEN=<token turso de prod> \
BLOB_READ_WRITE_TOKEN=<token vercel blob de prod> \
npm run migrate:turso
```

Voir `scripts/migrate-to-turso.mjs` pour le détail. À lancer manuellement,
jamais en CI, jamais avec des identifiants commités.

### Limite de conception (anonymat)

Pas de scheduler persistant : le flush qui mélange les bulletins en attente
(`ballots_staging → ballots`) tourne désormais à chaque requête plutôt que
toutes les 20s — en pratique une meilleure décorrélation temporelle, pas une
régression. Ce n'est toujours pas un système de vote cryptographique (pas de
mixnet, pas de preuve à divulgation nulle) : une séparation applicative
raisonnable pour une élection interne RH, pas pour un scrutin à enjeu légal
élevé.
