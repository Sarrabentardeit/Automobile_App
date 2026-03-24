# Deployment VPS (Docker)

Ce setup est prévu pour ton domaine `mecano.nav.ovh` et un déploiement simple:

- `git pull`
- `docker compose -f docker-compose.prod.yml up -d --build`

## 1) Pré-requis serveur

- Debian/Ubuntu VPS
- Docker + Docker Compose plugin installés

## 2) DNS

Dans OVH, crée un enregistrement `A`:

- `mecano.nav.ovh` -> IP publique VPS

Attendre propagation DNS.

## 3) Préparer les variables d'environnement

Dans la racine du projet sur le VPS:

```bash
cp .env.example .env
```

Puis édite `.env` avec de vrais secrets forts:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

## 4) Lancement

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Vérifier:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

## 5) Mise à jour après un changement

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Les migrations Prisma sont appliquées automatiquement au démarrage backend via:

```bash
npx prisma migrate deploy
```

## 6) HTTPS (important)

Ce compose expose HTTP (`:80`).  
Pour prod client, ajoute HTTPS avec Nginx + Certbot (Let's Encrypt) sur le VPS.

## 7) Sauvegardes

Volumes persistants:

- `postgres_data` (base de données)
- `uploads_data` (photos véhicules)

Configurer un backup quotidien des deux.
