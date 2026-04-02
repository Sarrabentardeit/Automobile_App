import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

type ProduitRow = {
  id: number
  nom: string
  quantite: number
  valeur_achat_ttc: number
  categorie: string | null
  prix_vente: number | null
  reference: string
  unite: string
  seuil_alerte: number | null
  fluide_type: string | null
}

function toProduit(p: ProduitRow) {
  return {
    id: p.id,
    nom: p.nom,
    quantite: p.quantite,
    valeurAchatTTC: p.valeur_achat_ttc,
    categorie: p.categorie ?? undefined,
    prixVente: p.prix_vente ?? undefined,
    reference: p.reference ?? '',
    unite: p.unite ?? 'unité',
    seuilAlerte: p.seuil_alerte ?? undefined,
    fluideType: p.fluide_type ?? undefined,
  }
}

function toMouvement(m: { id: number; productId: number; date: string; produit_nom: string; quantite: number; type: string; origine: string; reference: string | null }) {
  return {
    id: m.id,
    productId: m.productId,
    date: m.date,
    produitNom: m.produit_nom,
    quantite: m.quantite,
    type: m.type as 'entree' | 'sortie',
    origine: m.origine as 'achat' | 'facture',
    reference: m.reference ?? undefined,
  }
}

function toMouvementManual(m: { id: number; date: string; produit: string; vehicule: string; technicien: string; neuf_utilise: string; statut: string; prix: number; fournisseur: string }) {
  return {
    id: m.id,
    date: m.date,
    produit: m.produit,
    vehicule: m.vehicule,
    technicien: m.technicien,
    neufUtilise: (m.neuf_utilise === 'occasion' ? 'occasion' : 'neuf') as 'neuf' | 'occasion',
    statut: (m.statut === 'fini' ? 'fini' : 'en_cours') as 'fini' | 'en_cours',
    prix: m.prix,
    fournisseur: m.fournisseur,
  }
}

// GET /stock/produits - liste des produits (?fluidesOnly=1 = catégories Huiles/Liquides ou fluide_type renseigné)
router.get('/produits', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const categorie = (req.query.categorie as string)?.trim()
    const fluidesOnly =
      req.query.fluidesOnly === '1' || String(req.query.fluidesOnly ?? '').toLowerCase() === 'true'

    const and: Record<string, unknown>[] = []
    if (q) {
      and.push({
        OR: [
          { nom: { contains: q, mode: 'insensitive' } },
          { categorie: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
        ],
      })
    }
    if (categorie) and.push({ categorie })
    if (fluidesOnly) {
      and.push({
        OR: [
          { fluide_type: { not: null } },
          { categorie: { contains: 'Huile', mode: 'insensitive' } },
          { categorie: { contains: 'Liquide', mode: 'insensitive' } },
        ],
      })
    }

    const where = and.length ? { AND: and } : undefined

    const list = await db.produitStock.findMany({
      where,
      orderBy: { nom: 'asc' },
    })
    return res.json(list.map((p: ProduitRow) => toProduit(p)))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /stock/produits/:id - détail produit
router.get('/produits/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const p = await db.produitStock.findUnique({ where: { id } })
    if (!p) return res.status(404).json({ error: 'Produit introuvable' })
    return res.json(toProduit(p as ProduitRow))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /stock/produits - créer produit
router.post('/produits', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      nom?: string
      quantite?: number
      valeurAchatTTC?: number
      categorie?: string
      prixVente?: number
      reference?: string
      unite?: string
      seuilAlerte?: number | null
      fluideType?: string | null
    }
    if (!body.nom?.trim()) return res.status(400).json({ error: 'nom est requis' })
    const fluide = body.fluideType?.trim()
    const p = await db.produitStock.create({
      data: {
        nom: body.nom.trim(),
        quantite: Math.max(0, Number(body.quantite) || 0),
        valeur_achat_ttc: Math.max(0, Number(body.valeurAchatTTC) || 0),
        categorie: (body.categorie ?? '').trim() || null,
        prix_vente: body.prixVente != null ? Number(body.prixVente) : null,
        reference: (body.reference ?? '').toString().trim(),
        unite: (body.unite ?? 'unité').toString().trim() || 'unité',
        seuil_alerte: body.seuilAlerte != null ? Number(body.seuilAlerte) : null,
        fluide_type: fluide && fluide.length ? fluide : null,
      },
    })
    return res.status(201).json(toProduit(p as ProduitRow))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /stock/produits/:id - modifier produit
router.put('/produits/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as Partial<{
      nom: string
      quantite: number
      valeurAchatTTC: number
      categorie: string
      prixVente: number
      reference: string
      unite: string
      seuilAlerte: number | null
      fluideType: string | null
    }>
    const existing = await db.produitStock.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' })

    const data: Record<string, unknown> = {}
    if (body.nom != null) data.nom = body.nom.trim()
    if (body.quantite !== undefined) data.quantite = Math.max(0, Number(body.quantite) || 0)
    if (body.valeurAchatTTC !== undefined) data.valeur_achat_ttc = Math.max(0, Number(body.valeurAchatTTC) || 0)
    if (body.categorie !== undefined) data.categorie = (body.categorie ?? '').trim() || null
    if (body.prixVente !== undefined) data.prix_vente = body.prixVente != null ? Number(body.prixVente) : null
    if (body.reference !== undefined) data.reference = (body.reference ?? '').toString().trim()
    if (body.unite !== undefined) data.unite = (body.unite ?? 'unité').toString().trim() || 'unité'
    if (body.seuilAlerte !== undefined) data.seuil_alerte = body.seuilAlerte != null ? Number(body.seuilAlerte) : null
    if (body.fluideType !== undefined) {
      const f = body.fluideType?.toString().trim()
      data.fluide_type = f && f.length ? f : null
    }

    const p = await db.produitStock.update({ where: { id }, data })
    return res.json(toProduit(p as ProduitRow))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /stock/produits/:id - supprimer produit
router.delete('/produits/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.produitStock.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Produit introuvable' })
    await db.produitStock.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /stock/mouvements - liste des mouvements (avec pagination optionnelle)
router.get('/mouvements', authenticate(), async (req, res) => {
  try {
    const productId = req.query.productId as string | undefined
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))
    const where: Record<string, unknown> = {}
    if (productId) {
      const pid = parseInt(productId, 10)
      if (!isNaN(pid)) where.productId = pid
    }
    const list = await db.mouvementStock.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: limit,
    })
    return res.json(list.map(toMouvement))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /stock/mouvements-manuel - historique manuel produit (écran stock général)
router.get('/mouvements-manuel', authenticate(), async (_req, res) => {
  try {
    const list = await db.mouvementProduitManual.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })
    return res.json(list.map(toMouvementManual))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/mouvements-manuel', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      produit?: string
      vehicule?: string
      technicien?: string
      neufUtilise?: 'neuf' | 'occasion'
      statut?: 'fini' | 'en_cours'
      prix?: number
      fournisseur?: string
    }
    if (!body.date || !body.produit?.trim()) {
      return res.status(400).json({ error: 'date et produit requis' })
    }
    const created = await db.mouvementProduitManual.create({
      data: {
        date: body.date,
        produit: body.produit.trim(),
        vehicule: (body.vehicule ?? '').trim(),
        technicien: (body.technicien ?? '').trim(),
        neuf_utilise: body.neufUtilise === 'occasion' ? 'occasion' : 'neuf',
        statut: body.statut === 'fini' ? 'fini' : 'en_cours',
        prix: Number(body.prix) || 0,
        fournisseur: (body.fournisseur ?? '').trim(),
      },
    })
    return res.status(201).json(toMouvementManual(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/mouvements-manuel/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.mouvementProduitManual.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Mouvement introuvable' })

    const body = req.body as {
      date?: string
      produit?: string
      vehicule?: string
      technicien?: string
      neufUtilise?: 'neuf' | 'occasion'
      statut?: 'fini' | 'en_cours'
      prix?: number
      fournisseur?: string
    }
    const data: Record<string, unknown> = {}
    if (body.date !== undefined) data.date = body.date
    if (body.produit !== undefined) data.produit = body.produit.trim()
    if (body.vehicule !== undefined) data.vehicule = body.vehicule.trim()
    if (body.technicien !== undefined) data.technicien = body.technicien.trim()
    if (body.neufUtilise !== undefined) data.neuf_utilise = body.neufUtilise === 'occasion' ? 'occasion' : 'neuf'
    if (body.statut !== undefined) data.statut = body.statut === 'fini' ? 'fini' : 'en_cours'
    if (body.prix !== undefined) data.prix = Number(body.prix) || 0
    if (body.fournisseur !== undefined) data.fournisseur = body.fournisseur.trim()

    const updated = await db.mouvementProduitManual.update({ where: { id }, data })
    return res.json(toMouvementManual(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/mouvements-manuel/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.mouvementProduitManual.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Mouvement introuvable' })
    await db.mouvementProduitManual.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /stock/produits/:id/increment - incrémenter le stock (entrée, ex: achat)
router.post('/produits/:id/increment', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { quantite?: number; origine?: string; reference?: string; valeurAjout?: number }
    const quantite = Math.max(1, Math.floor(Number(body.quantite) || 0))
    const origine = body.origine === 'achat' ? 'achat' : 'achat'
    const reference = (body.reference ?? '').trim() || null
    const valeurAjout = Math.max(0, Number(body.valeurAjout) || 0)

    const produit = await db.produitStock.findUnique({ where: { id } })
    if (!produit) return res.status(404).json({ error: 'Produit introuvable' })

    const [updated] = await db.$transaction([
      db.produitStock.update({
        where: { id },
        data: {
          quantite: produit.quantite + quantite,
          valeur_achat_ttc: produit.valeur_achat_ttc + valeurAjout,
        },
      }),
      db.mouvementStock.create({
        data: {
          productId: id,
          date: new Date().toISOString().slice(0, 10),
          produit_nom: produit.nom,
          quantite,
          type: 'entree',
          origine,
          reference,
        },
      }),
    ])
    return res.json(toProduit(updated as ProduitRow))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /stock/produits/:id/decrement - décrémenter le stock (sortie, ex: facture)
router.post('/produits/:id/decrement', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { quantite?: number; origine?: string; reference?: string }
    const quantite = Math.max(1, Math.floor(Number(body.quantite) || 0))
    const origine = body.origine === 'facture' ? 'facture' : 'facture'
    const reference = (body.reference ?? '').trim() || null

    const produit = await db.produitStock.findUnique({ where: { id } })
    if (!produit) return res.status(404).json({ error: 'Produit introuvable' })
    if (produit.quantite < quantite) {
      return res.status(400).json({ error: 'Stock insuffisant' })
    }

    const valeurUnitaire = produit.quantite > 0 ? produit.valeur_achat_ttc / produit.quantite : 0
    const valeurSortie = valeurUnitaire * quantite

    const [updated] = await db.$transaction([
      db.produitStock.update({
        where: { id },
        data: {
          quantite: produit.quantite - quantite,
          valeur_achat_ttc: Math.max(0, produit.valeur_achat_ttc - valeurSortie),
        },
      }),
      db.mouvementStock.create({
        data: {
          productId: id,
          date: new Date().toISOString().slice(0, 10),
          produit_nom: produit.nom,
          quantite,
          type: 'sortie',
          origine,
          reference,
        },
      }),
    ])
    return res.json(toProduit(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /stock/stats - statistiques
router.get('/stats', authenticate(), async (_req, res) => {
  try {
    const [totalProduits, totalValeur, alertes] = await Promise.all([
      db.produitStock.count(),
      db.produitStock.aggregate({ _sum: { valeur_achat_ttc: true } }),
      db.produitStock.count({ where: { quantite: { gt: 0, lte: 3 } } }),
    ])
    return res.json({
      totalProduits,
      totalValeur: totalValeur._sum.valeur_achat_ttc ?? 0,
      alertesStockFaible: alertes,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
