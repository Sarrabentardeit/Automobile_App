# Commandes VPS — mecano.nav.ovh

## Connexion
```bash
ssh root@<IP_DU_VPS>
cd /opt/Automobile_App
```

---

## Mettre à jour l'application
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Voir les logs (erreurs, debug)
```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Redémarrer si problème
```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## Créer un nouvel utilisateur admin
```bash
docker exec -it garage_backend node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('MOT_DE_PASSE', 10);
  const user = await prisma.user.create({
    data: { fullName: 'Nom', email: 'email@example.com', password: hash, role: 'admin' }
  });
  console.log('Créé:', user.email);
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
"
```

---

## Modifier la config Nginx
```bash
nano /etc/nginx/sites-available/mecano.nav.ovh
nginx -t && systemctl reload nginx
```

---

## Vérifier que tout fonctionne
```bash
docker compose -f docker-compose.prod.yml ps
curl https://mecano.nav.ovh/api/health
```
