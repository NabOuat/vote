#!/bin/sh
set -e

envsubst '${VOTE_API_TARGET}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Backend Vote en arrière-plan. S'il crashe, le frontend continue de
# répondre normalement (seul /api/* devient 502).
node /vote-server/src/index.js &

exec nginx -g 'daemon off;'
