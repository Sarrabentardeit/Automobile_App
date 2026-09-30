import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { totalTTCAchat, valeurLigneStockTTC } from '../lib/achatTotals'

const router = Router()
const db = prisma as any

const STATUTS = ['brouillon', 'validee', 'partiellement_payee', 'payee'] as const
const EPS = 0.01

type AchatPaiementRow = {
  id: number
  achatId: number
  date: string
  montant: number
  mode: string | null
  note: string | null
  createdAt: Date
}

type AchatRow = {
  id: number
  numero: string
  date: string
  fournisseur_id: number | null
  fournisseur_nom: string
  numero_facture_fournisseur: string | null
  mode_paiement: string | null
  commentaire: string | null
  timbre: number
  statut: string
  paye: boolean
  montant_paye: number
  createdAt: Date
  lignes: {
    id: number
    productId: number | null
    type: string | null
    designation: string
    quantite: number
    prix_unitaire: number
  }[]
  paiements?: AchatPaiementRow[]
}

function toAchat(a: AchatRow) {
  return {
    id: a.id,
    numero: a.numero,
    date: a.date,
    fournisseurId: a.fournisseur_id,
    fournisseurNom: a.fournisseur_nom,
    numeroFactureFournisseur: a.numero_facture_fournisseur ?? '',
    modePaiement: a.mode_paiement ?? '',
    commentaire: a.commentaire ?? '',
    timbre: typeof a.timbre === 'number' ? a.timbre : 1,
    statut: a.statut as 'brouillon' | 'validee' | 'partiellement_payee' | 'payee',
    paye: a.paye,
    montantPaye: a.montant_paye ?? 0,
    paiements: (a.paiements ?? []).map(p => ({
      id: p.id,
      date: p.date,
      montant: p.montant,
      mode: p.mode ?? undefined,
      note: p.note ?? undefined,
      createdAt: p.createdAt.toISOString(),
    })),
    lignes: a.lignes.map(l => ({
      productId: l.productId ?? null,
      type: l.type === 'service' ? 'service' : 'produit',
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prix_unitaire,
    })),
    createdAt: a.createdAt.toISOString(),
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

const achatInclude = { lignes: true, paiements: { orderBy: { id: 'asc' } } } as const

function getNextNumero(achats: { numero: string }[]): string {
  const year = new Date().getFullYear().toString().slice(-2)
  const sameYear = achats.filter(a => a.numero.startsWith('A' + year + '-'))
  const max = sameYear.reduce((acc, a) => {
    const num = parseInt(a.numero.split('-')[1] || '0', 10)
    return Math.max(acc, num)
  }, 0)
  return `A${year}-${String(max + 1).padStart(4, '0')}`
}

async function appliquerEntreeStock(
  lignes: { productId: number | null; quantite: number; prix_unitaire: number; designation: string; type?: string | null }[],
  numero: string,
  date: string
) {
  for (const l of lignes) {
    if (l.type === 'service' || l.productId == null) continue
    const produit = await db.produitStock.findUnique({ where: { id: l.productId } })
    if (!produit) throw new Error(`Produit ${l.productId} introuvable`)
    const qte = Math.max(0, Math.floor(Number(l.quantite) || 0))
    if (qte <= 0) continue
    const valeurAjout = valeurLigneStockTTC(qte, Number(l.prix_unitaire) || 0)
    const newQty = produit.quantite + qte
    const newVal = produit.valeur_achat_ttc + valeurAjout
    await db.$transaction([
      db.produitStock.update({
        where: { id: l.productId },
        data: {
          quantite: newQty,
          valeur_achat_ttc: newVal,
          dernier_prix_unitaire_ttc: newQty > 0 ? newVal / newQty : produit.dernier_prix_unitaire_ttc ?? 0,
        },
      }),
      db.mouvementStock.create({
        data: {
          productId: l.productId,
          date,
          produit_nom: produit.nom,
          quantite: qte,
          type: 'entree',
          origine: 'achat',
          reference: numero,
        },
      }),
    ])
  }
}

// GET /achats - liste avec recherche
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const statut = (req.query.statut as string)?.trim()
    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { fournisseur_nom: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (statut && STATUTS.includes(statut as (typeof STATUTS)[number])) {
      where.statut = statut
    }

    const list = (await db.achat.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: achatInclude,
    })) as AchatRow[]

    return res.json(list.map(toAchat))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /achats/next-numero - prochain numéro disponible
router.get('/next-numero', authenticate(), async (_req, res) => {
  try {
    const achats = await db.achat.findMany({ select: { numero: true } })
    return res.json({ numero: getNextNumero(achats) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /achats/:id/paiements - paiement partiel fournisseur
router.post('/:id/paiements', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { date?: string; montant?: number; mode?: string; note?: string }
    if (!body.date?.trim() || typeof body.montant !== 'number' || body.montant <= 0) {
      return res.status(400).json({ error: 'date et montant (positif) requis' })
    }

    const achat = (await db.achat.findUnique({
      where: { id },
      include: achatInclude,
    })) as AchatRow | null
    if (!achat) return res.status(404).json({ error: 'Achat introuvable' })
    if (achat.statut !== 'validee' && achat.statut !== 'partiellement_payee') {
      return res.status(400).json({ error: 'Paiement possible uniquement sur une facture validée non soldée' })
    }

    const totalTTC = round2(totalTTCAchat(achat.lignes, achat.timbre ?? 1))
    const deja = round2(achat.montant_paye ?? 0)
    const reste = round2(totalTTC - deja)
    if (reste <= EPS) return res.status(400).json({ error: 'Facture déjà soldée' })

    const montant = round2(Math.min(body.montant, reste))
    const newPaye = round2(deja + montant)
    const isSolde = totalTTC - newPaye <= EPS
    const nextStatut = isSolde ? 'payee' : 'partiellement_payee'
    const mode = (body.mode ?? '').trim() || null
    const note = (body.note ?? '').trim() || null

    await db.$transaction(async (tx: any) => {
      await tx.achatPaiement.create({
        data: {
          achatId: id,
          date: body.date!.trim(),
          montant,
          mode,
          note,
        },
      })
      await tx.moneyOut.create({
        data: {
          date: body.date!.trim(),
          amount: montant,
          category: 'FOURNISSEUR',
          description: `Paiement achat ${achat.numero} — ${achat.fournisseur_nom}`,
          beneficiary: achat.fournisseur_nom || null,
        },
      })
      await tx.achat.update({
        where: { id },
        data: {
          statut: nextStatut,
          paye: isSolde,
          montant_paye: newPaye,
        },
      })
    })

    const out = (await db.achat.findUnique({
      where: { id },
      include: achatInclude,
    })) as AchatRow
    return res.status(201).json(toAchat(out))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /achats/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const a = (await db.achat.findUnique({
      where: { id },
      include: achatInclude,
    })) as AchatRow | null
    if (!a) return res.status(404).json({ error: 'Achat introuvable' })
    return res.json(toAchat(a))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /achats - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      numero?: string
      date?: string
      fournisseurId?: number | null
      fournisseurNom?: string
      numeroFactureFournisseur?: string
      modePaiement?: string
      commentaire?: string
      timbre?: number
      statut?: string
      paye?: boolean
      lignes?: { productId?: number | null; type?: string; designation: string; quantite: number; prixUnitaire: number }[]
    }

    if (!body.fournisseurNom?.trim()) {
      return res.status(400).json({ error: 'fournisseurNom est requis' })
    }

    const lignesInput = Array.isArray(body.lignes) ? body.lignes : []
    const lignesValides = lignesInput.filter(l => (l.quantite ?? 0) > 0)
    if (lignesValides.length === 0) {
      return res.status(400).json({ error: 'Au moins une ligne avec quantité > 0 est requise' })
    }

    let numero = (body.numero ?? '').trim()
    if (!numero) {
      const achats = await db.achat.findMany({ select: { numero: true } })
      numero = getNextNumero(achats)
    }

    const statut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number]) ? body.statut : 'brouillon'
    const date = (body.date ?? new Date().toISOString().slice(0, 10)).trim()

    let fournisseurNom = body.fournisseurNom.trim()
    if (body.fournisseurId != null) {
      const fournisseur = await db.fournisseur.findUnique({ where: { id: body.fournisseurId } })
      if (fournisseur) fournisseurNom = fournisseur.nom
    }

    const timbre = body.timbre != null && !Number.isNaN(Number(body.timbre)) ? Number(body.timbre) : 1

    const a = (await db.achat.create({
      data: {
        numero,
        date,
        fournisseur_id: body.fournisseurId ?? null,
        fournisseur_nom: fournisseurNom,
        numero_facture_fournisseur: (body.numeroFactureFournisseur ?? '').trim() || null,
        mode_paiement: (body.modePaiement ?? '').trim() || null,
        commentaire: (body.commentaire ?? '').trim() || null,
        timbre,
        statut,
        paye: Boolean(body.paye),
        lignes: {
          create: lignesValides.map(l => ({
            productId: l.type === 'service' ? null : (l.productId ?? null),
            type: l.type === 'service' ? 'service' : 'produit',
            designation: String(l.designation ?? '').trim(),
            quantite: Number(l.quantite) || 0,
            prix_unitaire: Number(l.prixUnitaire) || 0,
          })),
        },
      },
      include: achatInclude,
    })) as AchatRow

    if (statut === 'validee' || statut === 'payee') {
      await appliquerEntreeStock(a.lignes, a.numero, a.date)
    }

    return res.status(201).json(toAchat(a))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /achats/:id - mise à jour
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      numero?: string
      date?: string
      fournisseurId?: number | null
      fournisseurNom?: string
      numeroFactureFournisseur?: string
      modePaiement?: string
      commentaire?: string
      timbre?: number
      statut?: string
      paye?: boolean
      lignes?: { productId?: number | null; type?: string; designation: string; quantite: number; prixUnitaire: number }[]
    }

    const existing = (await db.achat.findUnique({
      where: { id },
      include: achatInclude,
    })) as AchatRow | null

    if (!existing) return res.status(404).json({ error: 'Achat introuvable' })

    const nouveauStatut = body.statut && STATUTS.includes(body.statut as (typeof STATUTS)[number]) ? body.statut : existing.statut
    const etaitBrouillon = existing.statut === 'brouillon'
    const devientValidee = nouveauStatut === 'validee' || nouveauStatut === 'payee'

    let fournisseurNomUpdate: string | undefined
    if (body.fournisseurId !== undefined) {
      if (body.fournisseurId != null) {
        const fournisseur = await db.fournisseur.findUnique({ where: { id: body.fournisseurId } })
        fournisseurNomUpdate = fournisseur ? fournisseur.nom : (body.fournisseurNom ?? existing.fournisseur_nom).trim()
      } else {
        fournisseurNomUpdate = (body.fournisseurNom ?? '').trim()
      }
    } else if (body.fournisseurNom !== undefined) {
      fournisseurNomUpdate = body.fournisseurNom.trim()
    }

    if (body.lignes !== undefined) {
      const lignesValides = Array.isArray(body.lignes) ? body.lignes.filter(l => (l.quantite ?? 0) > 0) : []
      if (lignesValides.length === 0 && (body.statut === 'validee' || body.statut === 'payee')) {
        return res.status(400).json({ error: 'Au moins une ligne avec quantité > 0 est requise pour valider' })
      }

      const dataLignes = lignesValides.map(l => ({
        productId: l.type === 'service' ? null : (l.productId ?? null),
        type: l.type === 'service' ? 'service' : 'produit',
        designation: String(l.designation ?? '').trim(),
        quantite: Number(l.quantite) || 0,
        prix_unitaire: Number(l.prixUnitaire) || 0,
      }))

      const [_, updated] = await db.$transaction([
        db.achatLigne.deleteMany({ where: { achatId: id } }),
        db.achat.update({
          where: { id },
          data: {
            ...(body.numero !== undefined && { numero: body.numero.trim() }),
            ...(body.date !== undefined && { date: body.date.trim() }),
            ...(body.fournisseurId !== undefined && { fournisseur_id: body.fournisseurId ?? null }),
            ...(fournisseurNomUpdate !== undefined && { fournisseur_nom: fournisseurNomUpdate }),
            ...(body.numeroFactureFournisseur !== undefined && { numero_facture_fournisseur: (body.numeroFactureFournisseur ?? '').trim() || null }),
            ...(body.modePaiement !== undefined && { mode_paiement: (body.modePaiement ?? '').trim() || null }),
            ...(body.commentaire !== undefined && { commentaire: (body.commentaire ?? '').trim() || null }),
            ...(body.timbre !== undefined && { timbre: Number(body.timbre) || 0 }),
            ...(body.statut !== undefined && { statut: body.statut }),
            ...(body.paye !== undefined && { paye: body.paye }),
            lignes: { create: dataLignes },
          },
          include: achatInclude,
        }),
      ]) as [unknown, AchatRow]

      if (etaitBrouillon && devientValidee) {
        await appliquerEntreeStock(updated.lignes, updated.numero, updated.date)
      }

      return res.json(toAchat(updated))
    }

    const updated = (await db.achat.update({
      where: { id },
      data: {
        ...(body.numero !== undefined && { numero: body.numero.trim() }),
        ...(body.date !== undefined && { date: body.date.trim() }),
        ...(body.fournisseurId !== undefined && { fournisseur_id: body.fournisseurId ?? null }),
        ...(fournisseurNomUpdate !== undefined && { fournisseur_nom: fournisseurNomUpdate }),
        ...(body.numeroFactureFournisseur !== undefined && { numero_facture_fournisseur: (body.numeroFactureFournisseur ?? '').trim() || null }),
        ...(body.modePaiement !== undefined && { mode_paiement: (body.modePaiement ?? '').trim() || null }),
        ...(body.commentaire !== undefined && { commentaire: (body.commentaire ?? '').trim() || null }),
        ...(body.timbre !== undefined && { timbre: Number(body.timbre) || 0 }),
        ...(body.statut !== undefined && { statut: body.statut }),
        ...(body.paye !== undefined && { paye: body.paye }),
      },
      include: achatInclude,
    })) as AchatRow

    if (etaitBrouillon && devientValidee) {
      await appliquerEntreeStock(updated.lignes, updated.numero, updated.date)
    }

    return res.json(toAchat(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /achats/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.achat.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Achat introuvable' })
    await db.achat.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
