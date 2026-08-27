# ── Build frontend ────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY frontend/ .
RUN npm run build

# ── Build backend ─────────────────────────────────────────────────────────
# Compilé sur la MÊME image de base (nginx:alpine) que le runtime final —
# un binaire natif (better-sqlite3) compilé sur une autre image Alpine
# n'est pas garanti compatible au niveau musl/libc.
FROM nginx:alpine AS vote-build
WORKDIR /app
RUN apk add --no-cache nodejs npm python3 make g++
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY server/src ./src

# ── Runner : nginx (frontend + proxy) + Node (backend) dans le même
# conteneur — un seul service à déployer/gérer ─────────────────────────────
FROM nginx:alpine

RUN apk add --no-cache nodejs

COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf.template /etc/nginx/conf.d/default.conf.template

COPY --from=vote-build /app /vote-server
RUN mkdir -p /vote-data

COPY deploy/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV VOTE_API_TARGET=http://127.0.0.1:4300
ENV VOTE_PORT=4300
ENV VOTE_DB_PATH=/vote-data/vote.db
# À ÉCRASER en prod via les variables d'environnement du service —
# ne jamais garder cette valeur par défaut, elle n'existe que pour ne pas
# planter au démarrage si elle est oubliée.
ENV VOTE_JWT_SECRET=change-me-in-production

CMD ["/docker-entrypoint.sh"]

EXPOSE 80
