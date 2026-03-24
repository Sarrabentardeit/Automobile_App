import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

type GroupByMode = 'month' | 'quarter'

type TrendPoint = {
  period: string
  caFacture: number
  encaissements: number
  depenses: number
  vehiculesTraites: number
  reclamations: number
  achats: number
  paiementsFournisseurs: number
}

function buildBase(year: number, groupBy: GroupByMode): TrendPoint[] {
  if (groupBy === 'quarter') {
    return ['T1', 'T2', 'T3', 'T4'].map(period => ({
      period,
      caFacture: 0,
      encaissements: 0,
      depenses: 0,
      vehiculesTraites: 0,
      reclamations: 0,
      achats: 0,
      paiementsFournisseurs: 0,
    }))
  }
  return Array.from({ length: 12 }, (_, idx) => {
    const m = idx + 1
    const period = new Date(year, m - 1, 1).toLocaleString('fr-FR', { month: 'short' }).replace('.', '')
    return {
      period,
      caFacture: 0,
      encaissements: 0,
      depenses: 0,
      vehiculesTraites: 0,
      reclamations: 0,
      achats: 0,
      paiementsFournisseurs: 0,
    }
  })
}

function bucketIndex(dateStr: string | null | undefined, year: number, groupBy: GroupByMode): number | null {
  if (!dateStr) return null
  const [y, m] = String(dateStr).slice(0, 10).split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || y !== year || m < 1 || m > 12) return null
  if (groupBy === 'quarter') return Math.floor((m - 1) / 3)
  return m - 1
}

function factureTotalTtc(lignes: any[], timbre: number): number {
  let totalHt = 0
  let depenses = 0
  for (const l of lignes) {
    if (l.type === 'main_oeuvre') totalHt += (Number(l.qte) || 0) * (Number(l.mt_ht) || 0)
    else if (l.type === 'produit') totalHt += (Number(l.qte) || 0) * (Number(l.prix_unitaire_ht) || 0)
    else if (l.type === 'depense') depenses += Number(l.montant) || 0
  }
  const tva = totalHt * 0.19
  return totalHt + tva + depenses + (Number(timbre) || 0)
}

router.get('/trends', authenticate(), async (req, res) => {
  try {
    const now = new Date()
    const year = Math.max(2000, Math.min(2100, Number(req.query.year) || now.getFullYear()))
    const groupBy: GroupByMode = String(req.query.groupBy ?? 'month') === 'quarter' ? 'quarter' : 'month'
    const from = `${year}-01-01`
    const to = `${year}-12-31`

    const [factures, achats, vehicules, reclamations] = await Promise.all([
      db.facture.findMany({
        where: {
          date: { gte: from, lte: to },
          statut: { not: 'annulee' },
        },
        include: { lignes: true },
      }),
      db.achat.findMany({
        where: {
          date: { gte: from, lte: to },
          statut: { in: ['validee', 'payee'] },
        },
        include: { lignes: true },
      }),
      db.vehicule.findMany({
        where: {
          date_sortie: { gte: from, lte: to },
        },
        select: { date_sortie: true },
      }),
      db.reclamation.findMany({
        where: {
          date: { gte: from, lte: to },
        },
        select: { date: true },
      }),
    ])

    const points = buildBase(year, groupBy)

    for (const f of factures) {
      const idx = bucketIndex(f.date, year, groupBy)
      if (idx === null) continue
      const total = factureTotalTtc(f.lignes ?? [], Number(f.timbre) || 0)
      points[idx].caFacture += total
      if (String(f.statut) === 'payee') points[idx].encaissements += total
    }

    for (const a of achats) {
      const idx = bucketIndex(a.date, year, groupBy)
      if (idx === null) continue
      const total = (a.lignes ?? []).reduce((sum: number, l: any) => {
        return sum + (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0)
      }, 0)
      points[idx].achats += total
      points[idx].depenses += total
      if (String(a.statut) === 'payee' || Boolean(a.paye)) points[idx].paiementsFournisseurs += total
    }

    for (const v of vehicules) {
      const idx = bucketIndex(v.date_sortie, year, groupBy)
      if (idx === null) continue
      points[idx].vehiculesTraites += 1
    }

    for (const r of reclamations) {
      const idx = bucketIndex(r.date, year, groupBy)
      if (idx === null) continue
      points[idx].reclamations += 1
    }

    const normalized = points.map(p => ({
      ...p,
      caFacture: Math.round(p.caFacture * 100) / 100,
      encaissements: Math.round(p.encaissements * 100) / 100,
      depenses: Math.round(p.depenses * 100) / 100,
      achats: Math.round(p.achats * 100) / 100,
      paiementsFournisseurs: Math.round(p.paiementsFournisseurs * 100) / 100,
    }))

    return res.json({
      year,
      groupBy,
      source: 'postgresql',
      data: normalized,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
