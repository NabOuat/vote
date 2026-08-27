# vote-deg — Système de vote (délégué du personnel)

Application **entièrement indépendante** d'E-CONGES : son propre frontend React
(`frontend/`), son propre backend Node/Express/SQLite (`server/`), son propre
compte de connexion (aucun lien avec Keycloak/E-CONGES).

## Développement local

```bash
npm run install:all   # installe frontend/ ET server/
npm run seed:admin    # crée le premier compte ADMIN_VOTE
npm run dev           # lance frontend (5174) + backend (4300) ensemble
```

Le frontend proxifie `/api/*` vers `http://localhost:4300` en dev
(cf. `frontend/vite.config.js`).

## Déploiement (Coolify ou équivalent)

Un seul service à créer, pointant sur ce dossier (`vote-deg/` comme
répertoire de base, `Dockerfile` à la racine de `vote-deg/`) :

**Variables d'environnement obligatoires :**
- `VOTE_JWT_SECRET` — une vraie valeur aléatoire longue (jamais la valeur par
  défaut du Dockerfile, qui n'existe que pour ne pas planter si oubliée).

**Volumes à monter (sinon tout est perdu à chaque redéploiement) :**
- `/vote-data` — base SQLite
- `/vote-server/uploads` — photos des candidats

Le conteneur fait tourner nginx (sert le frontend + proxy `/api/`) et le
backend Node ensemble (`deploy/docker-entrypoint.sh`) — un seul processus
exposé sur le port 80, rien d'autre à configurer côté réseau.

Une fois en ligne, créer le premier admin :
```bash
docker exec -it <container> node /vote-server/src/seedAdmin.js
```
(ou définir `VOTE_ADMIN_USERNAME`/`VOTE_ADMIN_PASSWORD`/`VOTE_ADMIN_NAME` en
variables d'environnement du service avant de lancer cette commande).
