## Backend El Mecano (Node.js + PostgreSQL)

### Stack

- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Auth par JWT (access + refresh tokens)

### Installation

1. Aller dans le dossier `backend` :

```bash
cd backend
```

2. Installer les dépendances :

```bash
npm install
```

3. Créer un fichier `.env` à partir de `.env.example` et remplir :

- `DATABASE_URL` : URL PostgreSQL (locale ou hébergée)
- `JWT_ACCESS_SECRET` : chaîne aléatoire (clé access token)
- `JWT_REFRESH_SECRET` : chaîne aléatoire différente (clé refresh token)
- `CORS_ORIGIN` : origine du frontend (par ex. `http://localhost:5173`)

4. Initialiser la base de données :

```bash
npx prisma migrate dev --name init
```

5. Lancer le serveur en dev :

```bash
npm run dev
```

Le backend sera disponible sur `http://localhost:4000`.

### Endpoints auth

- `POST /auth/register`
  - Body : `{ "email": string, "password": string, "fullName": string }`
  - Crée un utilisateur (premiers comptes : rôle `admin`), renvoie :

```json
{
  "user": { "id": 1, "email": "x@y.com", "fullName": "Nom", "role": "admin" },
  "accessToken": "…",
  "refreshToken": "…"
}
```

- `POST /auth/login`
  - Body : `{ "email": string, "password": string }`
  - Vérifie le mot de passe, renvoie les mêmes champs que `/auth/register`.

- `POST /auth/refresh`
  - Body : `{ "refreshToken": string }`
  - Vérifie le refresh token en base, renvoie :

```json
{
  "accessToken": "…",
  "refreshToken": "…"
}
```

### Étapes suivantes

- Ajouter les routes protégées (véhicules, factures, money, caisse, stock).
- Côté frontend, remplacer l’`AuthContext` mock par des appels vers `/auth/login` et `/auth/register`.

