#!/bin/sh
set -e

echo "Application du schéma de base de données…"
# S'il existe des migrations versionnées, on les applique ; sinon on
# synchronise directement le schéma (phase squelette, avant 1re migration).
if [ -d prisma/migrations ]; then
  npx prisma migrate deploy
else
  npx prisma db push
fi

echo "Démarrage de l'API…"
node dist/main.js
