import { Router } from 'express'
import { prisma } from '../lib/prisma'
import {
  detectVehiculeBrand,
  groupModelesByBrand,
  slugToModelePrefix,
} from '../lib/vehiculeBrands'
import { whereUserAssignedToVehicule } from '../lib/vehiculeAssignees'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { promises as fs } from 'fs'
import path from 'path'

const router = Router()
const db = prisma as any

const ETATS = ['orange', 'mauve', 'attente_client', 'bleu', 'rouge', 'remise_cle', 'vert', 'retour'] as const
const TYPES = ['voiture', 'moto'] as const
const SERVICE_TYPES = [
  'diagnostic',
  'diagnostic_approfondi',
  'service_rapide',
  'reprogrammation',
  'mecanique',
  'autre',
] as const
const IMAGE_CATEGORIES = ['etat_exterieur', 'etat_interieur', 'compteur', 'plaque', 'dommage', 'intervention'] as const
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads', 'vehicules')
const TRANSITIONS: Record<string, string[]> = {
  orange: ['bleu', 'mauve', 'attente_client', 'rouge', 'remise_cle', 'retour'],
  mauve: ['orange', 'attente_client'],
  attente_client: ['orange', 'mauve', 'bleu', 'rouge', 'remise_cle', 'vert'],
  bleu: ['remise_cle', 'orange', 'attente_client'],
  rouge: ['orange', 'mauve', 'attente_client'],
  remise_cle: ['vert', 'orange', 'attente_client'],
  vert: ['retour'],
  retour: ['orange', 'mauve', 'attente_client', 'bleu', 'rouge', 'remise_cle', 'vert'],
}

const ETAT_LABELS: Record<string, string> = {
  orange: 'Orange',
  mauve: 'Mauve',
  attente_client: 'Attente client',
  bleu: 'Bleu',
  rouge: 'Problème',
  remise_cle: 'Remise clé',
  vert: 'Validé',
  retour: 'Retour',
}

function etatLabel(e: string): string {
  return ETAT_LABELS[e] ?? e
}

/** Notifie les administrateurs / responsables (sauf l’auteur de l’action). */
async function notifyAdminsVehicule(opts: {
  actorId: number
  vehiculeId: number
  type: 'vehicule_etat' | 'vehicule_update'
  title: string
  message: string
}): Promise<void> {
  try {
    if (typeof db.notification === 'undefined') return
    const recipients = await db.user.findMany({
      where: {
        statut: 'actif',
        role: { in: ['admin', 'responsable'] },
        id: { not: opts.actorId },
      },
      select: { id: true },
    })
    for (const u of recipients) {
      await db.notification.create({
        data: {
          userId: u.id,
          type: opts.type,
          title: opts.title,
          message: opts.message,
          vehiculeId: opts.vehiculeId,
        },
      })
    }
  } catch (e) {
    console.error('[vehicules] notifyAdminsVehicule:', e)
  }
}

function toVehiculeImage(i: {
  id: number
  vehiculeId: number
  url_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  category: string
  note: string
  created_by_id: number | null
  created_by: string
  createdAt: Date
}) {
  return {
    id: i.id,
    vehicule_id: i.vehiculeId,
    url_path: i.url_path,
    original_name: i.original_name,
    mime_type: i.mime_type,
    size_bytes: i.size_bytes,
    category: i.category,
    note: i.note,
    created_by_id: i.created_by_id,
    created_by: i.created_by,
    created_at: i.createdAt.toISOString(),
  }
}

function getImageExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/heic') return 'heic'
  return 'bin'
}

function sanitizeOriginalName(fileName?: string): string {
  const raw = (fileName ?? '').trim()
  if (!raw) return ''
  return raw.replace(/[^\w.\- ]/g, '_').slice(0, 120)
}

function parseDataUrl(dataUrl?: string): { mimeType: string; buffer: Buffer } | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  let mimeType = match[1].toLowerCase()
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') mimeType = 'image/jpeg'
  if (mimeType === 'image/heif') mimeType = 'image/heic'
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    return { mimeType, buffer }
  } catch {
    return null
  }
}

async function notifyAssignedTechnicians(opts: {
  actorId: number
  vehiculeId: number
  modele: string
  immatriculation: string
  technicienIds: number[]
  responsableIds: number[]
  isNew: boolean
}): Promise<void> {
  try {
    if (typeof db.notification === 'undefined') return
    const recipientIds = Array.from(new Set([...opts.technicienIds, ...opts.responsableIds])).filter(
      id => id !== opts.actorId
    )
    if (!recipientIds.length) return
    const label = `${opts.modele} (${(opts.immatriculation ?? '').trim() || 'sans immat.'})`
    const message = opts.isNew
      ? `Nouveau véhicule affecté : ${label}`
      : `Vous avez été affecté au véhicule ${label}`
    for (const userId of recipientIds) {
      await db.notification.create({
        data: {
          userId,
          type: 'vehicule_assigned',
          title: 'Véhicule',
          message,
          vehiculeId: opts.vehiculeId,
        },
      })
    }
  } catch (e) {
    console.error('[vehicules] notifyAssignedTechnicians:', e)
  }
}

const ASSIGNEES_TAG = '[[ASSIGNEES:'

function normalizeIds(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  return Array.from(new Set(input.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0)))
}

function splitNotesAndAssignees(rawNotes: string | null | undefined) {
  const notes = String(rawNotes ?? '')
  let technicien_ids: number[] = []
  let responsable_ids: number[] = []
  let raw = notes

  const merge = (t: number[], r: number[]) => {
    technicien_ids = Array.from(new Set([...technicien_ids, ...t]))
    responsable_ids = Array.from(new Set([...responsable_ids, ...r]))
  }

  const startTag = notes.lastIndexOf(ASSIGNEES_TAG)
  if (startTag >= 0) {
    const end = notes.indexOf(']]', startTag)
    if (end >= 0) {
      const jsonPart = notes.slice(startTag + ASSIGNEES_TAG.length, end)
      try {
        const parsed = JSON.parse(jsonPart) as { technicien_ids?: unknown; responsable_ids?: unknown; technician_ids?: unknown }
        merge(normalizeIds(parsed.technicien_ids ?? parsed.technician_ids), normalizeIds(parsed.responsable_ids))
      } catch {
        // ignore malformed metadata
      }
      raw = (notes.slice(0, startTag) + notes.slice(end + 2)).trim()
    } else {
      raw = notes.trim()
    }
  }

  const extractJsonBlock = (text: string) => {
    const idx = text.indexOf('ASSIGNEES')
    if (idx < 0) return null
    let start = -1
    for (let i = idx; i >= 0; i--) {
      if (text[i] === '{' || text[i] === '[') {
        start = i
        break
      }
    }
    if (start < 0) return null
    const stack: string[] = []
    for (let i = start; i < text.length; i++) {
      const c = text[i]
      if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
      else if (c === '}' || c === ']') {
        if (stack.length === 0 || stack[stack.length - 1] !== c) continue
        stack.pop()
        if (stack.length === 0) {
          return { json: text.slice(start, i + 1), start, end: i + 1 }
        }
      }
    }
    return null
  }

  const extractFromJson = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const o = value as Record<string, unknown>
    if (o.ASSIGNEES && typeof o.ASSIGNEES === 'object') {
      const a = o.ASSIGNEES as Record<string, unknown>
      merge(normalizeIds(a.technicien_ids ?? a.technician_ids), normalizeIds(a.responsable_ids))
      return
    }
    if ('technicien_ids' in o || 'technician_ids' in o || 'responsable_ids' in o) {
      merge(normalizeIds(o.technicien_ids ?? o.technician_ids), normalizeIds(o.responsable_ids))
    }
  }

  let block = extractJsonBlock(raw)
  while (block) {
    try {
      const parsed = JSON.parse(block.json) as unknown
      if (Array.isArray(parsed)) parsed.forEach(extractFromJson)
      else extractFromJson(parsed)
      raw = (raw.slice(0, block.start) + raw.slice(block.end)).trim()
    } catch {
      break
    }
    block = extractJsonBlock(raw)
  }

  return { notes: raw.trim(), technicien_ids, responsable_ids }
}

function mergeNotesWithAssignees(notesRaw: string | null | undefined, technicien_ids: number[], responsable_ids: number[]) {
  const base = splitNotesAndAssignees(notesRaw).notes
  const meta = `${ASSIGNEES_TAG}${JSON.stringify({ technicien_ids, responsable_ids })}]]`
  return base ? `${base}\n\n${meta}` : meta
}

function toVehicule(v: {
  id: number
  immatriculation: string
  modele: string
  type: string
  etat_actuel: string
  service_type: string | null
  technicien_id: number | null
  responsable_id: number | null
  defaut: string
  client_telephone: string
  date_entree: string
  date_sortie: string | null
  notes: string
  derniere_mise_a_jour: string
  avance_client?: number | null
}) {
  const parsedNotes = splitNotesAndAssignees(v.notes)
  const parsedDefaut = splitNotesAndAssignees(v.defaut)
  const technicien_ids = parsedNotes.technicien_ids.length
    ? parsedNotes.technicien_ids
    : parsedDefaut.technicien_ids.length
      ? parsedDefaut.technicien_ids
      : v.technicien_id != null
        ? [v.technicien_id]
        : []
  const responsable_ids = parsedNotes.responsable_ids.length
    ? parsedNotes.responsable_ids
    : parsedDefaut.responsable_ids.length
      ? parsedDefaut.responsable_ids
      : v.responsable_id != null
        ? [v.responsable_id]
        : []
  return {
    id: v.id,
    immatriculation: v.immatriculation,
    modele: v.modele,
    type: v.type as 'voiture' | 'moto',
    etat_actuel: v.etat_actuel,
    service_type: v.service_type ?? undefined,
    technicien_id: v.technicien_id,
    responsable_id: v.responsable_id,
    technicien_ids,
    responsable_ids,
    defaut: parsedDefaut.notes,
    client_telephone: v.client_telephone,
    date_entree: v.date_entree,
    date_sortie: v.date_sortie,
    notes: parsedNotes.notes,
    derniere_mise_a_jour: v.derniere_mise_a_jour,
    avance_client: v.avance_client ?? 0,
  }
}

function toDepense(d: {
  id: number
  vehiculeId: number
  libelle: string
  montant: number
  createdAt: Date
  productId?: number | null
  quantite?: number | null
  cout_stock_sortie?: number | null
}) {
  return {
    id: d.id,
    vehicule_id: d.vehiculeId,
    libelle: d.libelle,
    montant: d.montant,
    created_at: d.createdAt.toISOString(),
    product_id: d.productId ?? null,
    quantite: d.quantite ?? null,
    cout_stock_sortie: d.cout_stock_sortie ?? null,
  }
}

function toHistorique(h: { id: number; vehiculeId: number; etat_precedent: string | null; etat_nouveau: string; date_changement: string; utilisateur_id: number; utilisateur_nom: string; commentaire: string; duree_etat_precedent_min: number | null; pieces_utilisees: string }) {
  return {
    id: h.id,
    vehicule_id: h.vehiculeId,
    etat_precedent: h.etat_precedent,
    etat_nouveau: h.etat_nouveau,
    date_changement: h.date_changement,
    utilisateur_id: h.utilisateur_id,
    utilisateur_nom: h.utilisateur_nom,
    commentaire: h.commentaire,
    duree_etat_precedent_minutes: h.duree_etat_precedent_min,
    pieces_utilisees: h.pieces_utilisees,
  }
}

function buildVehiculesWhere(query: {
  etat?: string
  exclude_etat?: string
  technicien_id?: string
  type?: string
  date_debut?: string
  date_fin?: string
  q?: string
  service_type?: string
}, includeEtat: boolean): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (includeEtat && query.etat && ETATS.includes(query.etat as (typeof ETATS)[number])) {
    where.etat_actuel = query.etat
  } else if (query.exclude_etat && ETATS.includes(query.exclude_etat as (typeof ETATS)[number])) {
    where.etat_actuel = { not: query.exclude_etat }
  }

  if (query.type && TYPES.includes(query.type as (typeof TYPES)[number])) {
    where.type = query.type
  }

  if (
    query.service_type &&
    SERVICE_TYPES.includes(query.service_type as (typeof SERVICE_TYPES)[number])
  ) {
    where.service_type = query.service_type
  }

  const andClauses: Record<string, unknown>[] = []

  if (query.technicien_id) {
    const tid = parseInt(query.technicien_id, 10)
    if (!isNaN(tid)) {
      andClauses.push(whereUserAssignedToVehicule(tid))
    }
  }

  if (query.date_debut || query.date_fin) {
    const range: Record<string, string> = {}
    if (query.date_debut) range.gte = query.date_debut
    if (query.date_fin) range.lte = query.date_fin
    // Archives (validés) : filtrer sur la date de sortie / validation, pas l'entrée atelier
    if (query.etat === 'vert') {
      andClauses.push({
        OR: [
          { date_sortie: range },
          { date_sortie: null, date_entree: range },
        ],
      })
    } else {
      andClauses.push({ date_entree: range })
    }
  }

  if (query.q) {
    andClauses.push({
      OR: [
        { modele: { contains: query.q, mode: 'insensitive' } },
        { immatriculation: { contains: query.q, mode: 'insensitive' } },
        { defaut: { contains: query.q, mode: 'insensitive' } },
      ],
    })
  }

  if (andClauses.length === 1) {
    Object.assign(where, andClauses[0])
  } else if (andClauses.length > 1) {
    where.AND = andClauses
  }

  return where
}

router.get('/stats', authenticate(), async (req, res) => {
  try {
    const month = parseInt(req.query.month as string, 10)
    const year = parseInt(req.query.year as string, 10)
    const y = !isNaN(year) ? year : new Date().getFullYear()
    const m = !isNaN(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1
    const debut = `${y}-${String(m).padStart(2, '0')}-01`
    const fin = new Date(y, m, 0)
    const finStr = `${y}-${String(m).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`

    const [total, enCours, byEtat, terminesCeMois] = await Promise.all([
      db.vehicule.count(),
      db.vehicule.count({ where: { etat_actuel: { notIn: ['vert'] } } }),
      db.vehicule.groupBy({
        by: ['etat_actuel'],
        _count: { id: true },
      }),
      db.vehiculeHistorique.count({
        where: {
          etat_nouveau: 'vert',
          date_changement: { gte: debut, lte: finStr + 'T23:59:59.999Z' },
        },
      }),
    ])
    const byEtatMap: Record<string, number> = {}
    for (const row of byEtat) {
      byEtatMap[row.etat_actuel] = row._count.id
    }
    return res.json({ total, enCours, byEtat: byEtatMap, terminesCeMois })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function daysBetweenYmd(a: string, b: string) {
  const da = new Date(`${String(a).slice(0, 10)}T12:00:00`)
  const db = new Date(`${String(b).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null
  return Math.max(0, Math.round((db.getTime() - da.getTime()) / 86400000))
}

function monthRange(year: number, month: number) {
  const start = `${year}-${pad2(month)}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${pad2(month)}-${pad2(last)}`
  return { start, end }
}

function kpiDelta(value: number, prev: number) {
  const delta = value - prev
  const deltaPct =
    prev === 0 ? (value > 0 ? 100 : 0) : Math.round((delta / prev) * 1000) / 10
  return { value, prev, delta, deltaPct }
}

/**
 * Insights dashboard : deltas MoM, temps moyen, sparklines 7j, alertes.
 */
router.get('/dashboard-insights', authenticate(), async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const year = Math.max(
      2000,
      Math.min(2100, parseInt(String(req.query.year ?? ''), 10) || now.getFullYear())
    )
    const month = Math.max(
      1,
      Math.min(12, parseInt(String(req.query.month ?? ''), 10) || now.getMonth() + 1)
    )
    const rawTid = (req.query as { technicien_id?: string }).technicien_id
    const techId = rawTid !== undefined && rawTid !== '' ? parseInt(rawTid, 10) : NaN
    const scoped = !Number.isNaN(techId)
    if (scoped && req.user?.sub !== techId) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const techWhere = scoped ? whereUserAssignedToVehicule(techId) : {}

    const cur = monthRange(year, month)
    let prevYear = year
    let prevMonth = month - 1
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear -= 1
    }
    const prev = monthRange(prevYear, prevMonth)

    const sparkStart = new Date(now)
    sparkStart.setDate(sparkStart.getDate() - 6)
    const sparkFrom = toYmd(sparkStart)
    const sparkTo = toYmd(now)

    const [
      entreesCur,
      entreesPrev,
      sortiesCur,
      sortiesPrev,
      histVertsCur,
      histVertsPrev,
      rougeLive,
      anciensCount,
      sparkEntrees,
      sparkSorties,
      completedCur,
      completedPrev,
      productsStock,
      urgentsSample,
      anciensSample,
    ] = await Promise.all([
      db.vehicule.count({
        where: { date_entree: { gte: cur.start, lte: cur.end }, ...techWhere },
      }),
      db.vehicule.count({
        where: { date_entree: { gte: prev.start, lte: prev.end }, ...techWhere },
      }),
      db.vehicule.findMany({
        where: { date_sortie: { gte: cur.start, lte: cur.end }, ...techWhere },
        select: { id: true, date_sortie: true },
      }),
      db.vehicule.findMany({
        where: { date_sortie: { gte: prev.start, lte: prev.end }, ...techWhere },
        select: { id: true, date_sortie: true },
      }),
      db.vehiculeHistorique.findMany({
        where: {
          etat_nouveau: 'vert',
          date_changement: { gte: cur.start, lte: `${cur.end}T23:59:59.999Z` },
          ...(scoped ? { vehicule: techWhere } : {}),
        },
        select: { vehiculeId: true, date_changement: true },
      }),
      db.vehiculeHistorique.findMany({
        where: {
          etat_nouveau: 'vert',
          date_changement: { gte: prev.start, lte: `${prev.end}T23:59:59.999Z` },
          ...(scoped ? { vehicule: techWhere } : {}),
        },
        select: { vehiculeId: true, date_changement: true },
      }),
      db.vehicule.count({ where: { etat_actuel: 'rouge', ...techWhere } }),
      db.vehicule.count({
        where: {
          etat_actuel: { notIn: ['vert', 'rouge'] },
          date_entree: { lt: toYmd(new Date(now.getTime() - 7 * 86400000)) },
          ...techWhere,
        },
      }),
      db.vehicule.findMany({
        where: { date_entree: { gte: sparkFrom, lte: sparkTo }, ...techWhere },
        select: { date_entree: true },
      }),
      db.vehicule.findMany({
        where: { date_sortie: { gte: sparkFrom, lte: sparkTo }, ...techWhere },
        select: { date_sortie: true },
      }),
      db.vehicule.findMany({
        where: {
          date_sortie: { gte: cur.start, lte: cur.end },
          ...techWhere,
        },
        select: { date_entree: true, date_sortie: true },
      }),
      db.vehicule.findMany({
        where: {
          date_sortie: { gte: prev.start, lte: prev.end },
          ...techWhere,
        },
        select: { date_entree: true, date_sortie: true },
      }),
      db.produitStock.findMany({
        select: { quantite: true, seuil_alerte: true },
      }),
      db.vehicule.findMany({
        where: { etat_actuel: 'rouge', ...techWhere },
        orderBy: { date_entree: 'asc' },
        take: 4,
        select: { id: true, modele: true, immatriculation: true, date_entree: true },
      }),
      db.vehicule.findMany({
        where: {
          etat_actuel: { notIn: ['vert', 'rouge'] },
          date_entree: { lt: toYmd(new Date(now.getTime() - 7 * 86400000)) },
          ...techWhere,
        },
        orderBy: { date_entree: 'asc' },
        take: 4,
        select: {
          id: true,
          modele: true,
          immatriculation: true,
          date_entree: true,
          etat_actuel: true,
        },
      }),
    ])

    const countValides = (
      sorties: Array<{ id: number; date_sortie: string }>,
      hist: Array<{ vehiculeId: number; date_changement: string }>
    ) => {
      const set = new Set<number>()
      for (const s of sorties) set.add(s.id)
      for (const h of hist) set.add(h.vehiculeId)
      return set.size
    }

    const validesCur = countValides(sortiesCur, histVertsCur)
    const validesPrev = countValides(sortiesPrev, histVertsPrev)

    const avgDays = (rows: Array<{ date_entree: string; date_sortie: string | null }>) => {
      const days: number[] = []
      for (const r of rows) {
        if (!r.date_sortie) continue
        const d = daysBetweenYmd(r.date_entree, r.date_sortie)
        if (d != null) days.push(d)
      }
      if (!days.length) return null
      return Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
    }

    const tempsCur = avgDays(completedCur)
    const tempsPrev = avgDays(completedPrev)

    const sparkline = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = toYmd(d)
      const entrees = (sparkEntrees as Array<{ date_entree: string }>).filter(
        v => String(v.date_entree).slice(0, 10) === key
      ).length
      const valides = (sparkSorties as Array<{ date_sortie: string }>).filter(
        v => String(v.date_sortie).slice(0, 10) === key
      ).length
      sparkline.push({
        date: key,
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
        entrees,
        valides,
      })
    }

    const stockBasCount = (
      productsStock as Array<{ quantite: number; seuil_alerte: number | null }>
    ).filter(p => {
      const q = Number(p.quantite) || 0
      if (p.seuil_alerte != null) return q <= Number(p.seuil_alerte)
      return q <= 3
    }).length

    const alerts: Array<{
      id: string
      type: 'urgent' | 'ancien' | 'stock'
      severity: 'high' | 'medium' | 'low'
      title: string
      subtitle: string
      href: string
      count?: number
    }> = []

    if (rougeLive > 0) {
      alerts.push({
        id: 'urgents',
        type: 'urgent',
        severity: 'high',
        title: `${rougeLive} véhicule${rougeLive > 1 ? 's' : ''} à résoudre`,
        subtitle:
          (urgentsSample as Array<{ modele: string }>)
            .slice(0, 2)
            .map(v => v.modele)
            .join(' · ') || 'Action requise',
        href: '/vehicules?etat=rouge',
        count: rougeLive,
      })
    }
    if (anciensCount > 0) {
      alerts.push({
        id: 'anciens',
        type: 'ancien',
        severity: 'medium',
        title: `${anciensCount} véhicule${anciensCount > 1 ? 's' : ''} > 7 jours`,
        subtitle:
          (anciensSample as Array<{ modele: string }>)
            .slice(0, 2)
            .map(v => v.modele)
            .join(' · ') || 'Retard atelier',
        href: '/vehicules',
        count: anciensCount,
      })
    }
    if (stockBasCount > 0 && !scoped) {
      alerts.push({
        id: 'stock',
        type: 'stock',
        severity: stockBasCount > 5 ? 'high' : 'medium',
        title: `${stockBasCount} produit${stockBasCount > 1 ? 's' : ''} en stock bas`,
        subtitle: 'Réassort recommandé',
        href: '/stock-general',
        count: stockBasCount,
      })
    }

    const tempsDelta =
      tempsCur != null && tempsPrev != null
        ? Math.round((tempsCur - tempsPrev) * 10) / 10
        : null

    return res.json({
      year,
      month,
      generatedAt: now.toISOString(),
      kpis: {
        entrees: kpiDelta(entreesCur, entreesPrev),
        valides: kpiDelta(validesCur, validesPrev),
        aResoudre: { value: rougeLive, prev: null, delta: null, deltaPct: null },
        tempsMoyenJours: {
          value: tempsCur,
          prev: tempsPrev,
          delta: tempsDelta,
          // pour le temps, une baisse est positive
          betterWhenDown: true,
        },
      },
      sparkline,
      alerts,
      samples: {
        urgents: urgentsSample,
        anciens: anciensSample,
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Snapshot ops : RDV, SAV, dettes, devis, clients — filtres day | week | month. */
router.get('/dashboard-today', authenticate(), async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const today = toYmd(now)
    const periodRaw = String(req.query.period ?? 'day')
    const period = periodRaw === 'week' || periodRaw === 'month' ? periodRaw : 'day'

    let year = Math.max(
      2000,
      Math.min(2100, parseInt(String(req.query.year ?? ''), 10) || now.getFullYear())
    )
    let month = Math.max(
      1,
      Math.min(12, parseInt(String(req.query.month ?? ''), 10) || now.getMonth() + 1)
    )
    if (year === now.getFullYear() && month > now.getMonth() + 1) {
      month = now.getMonth() + 1
    }

    let start = today
    let end = today
    if (period === 'week') {
      const d = new Date(now)
      const day = d.getDay() // 0=dim
      const diffToMon = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diffToMon)
      start = toYmd(d)
      end = today
    } else if (period === 'month') {
      const range = monthRange(year, month)
      start = range.start
      end = year === now.getFullYear() && month === now.getMonth() + 1 ? today : range.end
    }

    const dateRange = { gte: start, lte: end }
    const createdRange = {
      gte: new Date(`${start}T00:00:00.000Z`),
      lte: new Date(`${end}T23:59:59.999Z`),
    }
    const dettesWhere =
      period === 'day'
        ? { reste: { gt: 0 } }
        : { reste: { gt: 0 }, createdAt: createdRange }

    const [rdvCount, reclamationsCount, dettesAgg, devisCount, clientsCount] = await Promise.all([
      db.calendarAssignment.count({
        where: { date: dateRange, statut: { not: 'annule' } },
      }),
      db.reclamation.count({
        where:
          period === 'day'
            ? { statut: { in: ['ouverte', 'en_cours'] } }
            : { statut: { in: ['ouverte', 'en_cours'] }, date: dateRange },
      }),
      db.clientDette.aggregate({
        where: dettesWhere,
        _count: { id: true },
        _sum: { reste: true },
      }),
      db.demandeDevis.count({
        where:
          period === 'day'
            ? { statut: 'en_attente' }
            : { statut: 'en_attente', date: dateRange },
      }),
      db.client.count({
        where: { createdAt: createdRange },
      }),
    ])

    return res.json({
      period,
      date: today,
      start,
      end,
      year: period === 'month' ? year : now.getFullYear(),
      month: period === 'month' ? month : now.getMonth() + 1,
      generatedAt: now.toISOString(),
      items: {
        rdv: { count: rdvCount },
        reclamations: { count: reclamationsCount },
        dettes: {
          count: dettesAgg._count?.id ?? 0,
          total: Math.round((Number(dettesAgg._sum?.reste) || 0) * 100) / 100,
        },
        devis: { count: devisCount },
        clients: { count: clientsCount },
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Stats mensuelles (activité) :
 * - byEtat = véhicules entrés ce mois, groupés par état actuel (même logique visuelle que le stock global)
 * - entrees / valides / aResoudre pour le mois
 */
router.get('/dashboard-monthly', authenticate(), async (req: AuthRequest, res) => {
  try {
    const now = new Date()
    const year = Math.max(
      2000,
      Math.min(2100, parseInt(String(req.query.year ?? ''), 10) || now.getFullYear())
    )
    const rawTid = (req.query as { technicien_id?: string }).technicien_id
    const techId = rawTid !== undefined && rawTid !== '' ? parseInt(rawTid, 10) : NaN
    const scoped = !Number.isNaN(techId)
    if (scoped && req.user?.sub !== techId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const techWhere = scoped ? whereUserAssignedToVehicule(techId) : {}
    const from = `${year}-01-01`
    const to = `${year}-12-31`
    const moisLabels = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ]
    const moisShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

    const emptyByEtat = () => {
      const o: Record<string, number> = {}
      for (const e of ETATS) o[e] = 0
      return o
    }

    const months = moisLabels.map((label, i) => ({
      month: i + 1,
      label,
      labelShort: moisShort[i],
      entrees: 0,
      valides: 0,
      aResoudre: 0,
      byEtat: emptyByEtat(),
    }))

    const [entreesRows, sortiesRows, histVerts] = await Promise.all([
      db.vehicule.findMany({
        where: { date_entree: { gte: from, lte: to }, ...techWhere },
        select: { id: true, date_entree: true, etat_actuel: true },
      }),
      db.vehicule.findMany({
        where: { date_sortie: { gte: from, lte: to }, ...techWhere },
        select: { id: true, date_sortie: true },
      }),
      db.vehiculeHistorique.findMany({
        where: {
          etat_nouveau: 'vert',
          date_changement: { gte: from, lte: `${to}T23:59:59.999Z` },
          ...(scoped ? { vehicule: techWhere } : {}),
        },
        select: { vehiculeId: true, date_changement: true },
        orderBy: { date_changement: 'asc' },
      }),
    ])

    for (const v of entreesRows as Array<{ id: number; date_entree: string; etat_actuel: string }>) {
      const m = Number(String(v.date_entree).slice(5, 7))
      if (m < 1 || m > 12) continue
      const bucket = months[m - 1]
      bucket.entrees += 1
      if (ETATS.includes(v.etat_actuel as (typeof ETATS)[number])) {
        bucket.byEtat[v.etat_actuel] += 1
      }
      if (v.etat_actuel === 'rouge') bucket.aResoudre += 1
    }

    const valideMonthByVehicule = new Map<number, number>()
    for (const v of sortiesRows as Array<{ id: number; date_sortie: string }>) {
      const m = Number(String(v.date_sortie).slice(5, 7))
      if (m >= 1 && m <= 12) valideMonthByVehicule.set(v.id, m)
    }
    for (const h of histVerts as Array<{ vehiculeId: number; date_changement: string }>) {
      if (valideMonthByVehicule.has(h.vehiculeId)) continue
      const m = Number(String(h.date_changement).slice(5, 7))
      if (m >= 1 && m <= 12) valideMonthByVehicule.set(h.vehiculeId, m)
    }
    for (const m of valideMonthByVehicule.values()) {
      months[m - 1].valides += 1
    }

    return res.json({
      year,
      generatedAt: now.toISOString(),
      months,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/dashboard-summary', authenticate(), async (req: AuthRequest, res) => {
  try {
    const rawTid = (req.query as { technicien_id?: string }).technicien_id
    const techId = rawTid !== undefined && rawTid !== '' ? parseInt(rawTid, 10) : NaN
    const scoped = !Number.isNaN(techId)
    if (scoped && req.user?.sub !== techId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const today = new Date()
    const seuil = new Date(today)
    seuil.setDate(seuil.getDate() - 7)
    const seuilStr = `${seuil.getFullYear()}-${String(seuil.getMonth() + 1).padStart(2, '0')}-${String(seuil.getDate()).padStart(2, '0')}`

    const techWhere = scoped ? whereUserAssignedToVehicule(techId) : {}

    const [urgents, anciens, recentRaw] = await Promise.all([
      db.vehicule.findMany({
        where: { etat_actuel: 'rouge', ...techWhere },
        orderBy: { id: 'desc' },
      }),
      db.vehicule.findMany({
        where: {
          etat_actuel: { notIn: ['vert', 'rouge'] },
          date_entree: { lt: seuilStr },
          ...techWhere,
        },
        orderBy: { date_entree: 'asc' },
      }),
      db.vehiculeHistorique.findMany({
        where: scoped ? { vehicule: whereUserAssignedToVehicule(techId) } : undefined,
        orderBy: [{ date_changement: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
    ])

    const vehicleIds = Array.from(new Set((recentRaw as any[]).map(r => Number(r.vehiculeId)).filter((v: number) => !Number.isNaN(v))))
    const recentVehicles = vehicleIds.length
      ? await db.vehicule.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, modele: true },
        })
      : []
    const modelByVehiculeId = new Map<number, string>((recentVehicles as Array<{ id: number; modele: string }>).map(v => [v.id, v.modele]))

    /** Charge réelle : affectés (tech + responsable), hors archivés/validés (vert). */
    const teamLoadByTechnicien: Record<string, number> = {}
    const teamLoadDetailByTechnicien: Record<
      string,
      {
        total: number
        byEtat: Record<string, number>
        urgents: number
        vehicules: Array<{
          id: number
          immatriculation: string
          modele: string
          etat_actuel: string
        }>
      }
    > = {}

    if (!scoped) {
      const activeVehicles = await db.vehicule.findMany({
        where: { etat_actuel: { not: 'vert' } },
        select: {
          id: true,
          immatriculation: true,
          modele: true,
          type: true,
          etat_actuel: true,
          service_type: true,
          technicien_id: true,
          responsable_id: true,
          defaut: true,
          client_telephone: true,
          date_entree: true,
          date_sortie: true,
          notes: true,
          derniere_mise_a_jour: true,
        },
      })

      for (const raw of activeVehicles as Array<{
        id: number
        immatriculation: string
        modele: string
        technicien_id: number | null
        responsable_id: number | null
        notes: string
        defaut: string
        etat_actuel: string
      }>) {
        const mapped = toVehicule(raw as any)
        const assigneeIds = new Set<number>()
        const addId = (n: unknown) => {
          const id = Number(n)
          if (Number.isInteger(id) && id > 0) assigneeIds.add(id)
        }
        addId(mapped.technicien_id)
        addId(mapped.responsable_id)
        for (const id of mapped.technicien_ids ?? []) addId(id)
        for (const id of mapped.responsable_ids ?? []) addId(id)

        const etat = mapped.etat_actuel
        const vehicleBrief = {
          id: mapped.id,
          immatriculation: mapped.immatriculation,
          modele: mapped.modele,
          etat_actuel: etat,
        }
        for (const tid of assigneeIds) {
          const key = String(tid)
          teamLoadByTechnicien[key] = (teamLoadByTechnicien[key] ?? 0) + 1
          if (!teamLoadDetailByTechnicien[key]) {
            teamLoadDetailByTechnicien[key] = { total: 0, byEtat: {}, urgents: 0, vehicules: [] }
          }
          const detail = teamLoadDetailByTechnicien[key]
          detail.total += 1
          detail.byEtat[etat] = (detail.byEtat[etat] ?? 0) + 1
          if (etat === 'rouge') detail.urgents += 1
          detail.vehicules.push(vehicleBrief)
        }
      }

      for (const detail of Object.values(teamLoadDetailByTechnicien)) {
        detail.vehicules.sort((a, b) => a.immatriculation.localeCompare(b.immatriculation, 'fr'))
      }
    }

    return res.json({
      problemsCount: (urgents as any[]).length,
      urgents: (urgents as any[]).map(toVehicule),
      anciens: (anciens as any[]).map(toVehicule),
      recentActivity: (recentRaw as any[]).map(h => ({
        ...toHistorique(h),
        vehicleModel: modelByVehiculeId.get(Number(h.vehiculeId)) ?? '',
      })),
      teamLoadByTechnicien,
      teamLoadDetailByTechnicien,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', authenticate(), async (req, res) => {
  try {
    const etat = req.query.etat as string | undefined
    const exclude_etat = req.query.exclude_etat as string | undefined
    const technicien_id = req.query.technicien_id as string | undefined
    const type = req.query.type as string | undefined
    const date_debut = req.query.date_debut as string | undefined
    const date_fin = req.query.date_fin as string | undefined
    const q = (req.query.q as string)?.trim()
    const service_type = (req.query.service_type as string)?.trim()
    const marque = (req.query.marque as string)?.trim().toLowerCase()
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20))

    const baseWhere = buildVehiculesWhere(
      { etat, exclude_etat, technicien_id, type, date_debut, date_fin, q, service_type },
      true
    )

    if (marque === 'autres') {
      const all = await db.vehicule.findMany({
        where: Object.keys(baseWhere).length ? baseWhere : undefined,
        orderBy: { id: 'desc' },
      })
      const autres = all.filter((v: { modele: string }) => detectVehiculeBrand(v.modele) === 'Autres')
      const total = autres.length
      const slice = autres.slice((page - 1) * limit, page * limit)
      return res.json({ data: slice.map(toVehicule), total, page, limit })
    }

    let where: Record<string, unknown> = baseWhere
    if (marque) {
      const prefix = slugToModelePrefix(marque)
      if (prefix) {
        const brandClause = { modele: { startsWith: prefix, mode: 'insensitive' } }
        where = Object.keys(baseWhere).length
          ? { AND: [baseWhere, brandClause] }
          : brandClause
      }
    }

    const [list, total] = await Promise.all([
      db.vehicule.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vehicule.count({
        where: Object.keys(where).length ? where : undefined,
      }),
    ])
    return res.json({ data: list.map(toVehicule), total, page, limit })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Brand folders with counts — uses full filtered set, not a vehicle page slice. */
router.get('/brands', authenticate(), async (req, res) => {
  try {
    const etat = req.query.etat as string | undefined
    const exclude_etat = req.query.exclude_etat as string | undefined
    const technicien_id = req.query.technicien_id as string | undefined
    const type = req.query.type as string | undefined
    const date_debut = req.query.date_debut as string | undefined
    const date_fin = req.query.date_fin as string | undefined
    const q = (req.query.q as string)?.trim()
    const service_type = (req.query.service_type as string)?.trim()

    const where = buildVehiculesWhere(
      { etat, exclude_etat, technicien_id, type, date_debut, date_fin, q, service_type },
      true
    )

    const rows = await db.vehicule.findMany({
      where: Object.keys(where).length ? where : undefined,
      select: { modele: true },
      orderBy: { id: 'desc' },
    })

    const brands = groupModelesByBrand(rows.map((r: { modele: string }) => r.modele))
    return res.json({ brands, totalVehicles: rows.length })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/counts', authenticate(), async (req, res) => {
  try {
    const etat = req.query.etat as string | undefined
    const exclude_etat = req.query.exclude_etat as string | undefined
    const technicien_id = req.query.technicien_id as string | undefined
    const type = req.query.type as string | undefined
    const date_debut = req.query.date_debut as string | undefined
    const date_fin = req.query.date_fin as string | undefined
    const q = (req.query.q as string)?.trim()
    const service_type = (req.query.service_type as string)?.trim()
    const includeEtat = String(req.query.includeEtat ?? 'false').toLowerCase() === 'true'

    const where = buildVehiculesWhere(
      { etat, exclude_etat, technicien_id, type, date_debut, date_fin, q, service_type },
      includeEtat
    )

    const [total, grouped] = await Promise.all([
      db.vehicule.count({ where: Object.keys(where).length ? where : undefined }),
      db.vehicule.groupBy({
        by: ['etat_actuel'],
        where: Object.keys(where).length ? where : undefined,
        _count: { id: true },
      }),
    ])

    const byEtat: Record<string, number> = {}
    for (const e of ETATS) byEtat[e] = 0
    for (const row of grouped as Array<{ etat_actuel: string; _count: { id: number } }>) {
      byEtat[row.etat_actuel] = row._count.id
    }

    return res.json({ total, byEtat })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/fiche-financiere', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const v = await db.vehicule.findUnique({
      where: { id },
      include: { depenses: { orderBy: { id: 'asc' } } },
    })
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    const lignes = (v.depenses || []).map(toDepense)
    const total = lignes.reduce((s: number, l: { montant: number }) => s + l.montant, 0)
    const avance = Number(v.avance_client ?? 0)
    const reste = total - avance
    return res.json({
      avance_client: avance,
      lignes,
      total,
      reste,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id/fiche-financiere', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { avance_client?: unknown }
    const ac = body.avance_client
    const avance = typeof ac === 'number' && !Number.isNaN(ac) ? Math.max(0, ac) : 0
    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })
    await db.vehicule.update({ where: { id }, data: { avance_client: avance } })
    const v = await db.vehicule.findUnique({
      where: { id },
      include: { depenses: { orderBy: { id: 'asc' } } },
    })
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    const lignes = (v.depenses || []).map(toDepense)
    const total = lignes.reduce((s: number, l: { montant: number }) => s + l.montant, 0)
    const av = Number(v.avance_client ?? 0)
    return res.json({
      avance_client: av,
      lignes,
      total,
      reste: total - av,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/** Sortie stock + ligne fiche (prix = prix vente × qté si défini, sinon coût moyen unitaire × qté) */
router.post('/:id/depenses/stock', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })
    const body = req.body as { productId?: unknown; quantite?: unknown }
    const productId = Number(body.productId)
    const quantite = Math.max(1, Math.floor(Number(body.quantite) || 0))
    if (isNaN(productId) || productId < 1) return res.status(400).json({ error: 'Produit invalide' })

    const produit = await db.produitStock.findUnique({ where: { id: productId } })
    if (!produit) return res.status(404).json({ error: 'Produit introuvable' })
    if (produit.quantite < quantite) {
      return res.status(400).json({ error: 'Stock insuffisant' })
    }

    const valeurUnitaireAchat =
      produit.quantite > 0 ? produit.valeur_achat_ttc / produit.quantite : 0
    const cout_stock_sortie = valeurUnitaireAchat * quantite
    const prixVenteUnit =
      produit.prix_vente != null && produit.prix_vente > 0 ? produit.prix_vente : valeurUnitaireAchat
    const montantLigne = Math.round(prixVenteUnit * quantite * 100) / 100

    const puStr = prixVenteUnit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const totalStr = montantLigne.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const libelleLigne = `${produit.nom} (stock) — ${puStr} DT × ${quantite} = ${totalStr} DT`

    const dateStr = new Date().toISOString().slice(0, 10)
    const ref = `vehicule:${id}`

    const newQty = produit.quantite - quantite
    const newVal = Math.max(0, produit.valeur_achat_ttc - cout_stock_sortie)
    const dernierPrix =
      newQty > 0
        ? newVal / newQty
        : valeurUnitaireAchat > 0
          ? valeurUnitaireAchat
          : produit.dernier_prix_unitaire_ttc ?? 0

    const [, , dep] = await db.$transaction([
      db.produitStock.update({
        where: { id: productId },
        data: {
          quantite: newQty,
          valeur_achat_ttc: newVal,
          dernier_prix_unitaire_ttc: dernierPrix,
        },
      }),
      db.mouvementStock.create({
        data: {
          productId,
          date: dateStr,
          produit_nom: produit.nom,
          quantite,
          type: 'sortie',
          origine: 'vehicule',
          reference: ref,
        },
      }),
      db.vehiculeDepense.create({
        data: {
          vehiculeId: id,
          libelle: libelleLigne,
          montant: montantLigne,
          productId,
          quantite,
          cout_stock_sortie,
        },
      }),
    ])

    return res.status(201).json(toDepense(dep))
  } catch (err) {
    console.error('[vehicules] POST depenses/stock', err)
    const raw = err instanceof Error ? err.message : ''
    const needsMigrate =
      /column|does not exist|Unknown arg|Unknown column|P2022/i.test(raw)
    return res.status(500).json({
      error: needsMigrate
        ? 'Base de données à jour requise : dans le dossier backend, exécutez npx prisma migrate deploy puis redémarrez le serveur.'
        : 'Erreur lors de la sortie stock. Voir les logs du serveur.',
    })
  }
})

router.post('/:id/depenses', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })
    const body = req.body as { libelle?: string; montant?: unknown }
    const libelle = String(body.libelle ?? '').trim().slice(0, 500)
    const rawM = body.montant
    const montantNum =
      typeof rawM === 'number' && !Number.isNaN(rawM)
        ? rawM
        : parseFloat(String(rawM ?? '0').replace(',', '.')) || 0
    const created = await db.vehiculeDepense.create({
      data: { vehiculeId: id, libelle, montant: Math.max(0, montantNum) },
    })
    return res.status(201).json(toDepense(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id/depenses/:depenseId', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const depenseId = Number(req.params.depenseId)
    if (isNaN(id) || isNaN(depenseId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehiculeDepense.findFirst({
      where: { id: depenseId, vehiculeId: id },
    })
    if (!existing) return res.status(404).json({ error: 'Ligne introuvable' })
    if (existing.productId != null && existing.quantite != null) {
      return res.status(400).json({ error: 'Ligne liée au stock : supprimez-la pour réintégrer le stock, ou ajoutez une ligne manuelle.' })
    }
    const body = req.body as { libelle?: string; montant?: unknown }
    const libelle = body.libelle !== undefined ? String(body.libelle).trim().slice(0, 500) : existing.libelle
    let montant = existing.montant
    if (body.montant !== undefined) {
      const rawM = body.montant
      const m =
        typeof rawM === 'number' && !Number.isNaN(rawM)
          ? rawM
          : parseFloat(String(rawM).replace(',', '.')) || 0
      montant = Math.max(0, m)
    }
    const updated = await db.vehiculeDepense.update({
      where: { id: depenseId },
      data: { libelle, montant },
    })
    return res.json(toDepense(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/depenses/:depenseId', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const depenseId = Number(req.params.depenseId)
    if (isNaN(id) || isNaN(depenseId)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehiculeDepense.findFirst({
      where: { id: depenseId, vehiculeId: id },
    })
    if (!existing) return res.status(404).json({ error: 'Ligne introuvable' })

    if (existing.productId != null && existing.quantite != null && existing.quantite > 0) {
      const pid = existing.productId
      const qte = existing.quantite
      const cout = Number(existing.cout_stock_sortie ?? 0)
      const produit = await db.produitStock.findUnique({ where: { id: pid } })
      if (produit) {
        const dateStr = new Date().toISOString().slice(0, 10)
        const newQty = produit.quantite + qte
        const newVal = Math.max(0, produit.valeur_achat_ttc + cout)
        await db.$transaction([
          db.produitStock.update({
            where: { id: pid },
            data: {
              quantite: newQty,
              valeur_achat_ttc: newVal,
              dernier_prix_unitaire_ttc: newQty > 0 ? newVal / newQty : produit.dernier_prix_unitaire_ttc ?? 0,
            },
          }),
          db.mouvementStock.create({
            data: {
              productId: pid,
              date: dateStr,
              produit_nom: produit.nom,
              quantite: qte,
              type: 'entree',
              origine: 'vehicule',
              reference: `annulation_depense:${id}`,
            },
          }),
          db.vehiculeDepense.delete({ where: { id: depenseId } }),
        ])
      } else {
        await db.vehiculeDepense.delete({ where: { id: depenseId } })
      }
    } else {
      await db.vehiculeDepense.delete({ where: { id: depenseId } })
    }
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/historique', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const list = await db.vehiculeHistorique.findMany({
      where: { vehiculeId: id },
      orderBy: { date_changement: 'asc' },
    })
    return res.json(list.map(toHistorique))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const v = await db.vehicule.findUnique({ where: { id } })
    if (!v) return res.status(404).json({ error: 'Véhicule introuvable' })
    return res.json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id/images', authenticate(), async (req, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })

    const images = await db.vehiculeImage.findMany({
      where: { vehiculeId: id },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(images.map(toVehiculeImage))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/images', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as { dataUrl?: string; fileName?: string; category?: string; note?: string }
    const parsed = parseDataUrl(body.dataUrl)
    if (!parsed) {
      return res.status(400).json({ error: "Image invalide (format attendu: data URL base64 JPEG/PNG/WEBP/HEIC)." })
    }
    if (parsed.buffer.length > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Image trop lourde (max 8 MB).' })
    }

    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })

    const category =
      body.category && IMAGE_CATEGORIES.includes(body.category as (typeof IMAGE_CATEGORIES)[number])
        ? body.category
        : 'etat_exterieur'
    const note = (body.note ?? '').trim().slice(0, 500)
    const originalName = sanitizeOriginalName(body.fileName)
    const ext = getImageExtension(parsed.mimeType)
    const generatedName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${ext}`

    const vehiculeDir = path.join(UPLOADS_ROOT, String(id))
    await fs.mkdir(vehiculeDir, { recursive: true })
    const diskPath = path.join(vehiculeDir, generatedName)
    await fs.writeFile(diskPath, parsed.buffer)

    const created = await db.vehiculeImage.create({
      data: {
        vehiculeId: id,
        url_path: `/uploads/vehicules/${id}/${generatedName}`,
        original_name: originalName,
        mime_type: parsed.mimeType,
        size_bytes: parsed.buffer.length,
        category,
        note,
        created_by_id: req.user?.sub ?? null,
        created_by: req.user?.fullName ?? req.user?.email ?? '',
      },
    })

    return res.status(201).json(toVehiculeImage(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/images/:imageId', authenticate(), async (req, res) => {
  try {
    if (!db.vehiculeImage) {
      return res.status(500).json({
        error:
          "Prisma client n'est pas à jour pour VehiculeImage. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance.",
      })
    }
    const id = Number(req.params.id)
    const imageId = Number(req.params.imageId)
    if (isNaN(id) || isNaN(imageId)) return res.status(400).json({ error: 'ID invalide' })

    const image = await db.vehiculeImage.findFirst({
      where: { id: imageId, vehiculeId: id },
    })
    if (!image) return res.status(404).json({ error: 'Photo introuvable' })

    const relativePath = String(image.url_path).startsWith('/uploads/')
      ? String(image.url_path).replace('/uploads/', '')
      : String(image.url_path)
    const diskPath = path.join(path.resolve(process.cwd(), 'uploads'), relativePath)

    await db.vehiculeImage.delete({ where: { id: imageId } })
    await fs.unlink(diskPath).catch(() => undefined)

    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticate(), async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      immatriculation?: string
      modele?: string
      type?: string
      etat_initial?: string
      date_entree?: string
      defaut?: string
      service_type?: string
      technicien_id?: number | null
      responsable_id?: number | null
      technicien_ids?: number[]
      responsable_ids?: number[]
      client_telephone?: string
      notes?: string
    }
    if (!body.modele || !body.date_entree) {
      return res.status(400).json({ error: 'modele et date_entree sont requis' })
    }
    const now = new Date().toISOString()
    const etat = body.etat_initial && ETATS.includes(body.etat_initial as (typeof ETATS)[number]) ? body.etat_initial : 'orange'
    const type = body.type && TYPES.includes(body.type as (typeof TYPES)[number]) ? body.type : 'voiture'

    const technicienIds = normalizeIds(body.technicien_ids)
    const responsableIds = normalizeIds(body.responsable_ids)
    const finalTechnicienId = technicienIds[0] ?? body.technicien_id ?? null
    const finalResponsableId = responsableIds[0] ?? body.responsable_id ?? null
    const mergedNotes = mergeNotesWithAssignees(body.notes, technicienIds, responsableIds)

    const v = await db.vehicule.create({
      data: {
        immatriculation: (body.immatriculation ?? '').trim(),
        modele: body.modele.trim(),
        type,
        etat_actuel: etat,
        service_type: (body.service_type ?? 'autre').trim() || 'autre',
        technicien_id: finalTechnicienId,
        responsable_id: finalResponsableId,
        defaut: splitNotesAndAssignees(body.defaut ?? '').notes,
        client_telephone: (body.client_telephone ?? '').trim(),
        date_entree: body.date_entree,
        date_sortie: null,
        notes: mergedNotes,
        derniere_mise_a_jour: now,
      },
    })

    const user = req.user
    if (user) {
      await db.vehiculeHistorique.create({
        data: {
          vehiculeId: v.id,
          etat_precedent: null,
          etat_nouveau: etat,
          date_changement: now,
          utilisateur_id: user.sub,
          utilisateur_nom: user.fullName ?? user.email,
          commentaire: `Réception du véhicule - ${body.defaut ?? ''}`,
          duree_etat_precedent_min: null,
          pieces_utilisees: '',
        },
      })
      await notifyAssignedTechnicians({
        actorId: user.sub,
        vehiculeId: v.id,
        modele: v.modele,
        immatriculation: v.immatriculation,
        technicienIds,
        responsableIds,
        isNew: true,
      })
    }

    return res.status(201).json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as Partial<{
      immatriculation: string
      modele: string
      type: string
      defaut: string
      service_type: string
      technicien_id: number | null
      responsable_id: number | null
      technicien_ids: number[]
      responsable_ids: number[]
      client_telephone: string
      notes: string
      date_entree: string
    }>

    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })

    const existingMeta = splitNotesAndAssignees(existing.notes)
    const prevTechnicienIds = existingMeta.technicien_ids.length
      ? existingMeta.technicien_ids
      : existing.technicien_id != null
        ? [existing.technicien_id]
        : []
    const prevResponsableIds = existingMeta.responsable_ids.length
      ? existingMeta.responsable_ids
      : existing.responsable_id != null
        ? [existing.responsable_id]
        : []
    const technicienIds = normalizeIds(body.technicien_ids)
    const responsableIds = normalizeIds(body.responsable_ids)
    const resolvedTechnicienIds = technicienIds.length
      ? technicienIds
      : body.technicien_id !== undefined
        ? (body.technicien_id != null ? [body.technicien_id] : [])
        : existingMeta.technicien_ids
    const resolvedResponsableIds = responsableIds.length
      ? responsableIds
      : body.responsable_id !== undefined
        ? (body.responsable_id != null ? [body.responsable_id] : [])
        : existingMeta.responsable_ids
    const data: Record<string, unknown> = { derniere_mise_a_jour: new Date().toISOString() }
    if (body.immatriculation != null) data.immatriculation = body.immatriculation
    if (body.modele != null) data.modele = body.modele
    if (body.type != null && TYPES.includes(body.type as (typeof TYPES)[number])) data.type = body.type
    if (body.defaut != null) data.defaut = splitNotesAndAssignees(body.defaut).notes
    if (body.service_type != null) data.service_type = body.service_type
    if (body.technicien_id !== undefined || body.technicien_ids !== undefined) data.technicien_id = resolvedTechnicienIds[0] ?? null
    if (body.responsable_id !== undefined || body.responsable_ids !== undefined) data.responsable_id = resolvedResponsableIds[0] ?? null
    if (body.client_telephone != null) data.client_telephone = body.client_telephone
    if (
      body.notes != null ||
      body.technicien_id !== undefined ||
      body.responsable_id !== undefined ||
      body.technicien_ids !== undefined ||
      body.responsable_ids !== undefined
    ) {
      data.notes = mergeNotesWithAssignees(
        body.notes != null ? body.notes : existing.notes,
        resolvedTechnicienIds,
        resolvedResponsableIds
      )
    }
    if (body.date_entree != null) data.date_entree = body.date_entree

    const v = await db.vehicule.update({ where: { id }, data })
    const actor = req.user
    if (actor) {
      const who = actor.fullName ?? actor.email
      await notifyAdminsVehicule({
        actorId: actor.sub,
        vehiculeId: id,
        type: 'vehicule_update',
        title: 'Véhicule modifié',
        message: `${v.modele} (${(v.immatriculation ?? '').trim() || 'sans immat.'}) — fiche modifiée par ${who}.`,
      })
      const prevIds = new Set([...prevTechnicienIds, ...prevResponsableIds])
      const newTechnicienIds = resolvedTechnicienIds.filter(uid => !prevIds.has(uid))
      const newResponsableIds = resolvedResponsableIds.filter(uid => !prevIds.has(uid))
      if (newTechnicienIds.length || newResponsableIds.length) {
        await notifyAssignedTechnicians({
          actorId: actor.sub,
          vehiculeId: id,
          modele: v.modele,
          immatriculation: v.immatriculation,
          technicienIds: newTechnicienIds,
          responsableIds: newResponsableIds,
          isNew: false,
        })
      }
    }
    return res.json(toVehicule(v))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.vehicule.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Véhicule introuvable' })
    await db.vehicule.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/changer-etat', authenticate(), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { nouvel_etat?: string; commentaire?: string; pieces_utilisees?: string }
    if (!body.nouvel_etat || !ETATS.includes(body.nouvel_etat as (typeof ETATS)[number])) {
      return res.status(400).json({ error: 'nouvel_etat invalide' })
    }

    const vehicule = await db.vehicule.findUnique({ where: { id } })
    if (!vehicule) return res.status(404).json({ error: 'Véhicule introuvable' })

    const allowed = TRANSITIONS[vehicule.etat_actuel]
    if (!allowed || !allowed.includes(body.nouvel_etat)) {
      return res.status(400).json({ error: 'Transition non autorisée' })
    }

    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })

    const now = new Date().toISOString()
    const lastHist = await db.vehiculeHistorique.findFirst({
      where: { vehiculeId: id },
      orderBy: { date_changement: 'desc' },
    })
    let duree: number | null = null
    if (lastHist) {
      duree = Math.round((new Date(now).getTime() - new Date(lastHist.date_changement).getTime()) / 60000)
    }

    const dateSortie = body.nouvel_etat === 'vert' ? now.split('T')[0] : null

    await db.$transaction([
      db.vehicule.update({
        where: { id },
        data: {
          etat_actuel: body.nouvel_etat,
          derniere_mise_a_jour: now,
          date_sortie: dateSortie ?? undefined,
        },
      }),
      db.vehiculeHistorique.create({
        data: {
          vehiculeId: id,
          etat_precedent: vehicule.etat_actuel,
          etat_nouveau: body.nouvel_etat,
          date_changement: now,
          utilisateur_id: user.sub,
          utilisateur_nom: user.fullName ?? user.email,
          commentaire: (body.commentaire ?? '').trim(),
          duree_etat_precedent_min: duree,
          pieces_utilisees: (body.pieces_utilisees ?? '').trim(),
        },
      }),
    ])

    const who = user.fullName ?? user.email
    const ref = `${vehicule.modele} (${(vehicule.immatriculation ?? '').trim() || 'sans immat.'})`
    await notifyAdminsVehicule({
      actorId: user.sub,
      vehiculeId: id,
      type: 'vehicule_etat',
      title: 'Changement d’état véhicule',
      message: `${ref} : ${etatLabel(vehicule.etat_actuel)} → ${etatLabel(body.nouvel_etat)} — par ${who}.`,
    })

    const updated = await db.vehicule.findUnique({ where: { id } })
    return res.json(toVehicule(updated!))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
