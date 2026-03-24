import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CLIENTS_INITIAUX = [
  { nom: 'Ahmed Benali', telephone: '0612345678', email: 'ahmed@example.com', adresse: 'Tunis' },
  { nom: 'Fatma Mansouri', telephone: '0698765432', adresse: 'Sousse' },
  { nom: 'Mohamed Trabelsi', telephone: '0711122233', notes: 'Client fidèle' },
]

const PRODUITS_INITIAUX = [
  { nom: 'HUILE 5W30', quantite: 6, valeur_achat_ttc: 141, categorie: 'Huiles' },
  { nom: 'HUILE 5W40', quantite: 1, valeur_achat_ttc: 124, categorie: 'Huiles' },
  { nom: 'RAF11', quantite: 8, valeur_achat_ttc: 97, categorie: 'Pièces' },
  { nom: 'ESSUIE-GLACE', quantite: 15, valeur_achat_ttc: 4, categorie: 'Consommables' },
  { nom: 'LIQUIDE REF ROUGE', quantite: 11, valeur_achat_ttc: 5, categorie: 'Liquides' },
  { nom: 'PATE A MAIN', quantite: 16, valeur_achat_ttc: 5, categorie: 'Consommables' },
  { nom: 'ANTI USURE', quantite: 1, valeur_achat_ttc: 30, categorie: 'Consommables' },
  { nom: 'RINCAGE', quantite: 10, valeur_achat_ttc: 23.7, categorie: 'Liquides' },
  { nom: 'ADDITIF DIESEL', quantite: 10, valeur_achat_ttc: 19.6, categorie: 'Liquides' },
]

async function main() {
  const clientCount = await prisma.client.count()
  if (clientCount === 0) {
    for (const c of CLIENTS_INITIAUX) {
      await prisma.client.create({
        data: {
          nom: c.nom,
          telephone: c.telephone,
          email: c.email ?? null,
          adresse: c.adresse ?? null,
          notes: c.notes ?? null,
        },
      })
    }
    console.log(`Seed clients: ${CLIENTS_INITIAUX.length} clients créés`)
  }

  const count = await prisma.produitStock.count()
  if (count > 0) {
    console.log('Stock déjà peuplé, skip seed')
    return
  }
  for (const p of PRODUITS_INITIAUX) {
    await prisma.produitStock.create({
      data: {
        nom: p.nom,
        quantite: p.quantite,
        valeur_achat_ttc: p.valeur_achat_ttc,
        categorie: p.categorie,
      },
    })
  }
  console.log(`Seed stock: ${PRODUITS_INITIAUX.length} produits créés`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
