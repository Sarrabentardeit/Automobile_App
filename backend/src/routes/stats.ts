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

/**
 * Moyenne du temps passé en statut EN COURS (orange) par technicien.
 * Pour chaque technicien : somme des minutes EN COURS sur ses véhicules / nombre de véhicules.
 * Filtre optionnel mois/année = date de sortie du statut EN COURS (changement d'état).
 */
router.get('/temps-en-cours-techniciens', authenticate(), async (req, res) => {
  try {
    const now = new Date()
    const year = Math.max(2000, Math.min(2100, Number(req.query.year) || now.getFullYear()))
    const monthRaw = req.query.month != null && req.query.month !== '' ? Number(req.query.month) : null
    const month =
      monthRaw != null && Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null

    const [histRows, users] = await Promise.all([
      db.vehiculeHistorique.findMany({
        where: {
          etat_precedent: 'orange',
          duree_etat_precedent_min: { not: null, gt: 0 },
        },
        select: {
          vehiculeId: true,
          date_changement: true,
          duree_etat_precedent_min: true,
          vehicule: {
            select: {
              id: true,
              technicien_id: true,
              notes: true,
              modele: true,
              immatriculation: true,
            },
          },
        },
      }),
      db.user.findMany({
        select: { id: true, fullName: true, email: true, role: true, statut: true },
      }),
    ])

    const nameById = new Map<number, string>()
    for (const u of users as Array<{ id: number; fullName: string | null; email: string }>) {
      nameById.set(u.id, (u.fullName || u.email || `User #${u.id}`).trim())
    }

    type VehicleAgg = {
      vehiculeId: number
      immatriculation: string
      modele: string
      minutes: number
      lastChange: string
    }

    // techId -> vehiculeId -> agg
    const byTech = new Map<number, Map<number, VehicleAgg>>()

    const addMinutes = (
      techId: number,
      vehicule: { id: number; immatriculation: string | null; modele: string | null },
      minutes: number,
      dateChange: string
    ) => {
      if (!techId || !Number.isFinite(techId) || techId <= 0 || minutes <= 0) return
      let vehicles = byTech.get(techId)
      if (!vehicles) {
        vehicles = new Map()
        byTech.set(techId, vehicles)
      }
      const existing = vehicles.get(vehicule.id)
      if (existing) {
        existing.minutes += minutes
        if (dateChange > existing.lastChange) existing.lastChange = dateChange
      } else {
        vehicles.set(vehicule.id, {
          vehiculeId: vehicule.id,
          immatriculation: (vehicule.immatriculation || '').trim() || `Véhicule #${vehicule.id}`,
          modele: (vehicule.modele || '').trim() || '—',
          minutes,
          lastChange: dateChange,
        })
      }
    }

    const techIdsForVehicle = (v: {
      technicien_id: number | null
      notes: string | null
    }): number[] => {
      const ids = new Set<number>()
      if (v.technicien_id != null && Number(v.technicien_id) > 0) ids.add(Number(v.technicien_id))
      const notes = String(v.notes ?? '')
      const tag = '[[ASSIGNEES:'
      const start = notes.lastIndexOf(tag)
      if (start >= 0) {
        const end = notes.indexOf(']]', start)
        if (end > start) {
          try {
            const parsed = JSON.parse(notes.slice(start + tag.length, end)) as {
              technicien_ids?: unknown
              technician_ids?: unknown
            }
            const raw = parsed.technicien_ids ?? parsed.technician_ids
            if (Array.isArray(raw)) {
              for (const x of raw) {
                const n = Number(x)
                if (Number.isInteger(n) && n > 0) ids.add(n)
              }
            }
          } catch {
            // ignore malformed tag
          }
        }
      }
      return Array.from(ids)
    }

    const inPeriod = (iso: string) => {
      const [y, m] = String(iso).slice(0, 10).split('-').map(Number)
      if (!Number.isFinite(y) || y !== year) return false
      if (month == null) return true
      return m === month
    }

    for (const h of histRows as Array<{
      vehiculeId: number
      date_changement: string
      duree_etat_precedent_min: number | null
      vehicule: {
        id: number
        technicien_id: number | null
        notes: string | null
        immatriculation: string | null
        modele: string | null
      } | null
    }>) {
      if (!h.vehicule || !inPeriod(h.date_changement)) continue
      const minutes = Number(h.duree_etat_precedent_min) || 0
      if (minutes <= 0) continue
      for (const tid of techIdsForVehicle(h.vehicule)) {
        addMinutes(tid, h.vehicule, minutes, String(h.date_changement))
      }
    }

    const rows = Array.from(byTech.entries())
      .map(([technicienId, vehicles]) => {
        const vehiculesList = Array.from(vehicles.values())
          .map(v => ({
            vehiculeId: v.vehiculeId,
            immatriculation: v.immatriculation,
            modele: v.modele,
            minutes: Math.round(v.minutes),
            lastChange: v.lastChange.slice(0, 10),
          }))
          .sort((a, b) => b.minutes - a.minutes)
        const vehiculesCount = vehiculesList.length
        const totalMinutes = vehiculesList.reduce((s, v) => s + v.minutes, 0)
        const moyenneMinutes = vehiculesCount > 0 ? totalMinutes / vehiculesCount : 0
        return {
          technicienId,
          nom: nameById.get(technicienId) ?? `Technicien #${technicienId}`,
          vehiculesCount,
          totalMinutes: Math.round(totalMinutes),
          moyenneMinutes: Math.round(moyenneMinutes),
          moyenneHeures: Math.round((moyenneMinutes / 60) * 10) / 10,
          totalHeures: Math.round((totalMinutes / 60) * 10) / 10,
          vehicules: vehiculesList,
        }
      })
      .filter(r => r.vehiculesCount > 0)
      .sort((a, b) => b.moyenneMinutes - a.moyenneMinutes)

    return res.json({
      year,
      month,
      etat: 'orange',
      etatLabel: 'EN COURS',
      data: rows,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
