# Salon de la Danse — Plateforme de gestion des bénévoles

Prototype web pour la gestion des 130 bénévoles du Salon de la Danse d'Angers (édition 2027).
Monorepo : une API NestJS, un front React, une base PostgreSQL, le tout déployable en un
`docker compose up`. HTTPS automatique via Caddy.

## Stack

| Couche | Techno |
|---|---|
| API | NestJS + TypeScript, Prisma, PostgreSQL 17 |
| Front | React 19 + Vite + TypeScript, Tailwind, TanStack Query |
| Auth | argon2 (mots de passe) + JWT (cookie HttpOnly) |
| Fichiers | MinIO (S3), redimensionnement `sharp` |
| Mail | nodemailer + Mailpit (dev) |
| Infra | Docker Compose + Caddy (reverse proxy + TLS) |
| CI/CD | GitHub Actions → build → SSH → `docker compose up` |

## Démarrage local (Docker — le plus simple)

```bash
cp .env.example .env
docker compose up -d --build
```

- Front : https://localhost (certificat auto-signé Caddy, accepter l'exception)
- API : https://localhost/api/health
- Swagger : https://localhost/api/docs
- Mailpit (mails de test) : http://localhost:8025
- MinIO (console fichiers) : http://localhost:9001

Charger les données de démo (1 édition, 130 codes, 3 admins, ~40 bénévoles) :

```bash
docker compose exec api npx prisma db seed
```

Les codes d'invitation de démo et les comptes admin s'affichent dans les logs du seed.

## Démarrage local (sans Docker, pour développer vite)

Terminal 1 — API :
```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init   # crée la BDD + la 1re migration
npm run start:dev
```

Terminal 2 — Front :
```bash
cd web
npm install
npm run dev
```
(le front proxifie `/api` vers `http://localhost:3000`)

## Déploiement CI/CD sur le VPS

1. **Sur le VPS**, une fois :
   ```bash
   git clone <votre-repo> salon2danse && cd salon2danse
   cp .env.example .env      # puis éditer : DOMAIN=..., mots de passe, secrets
   docker compose up -d --build
   docker compose exec api npx prisma db seed
   ```
2. **Sur GitHub**, régler les *secrets* du dépôt (Settings → Secrets → Actions) :
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (clé privée), `APP_DIR` (ex. `/home/deploy/salon2danse`).
3. Chaque `push` sur `main` → build de contrôle → déploiement automatique sur le VPS.

> **Si l'HTTPS résiste ce matin** (DNS pas encore propagé) : mettre `DOMAIN=:80` dans `.env`
> pour servir en HTTP simple, avancer sur les features, et revenir au TLS ce soir.

## Prochaines étapes (voir le backlog)

Modules API à créer sous `api/src/` : `auth/`, `invitations/`, `planning/`, `bookings/`
(module de règles métier), `admin/`, `exports/`, `badges/`. Le schéma de données et la
contrainte anti-doublon sont déjà posés dans `api/prisma/schema.prisma`.
