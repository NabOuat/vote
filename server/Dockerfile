# Backend du module Vote (Express + SQLite). Image séparée du frontend nginx
# (nginx:alpine n'a pas Node) — à faire tourner comme service à côté, cf.
# docker-compose.yml à la racine du dépôt.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src

# vote.db et uploads/ doivent être montés en volume pour persister entre les
# redéploiements (cf. docker-compose.yml).
ENV VOTE_PORT=4300
EXPOSE 4300

CMD ["node", "src/index.js"]
