import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const db = prisma as any

type ChecklistStatus = 'todo' | 'done' | 'na'
type ChecklistWorkflow = 'draft' | 'submitted' | 'validated' | 'rejected'

interface ChecklistItem {
  id: string
  label: string
  status: ChecklistStatus
  comment: string
}

interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

interface ChecklistData {
  version: number
  sections: ChecklistSection[]
}

interface ChecklistAuditLogDto {
  id: number
  checklistId: number
  action: string
  actorId: number | null
  actorName: string
  actorRole: string
  summary: string
  snapshot: ChecklistData | null
  createdAt: string
}

interface ChecklistWithMetricsDto {
  id: number
  userId: number
  userName: string
  role: string
  date: string
  status: ChecklistWorkflow
  data: ChecklistData
  submittedAt: string | null
  validatedAt: string | null
  validatorId: number | null
  validatorName: string
  validatorComment: string
  createdAt: string
  updatedAt: string
  metrics: { done: number; todo: number; na: number; total: number; nonConformities: number }
  lateSubmission: boolean
}

function ensureChecklistModel(res: any): boolean {
  if (!db.dailyChecklist) {
    res.status(500).json({
      error:
        "Prisma client n'est pas à jour pour DailyChecklist. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance le serveur.",
    })
    return false
  }
  return true
}

function ensureAuditModel(res: any): boolean {
  if (!db.checklistAuditLog) {
    res.status(500).json({
      error:
        "Prisma client n'est pas à jour pour ChecklistAuditLog. Arrête le backend, exécute `cd backend && npx prisma generate`, puis relance le serveur.",
    })
    return false
  }
  return true
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function mapChecklistRole(userRole: string): 'chef_atelier' | 'coordinateur' | 'technicien' {
  const role = (userRole ?? '').toLowerCase()
  if (role === 'chef_atelier' || role === 'coordinateur' || role === 'technicien') {
    return role
  }
  if (role === 'admin') return 'chef_atelier'
  if (role === 'responsable' || role === 'financier') return 'coordinateur'
  return 'technicien'
}

function createSection(id: string, title: string, labels: string[]): ChecklistSection {
  return {
    id,
    title,
    items: labels.map((label, idx) => ({
      id: `${id}-${idx + 1}`,
      label,
      status: 'todo',
      comment: '',
    })),
  }
}

const CHECKLIST_TEMPLATES_KEY = 'checklist_templates'
type ChecklistRoleKey = 'chef_atelier' | 'coordinateur' | 'technicien'
const CHECKLIST_ROLES: ChecklistRoleKey[] = ['chef_atelier', 'coordinateur', 'technicien']

function resetAllTodo(data: ChecklistData): ChecklistData {
  return {
    version: 1,
    sections: data.sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        status: 'todo' as const,
        comment: '',
      })),
    })),
  }
}

async function loadRawTemplateStore(): Promise<Record<string, unknown> | null> {
  const row = await db.appSetting.findUnique({ where: { key: CHECKLIST_TEMPLATES_KEY } })
  const v = row?.value
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

async function loadTemplateStore(): Promise<Partial<Record<ChecklistRoleKey, ChecklistData>> | null> {
  const raw = await loadRawTemplateStore()
  if (!raw) return null
  const out: Partial<Record<ChecklistRoleKey, ChecklistData>> = {}
  for (const r of CHECKLIST_ROLES) {
    const part = raw[r]
    if (part) {
      const normalized = normalizeData(part, r)
      if (normalized.sections.length > 0) out[r] = resetAllTodo(normalized)
    }
  }
  return Object.keys(out).length ? out : null
}

function effectiveTemplateForRole(
  role: ChecklistRoleKey,
  store: Partial<Record<ChecklistRoleKey, ChecklistData>> | null,
): ChecklistData {
  const custom = store?.[role]
  if (custom && custom.sections.length > 0) return custom
  return createTemplate(role)
}

function validateAdminTemplatePayload(data: unknown, role: ChecklistRoleKey): ChecklistData | null {
  const normalized = normalizeData(data ?? {}, role)
  if (normalized.sections.length === 0) return null
  if (normalized.sections.length > 25) return null
  let totalItems = 0
  for (const s of normalized.sections) {
    if (!String(s.title ?? '').trim()) return null
    if (s.items.length === 0 || s.items.length > 80) return null
    for (const it of s.items) {
      if (!String(it.label ?? '').trim()) return null
      if (it.label.length > 600) return null
      totalItems += 1
    }
  }
  if (totalItems > 300) return null
  return resetAllTodo(normalized)
}

function isChecklistAdmin(req: AuthRequest): boolean {
  return (req.user?.role ?? '').toLowerCase() === 'admin'
}

function createTemplate(role: 'chef_atelier' | 'coordinateur' | 'technicien'): ChecklistData {
  if (role === 'chef_atelier') {
    return {
      version: 1,
      sections: [
        createSection('arrivee', 'Arrivee / Debut de journee', [
          'Arriver a 07:30 et signer le pointage.',
          "Verifier presence et tenue de toute l'equipe.",
          "Tour rapide de l'atelier: sol propre, pas d'huile, outils en place, machines fonctionnelles.",
          'Preparer le planning du jour et repartir les vehicules selon priorite.',
          'Mini reunion de 5 minutes avec mecaniciens et coordinateur: objectifs, urgences et securite.',
        ]),
        createSection('durant', 'Durant la journee', [
          'Surveiller la progression des reparations.',
          'Inspecter chaque vehicule apres reparation.',
          'Verification du respect des normes de securite et qualite.',
          'Gerer retards et reaffecter les taches si necessaire.',
          "Verifier l'utilisation correcte des outils et equipements.",
        ]),
        createSection('fin', 'Fin journee / Depart', [
          'Verifier que tous les vehicules termines sont prets pour livraison.',
          'Verifier que les postes de travail sont ranges.',
          'Verifier que les outils lourds et machines sont eteints et securises.',
          'Noter problemes rencontres ou retards pour le lendemain.',
          'Signer et transmettre le rapport quotidien au gerant.',
        ]),
      ],
    }
  }

  if (role === 'coordinateur') {
    return {
      version: 1,
      sections: [
        createSection('arrivee', 'Arrivee / Debut de journee', [
          'Arriver a 7:30 et signer le pointage.',
          'Verifier les rendez-vous clients du jour.',
          'Preparer les fiches de travail.',
          'Verifier disponibilite des pieces avant le debut du travail.',
          "Informer l'equipe des vehicules urgents.",
        ]),
        createSection('durant', 'Durant la journee', [
          'Mettre a jour le statut des vehicules.',
          'Contacter les clients pour mise a jour sur reparation.',
          'Coordonner entre mecaniciens et chef atelier pour respecter le planning.',
          'Verifier que les outils et pieces utilises sont remis en place apres chaque intervention.',
        ]),
        createSection('fin', 'Fin de journee / Depart', [
          'Confirmer vehicules prets a etre recuperes par clients.',
          'Ranger le bureau et dossiers clients.',
          'Mettre a jour liste pieces restantes ou manquantes.',
          'Faire point final avec le chef atelier.',
        ]),
      ],
    }
  }

  return {
    version: 1,
    sections: [
      createSection('arrivee', 'Arrivee / Debut de journee', [
        'Arriver a 07:30 et signer le pointage.',
        'Tenue complete.',
        'Preparer poste de travail et nettoyer sol, outils et surface.',
        'Verifier fiche du premier vehicule.',
      ]),
      createSection('durant', 'Durant la journee', [
        'Suivre les instructions du chef mecanicien / chef atelier.',
        'Executer reparations simples ou preparatoires.',
        'Ranger outils apres chaque intervention.',
        'Signaler tout probleme ou incident.',
      ]),
      createSection('fin', 'Fin journee / Depart', [
        'Nettoyage complet du poste et de la zone de travail.',
        'Ranger tous les outils, chariots et pieces.',
        'Verifier que le sol est propre.',
        'Signaler anomalies ou materiel manquants.',
        'Sortie du garage apres approbation du chef atelier.',
      ]),
    ],
  }
}

function normalizeData(data: unknown, fallbackRole: 'chef_atelier' | 'coordinateur' | 'technicien'): ChecklistData {
  if (!data || typeof data !== 'object') return createTemplate(fallbackRole)
  const d = data as { version?: unknown; sections?: unknown }
  if (!Array.isArray(d.sections)) return createTemplate(fallbackRole)
  const sections: ChecklistSection[] = d.sections
    .filter(s => s && typeof s === 'object')
    .map((section, idx) => {
      const sec = section as { id?: unknown; title?: unknown; items?: unknown }
      const items = Array.isArray(sec.items) ? sec.items : []
      return {
        id: typeof sec.id === 'string' ? sec.id : `section-${idx + 1}`,
        title: typeof sec.title === 'string' ? sec.title : `Section ${idx + 1}`,
        items: items
          .filter(it => it && typeof it === 'object')
          .map((it, jdx) => {
            const item = it as { id?: unknown; label?: unknown; status?: unknown; comment?: unknown }
            const status: ChecklistStatus =
              item.status === 'done' || item.status === 'na' || item.status === 'todo' ? item.status : 'todo'
            return {
              id: typeof item.id === 'string' ? item.id : `item-${jdx + 1}`,
              label: typeof item.label === 'string' ? item.label : `Tache ${jdx + 1}`,
              status,
              comment: typeof item.comment === 'string' ? item.comment : '',
            }
          }),
      }
    })
  return { version: 1, sections }
}

function toChecklistRoleKey(role: string): ChecklistRoleKey {
  const r = String(role ?? '').toLowerCase()
  if (r === 'chef_atelier' || r === 'coordinateur' || r === 'technicien') return r
  return 'technicien'
}

function checklistsDataEqual(a: ChecklistData, b: ChecklistData): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Structure et libellés = modèle courant ; statut / commentaire repris si même id de section et de tâche.
 * Nouvelles tâches → todo ; tâches supprimées du modèle → absentes du résultat.
 */
function reconcileSavedWithTemplate(saved: ChecklistData, template: ChecklistData): ChecklistData {
  const savedSectionsById = new Map(saved.sections.map(s => [s.id, s]))
  const sections: ChecklistSection[] = template.sections.map(ts => {
    const oldSec = savedSectionsById.get(ts.id)
    const oldItemsById = oldSec ? new Map(oldSec.items.map(i => [i.id, i])) : new Map<string, ChecklistItem>()
    const items: ChecklistItem[] = ts.items.map(ti => {
      const old = oldItemsById.get(ti.id)
      let status: ChecklistStatus = 'todo'
      if (old && (old.status === 'done' || old.status === 'na' || old.status === 'todo')) status = old.status
      const comment = old && typeof old.comment === 'string' ? old.comment : ''
      return {
        id: ti.id,
        label: ti.label,
        status,
        comment,
      }
    })
    return { id: ts.id, title: ts.title, items }
  })
  return { version: 1, sections }
}

async function syncChecklistRowWithEffectiveTemplate(
  checklist: any,
  templateStore: Awaited<ReturnType<typeof loadTemplateStore>>,
): Promise<any> {
  const st = checklist.status as ChecklistWorkflow
  if (st !== 'draft' && st !== 'rejected') return checklist
  const roleKey = toChecklistRoleKey(String(checklist.role))
  const template = effectiveTemplateForRole(roleKey, templateStore)
  const saved = normalizeData(checklist.data, roleKey)
  const reconciled = reconcileSavedWithTemplate(saved, template)
  if (checklistsDataEqual(saved, reconciled)) return checklist
  await db.dailyChecklist.update({
    where: { id: checklist.id },
    data: { data: reconciled as object },
  })
  return await db.dailyChecklist.findUnique({
    where: { id: checklist.id },
    include: { user: true, validator: true },
  })
}

function mapChecklist(row: any) {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user?.fullName ?? '',
    role: row.role,
    date: row.date,
    status: row.status as ChecklistWorkflow,
    data: row.data as ChecklistData,
    submittedAt: row.submittedAt ? new Date(row.submittedAt).toISOString() : null,
    validatedAt: row.validatedAt ? new Date(row.validatedAt).toISOString() : null,
    validatorId: row.validatorId ?? null,
    validatorName: row.validator?.fullName ?? '',
    validatorComment: row.validatorComment ?? '',
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

function mapChecklistWithMetrics(row: any): ChecklistWithMetricsDto {
  const base = mapChecklist(row)
  const normalized = normalizeData(base.data, mapChecklistRole(base.role))
  const metrics = checklistCounts(normalized)
  return {
    ...base,
    data: normalized,
    metrics,
    lateSubmission: isLateSubmission(base.date, row.submittedAt),
  }
}

function mapAuditLog(row: any): ChecklistAuditLogDto {
  return {
    id: row.id,
    checklistId: row.checklistId,
    action: row.action,
    actorId: row.actorId ?? null,
    actorName: row.actorName ?? '',
    actorRole: row.actorRole ?? '',
    summary: row.summary ?? '',
    snapshot: (row.snapshot as ChecklistData | null) ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

function checklistCounts(data: ChecklistData): { done: number; todo: number; na: number; total: number; nonConformities: number } {
  let done = 0
  let todo = 0
  let na = 0
  data.sections.forEach(section => {
    section.items.forEach(item => {
      if (item.status === 'done') done += 1
      else if (item.status === 'na') na += 1
      else todo += 1
    })
  })
  return { done, todo, na, total: done + todo + na, nonConformities: todo }
}

function makeSubmissionDeadline(date: string): Date {
  return new Date(`${date}T17:30:00`)
}

function isLateSubmission(date: string, submittedAt?: Date | null): boolean {
  if (!submittedAt) return false
  return submittedAt.getTime() > makeSubmissionDeadline(date).getTime()
}

async function createAuditLog(params: {
  checklistId: number
  action: string
  actor?: AuthRequest['user']
  summary: string
  snapshot?: ChecklistData | null
}) {
  if (!db.checklistAuditLog) return
  const { checklistId, action, actor, summary, snapshot } = params
  await db.checklistAuditLog.create({
    data: {
      checklistId,
      action,
      actorId: actor?.sub ?? null,
      actorName: actor?.fullName ?? actor?.email ?? '',
      actorRole: actor?.role ?? '',
      summary,
      snapshot: snapshot ?? null,
    },
  })
}

function csvEscape(val: unknown): string {
  const s = String(val ?? '')
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function parseOptionalInt(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined
  const raw = String(val).trim()
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isInteger(n)) return undefined
  return n
}

function canReview(userRole: string): boolean {
  return ['admin', 'responsable'].includes((userRole ?? '').toLowerCase())
}

function canReadChecklist(user: NonNullable<AuthRequest['user']>, checklistUserId: number): boolean {
  if (user.sub === checklistUserId) return true
  return canReview(user.role)
}

router.use(authenticate())

router.get('/admin/templates', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    if (!isChecklistAdmin(req)) return res.status(403).json({ error: 'Réservé aux administrateurs' })
    const store = await loadTemplateStore()
    const effective = Object.fromEntries(
      CHECKLIST_ROLES.map(r => [r, effectiveTemplateForRole(r, store)]),
    ) as Record<ChecklistRoleKey, ChecklistData>
    const defaults = Object.fromEntries(CHECKLIST_ROLES.map(r => [r, createTemplate(r)])) as Record<
      ChecklistRoleKey,
      ChecklistData
    >
    const usingCustom = Object.fromEntries(CHECKLIST_ROLES.map(r => [r, Boolean(store?.[r])])) as Record<
      ChecklistRoleKey,
      boolean
    >
    return res.json({ effective, defaults, usingCustom })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/admin/templates', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    if (!isChecklistAdmin(req)) return res.status(403).json({ error: 'Réservé aux administrateurs' })
    const body = req.body as { templates?: unknown }
    const t = body?.templates
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      return res.status(400).json({ error: 'Body "templates" (objet) requis' })
    }
    const src = t as Record<string, unknown>
    const keysToUpdate = CHECKLIST_ROLES.filter(
      r => Object.prototype.hasOwnProperty.call(src, r) && src[r] !== undefined && src[r] !== null,
    )
    if (keysToUpdate.length === 0) {
      return res.status(400).json({ error: 'Indiquez au moins un profil dans templates (ex. { templates: { technicien: {...} } })' })
    }
    const validated: Partial<Record<ChecklistRoleKey, ChecklistData>> = {}
    for (const r of keysToUpdate) {
      const v = validateAdminTemplatePayload(src[r], r)
      if (!v) return res.status(400).json({ error: `Modèle invalide pour le profil: ${r}` })
      validated[r] = v
    }
    const existingRow = await db.appSetting.findUnique({ where: { key: CHECKLIST_TEMPLATES_KEY } })
    const base =
      existingRow?.value && typeof existingRow.value === 'object' && !Array.isArray(existingRow.value)
        ? { ...(existingRow.value as Record<string, unknown>) }
        : {}
    for (const r of keysToUpdate) {
      base[r] = validated[r]!
    }
    await db.appSetting.upsert({
      where: { key: CHECKLIST_TEMPLATES_KEY },
      create: { key: CHECKLIST_TEMPLATES_KEY, value: base as object },
      update: { value: base as object },
    })
    const store = await loadTemplateStore()
    const effective = Object.fromEntries(
      CHECKLIST_ROLES.map(r => [r, effectiveTemplateForRole(r, store)]),
    ) as Record<ChecklistRoleKey, ChecklistData>
    const defaults = Object.fromEntries(CHECKLIST_ROLES.map(r => [r, createTemplate(r)])) as Record<
      ChecklistRoleKey,
      ChecklistData
    >
    const usingCustom = Object.fromEntries(CHECKLIST_ROLES.map(r => [r, Boolean(store?.[r])])) as Record<
      ChecklistRoleKey,
      boolean
    >
    return res.json({ effective, defaults, usingCustom })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/admin/templates/:role', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    if (!isChecklistAdmin(req)) return res.status(403).json({ error: 'Réservé aux administrateurs' })
    const role = String(req.params.role || '') as ChecklistRoleKey
    if (!CHECKLIST_ROLES.includes(role)) return res.status(400).json({ error: 'Profil inconnu' })
    const existing = await db.appSetting.findUnique({ where: { key: CHECKLIST_TEMPLATES_KEY } })
    if (!existing?.value || typeof existing.value !== 'object' || Array.isArray(existing.value)) {
      return res.json({ ok: true })
    }
    const raw = { ...(existing.value as Record<string, unknown>) }
    if (!(role in raw)) return res.json({ ok: true })
    delete raw[role]
    await db.appSetting.update({
      where: { key: CHECKLIST_TEMPLATES_KEY },
      data: { value: raw as object },
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me/today', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const date = (String(req.query.date ?? '') || getTodayDate()).slice(0, 10)
    const mappedRole = mapChecklistRole(user.role)
    const templateStore = await loadTemplateStore()

    let checklist = await db.dailyChecklist.findUnique({
      where: { userId_date: { userId: user.sub, date } },
      include: { user: true, validator: true },
    })

    if (!checklist) {
      checklist = await db.dailyChecklist.create({
        data: {
          userId: user.sub,
          role: mappedRole,
          date,
          status: 'draft',
          data: effectiveTemplateForRole(mappedRole, templateStore),
        },
        include: { user: true, validator: true },
      })
      await createAuditLog({
        checklistId: checklist.id,
        action: 'created',
        actor: user,
        summary: `Checklist creee (${mappedRole})`,
        snapshot: checklist.data as ChecklistData,
      })
    }

    checklist = await syncChecklistRowWithEffectiveTemplate(checklist, templateStore)

    return res.json(mapChecklist(checklist))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me/history', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 60)))
    const from = String(req.query.from ?? '').slice(0, 10)
    const to = String(req.query.to ?? '').slice(0, 10)
    const where: Record<string, unknown> = { userId: user.sub }
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, string>).gte = from
      if (to) (where.date as Record<string, string>).lte = to
    }
    const list = await db.dailyChecklist.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: { user: true, validator: true },
    })
    return res.json(list.map(mapChecklist))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/audit/:id', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res) || !ensureAuditModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const checklist = await db.dailyChecklist.findUnique({ where: { id } })
    if (!checklist) return res.status(404).json({ error: 'Checklist introuvable' })
    if (!canReadChecklist(user, checklist.userId)) return res.status(403).json({ error: 'Acces refuse' })

    const logs = await db.checklistAuditLog.findMany({
      where: { checklistId: id },
      orderBy: { createdAt: 'asc' },
    })
    return res.json(logs.map(mapAuditLog))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/kpi/monthly', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })

    const year = Math.max(2000, Math.min(2100, Number(req.query.year) || new Date().getFullYear()))
    const month = Math.max(1, Math.min(12, Number(req.query.month) || new Date().getMonth() + 1))
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
    const canSeeAll = canReview(user.role)

    const where: Record<string, unknown> = { date: { startsWith: monthPrefix } }
    if (!canSeeAll) where.userId = user.sub

    const rows = await db.dailyChecklist.findMany({
      where,
      include: { user: true, validator: true },
      orderBy: { date: 'desc' },
    })

    let submitted = 0
    let validated = 0
    let rejected = 0
    let lateSubmissions = 0
    let nonConformities = 0
    for (const row of rows) {
      const data = normalizeData(row.data, mapChecklistRole(row.role))
      const counts = checklistCounts(data)
      nonConformities += counts.nonConformities
      if (row.status === 'submitted' || row.status === 'validated' || row.status === 'rejected') {
        submitted += 1
      }
      if (row.status === 'validated') validated += 1
      if (row.status === 'rejected') rejected += 1
      if (isLateSubmission(row.date, row.submittedAt)) lateSubmissions += 1
    }

    const byRole: Record<string, number> = {}
    rows.forEach((r: any) => {
      byRole[r.role] = (byRole[r.role] ?? 0) + 1
    })

    const submissionRate = rows.length > 0 ? Math.round((submitted / rows.length) * 100) : 0
    const validationRate = submitted > 0 ? Math.round((validated / submitted) * 100) : 0

    return res.json({
      period: monthPrefix,
      totalChecklists: rows.length,
      submitted,
      validated,
      rejected,
      lateSubmissions,
      nonConformities,
      submissionRate,
      validationRate,
      byRole,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/export', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })

    const from = String(req.query.from ?? '').slice(0, 10)
    const to = String(req.query.to ?? '').slice(0, 10)
    const format = String(req.query.format ?? 'json').toLowerCase()
    const status = String(req.query.status ?? '')
    const canSeeAll = canReview(user.role)
    const userId = Number(req.query.userId)

    const where: Record<string, unknown> = {}
    if (!canSeeAll) {
      where.userId = user.sub
    } else if (!isNaN(userId)) {
      where.userId = userId
    }
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, string>).gte = from
      if (to) (where.date as Record<string, string>).lte = to
    }
    if (status) where.status = status

    const rows = await db.dailyChecklist.findMany({
      where,
      include: { user: true, validator: true },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    })

    const mapped = rows.map((row: any) => {
      const data = normalizeData(row.data, mapChecklistRole(row.role))
      const counts = checklistCounts(data)
      return {
        ...mapChecklist(row),
        metrics: counts,
        lateSubmission: isLateSubmission(row.date, row.submittedAt),
      }
    })

    if (format === 'csv') {
      const headers = [
        'Date',
        'Utilisateur',
        'Role',
        'Statut',
        'Fait',
        'Non Fait',
        'N/A',
        'Total',
        'Non Conformites',
        'Soumise En Retard',
        'Validateur',
        'Commentaire Validation',
      ]
      const csvRows = mapped.map((r: any) => [
        r.date,
        r.userName,
        r.role,
        r.status,
        r.metrics.done,
        r.metrics.todo,
        r.metrics.na,
        r.metrics.total,
        r.metrics.nonConformities,
        r.lateSubmission ? 'Oui' : 'Non',
        r.validatorName,
        r.validatorComment,
      ])
      const csv = [headers.map(csvEscape).join(';'), ...csvRows.map((row: any[]) => row.map(csvEscape).join(';'))].join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="checklists-${from || 'all'}-${to || 'all'}.csv"`)
      return res.send('\ufeff' + csv)
    }

    return res.json(mapped)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/item/:id', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const checklist = await db.dailyChecklist.findUnique({
      where: { id },
      include: { user: true, validator: true },
    })
    if (!checklist) return res.status(404).json({ error: 'Checklist introuvable' })
    if (!canReadChecklist(user, checklist.userId)) {
      return res.status(403).json({ error: 'Acces refuse' })
    }
    const templateStore = await loadTemplateStore()
    const synced = await syncChecklistRowWithEffectiveTemplate(checklist, templateStore)
    return res.json(mapChecklist(synced))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.dailyChecklist.findUnique({
      where: { id },
      include: { user: true, validator: true },
    })
    if (!existing) return res.status(404).json({ error: 'Checklist introuvable' })
    if (existing.userId !== user.sub) return res.status(403).json({ error: 'Acces refuse' })
    if (existing.status === 'validated') {
      return res.status(400).json({ error: 'Checklist deja validee, modification impossible.' })
    }
    if (existing.status === 'submitted') {
      return res.status(400).json({ error: 'Checklist soumise. Attendez validation ou rejet.' })
    }

    const roleKey = toChecklistRoleKey(String(existing.role))
    const templateStore = await loadTemplateStore()
    const template = effectiveTemplateForRole(roleKey, templateStore)
    const clientData = normalizeData((req.body as { data?: unknown }).data, roleKey)
    const reconciled = reconcileSavedWithTemplate(clientData, template)
    const updated = await db.dailyChecklist.update({
      where: { id },
      data: {
        data: reconciled as object,
        status: existing.status === 'rejected' ? 'draft' : existing.status,
      },
      include: { user: true, validator: true },
    })
    const c = checklistCounts(updated.data as ChecklistData)
    await createAuditLog({
      checklistId: updated.id,
      action: 'updated',
      actor: user,
      summary: `Brouillon mis a jour (${c.done}/${c.total} fait/NA)`,
      snapshot: updated.data as ChecklistData,
    })
    return res.json(mapChecklist(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const existing = await db.dailyChecklist.findUnique({
      where: { id },
      include: { user: true, validator: true },
    })
    if (!existing) return res.status(404).json({ error: 'Checklist introuvable' })
    if (existing.userId !== user.sub) return res.status(403).json({ error: 'Acces refuse' })
    if (existing.status === 'validated') {
      return res.status(400).json({ error: 'Checklist deja validee.' })
    }
    if (existing.status === 'submitted') {
      return res.status(400).json({ error: 'Checklist deja soumise.' })
    }

    const roleKey = toChecklistRoleKey(String(existing.role))
    const templateStore = await loadTemplateStore()
    const template = effectiveTemplateForRole(roleKey, templateStore)
    const saved = normalizeData(existing.data, roleKey)
    const reconciled = reconcileSavedWithTemplate(saved, template)

    const updated = await db.dailyChecklist.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        data: reconciled as object,
      },
      include: { user: true, validator: true },
    })
    const c = checklistCounts(updated.data as ChecklistData)
    await createAuditLog({
      checklistId: updated.id,
      action: 'submitted',
      actor: user,
      summary: `Checklist soumise (${c.done}/${c.total} fait/NA, non conformites: ${c.nonConformities})`,
      snapshot: updated.data as ChecklistData,
    })
    return res.json(mapChecklist(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/pending/review', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    if (!canReview(user.role)) {
      return res.status(403).json({ error: 'Acces reserve aux validateurs.' })
    }
    const date = String(req.query.date ?? '').slice(0, 10)
    const where: Record<string, unknown> = { status: 'submitted' }
    if (date) where.date = date
    const list = await db.dailyChecklist.findMany({
      where,
      include: { user: true, validator: true },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    })
    return res.json(list.map(mapChecklist))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/review/history', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    if (!canReview(user.role)) {
      return res.status(403).json({ error: 'Acces reserve aux validateurs.' })
    }

    const date = String(req.query.date ?? '').slice(0, 10)
    const from = String(req.query.from ?? '').slice(0, 10)
    const to = String(req.query.to ?? '').slice(0, 10)
    const status = String(req.query.status ?? '')
    const userId = parseOptionalInt(req.query.userId)
    const validatorId = parseOptionalInt(req.query.validatorId)
    const q = String(req.query.q ?? '').trim().toLowerCase()
    const sortBy = String(req.query.sortBy ?? 'date')
    const sortDir = String(req.query.sortDir ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 60)))
    const where: Record<string, unknown> = {
      status: status === 'validated' || status === 'rejected' ? status : { in: ['validated', 'rejected'] },
    }
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, string>).gte = from
      if (to) (where.date as Record<string, string>).lte = to
    } else if (date) {
      where.date = date
    }
    if (userId !== undefined) where.userId = userId
    if (validatorId !== undefined) where.validatorId = validatorId

    const list: any[] = await db.dailyChecklist.findMany({
      where,
      include: { user: true, validator: true },
      orderBy: [{ date: 'desc' }, { validatedAt: 'desc' }, { updatedAt: 'desc' }],
    })
    let mapped: ChecklistWithMetricsDto[] = list.map((row: any) => mapChecklistWithMetrics(row))
    if (q) {
      mapped = mapped.filter((row: ChecklistWithMetricsDto) => {
        const haystack = [
          row.userName,
          row.role,
          row.status,
          row.validatorName,
          row.validatorComment,
          JSON.stringify(row.data),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    const sortFactor = sortDir === 'asc' ? 1 : -1
    mapped.sort((a: ChecklistWithMetricsDto, b: ChecklistWithMetricsDto) => {
      if (sortBy === 'nonConformities') return (a.metrics.nonConformities - b.metrics.nonConformities) * sortFactor
      if (sortBy === 'late') return ((a.lateSubmission ? 1 : 0) - (b.lateSubmission ? 1 : 0)) * sortFactor
      if (sortBy === 'user') return a.userName.localeCompare(b.userName) * sortFactor
      if (sortBy === 'status') return a.status.localeCompare(b.status) * sortFactor
      const av = a.date || ''
      const bv = b.date || ''
      return av.localeCompare(bv) * sortFactor
    })

    return res.json(mapped.slice(0, limit))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/review/summary', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    if (!canReview(user.role)) {
      return res.status(403).json({ error: 'Acces reserve aux validateurs.' })
    }

    const from = String(req.query.from ?? '').slice(0, 10)
    const to = String(req.query.to ?? '').slice(0, 10)
    const where: Record<string, unknown> = {
      status: { in: ['validated', 'rejected'] },
    }
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, string>).gte = from
      if (to) (where.date as Record<string, string>).lte = to
    }

    const list: any[] = await db.dailyChecklist.findMany({
      where,
      include: { user: true, validator: true },
      orderBy: { date: 'desc' },
    })
    const rows: ChecklistWithMetricsDto[] = list.map((row: any) => mapChecklistWithMetrics(row))

    const byUser = new Map<
      number,
      {
        userId: number
        userName: string
        role: string
        total: number
        validated: number
        rejected: number
        lateSubmissions: number
        nonConformities: number
        completionPoints: number
      }
    >()

    rows.forEach((row: ChecklistWithMetricsDto) => {
      const existing = byUser.get(row.userId) ?? {
        userId: row.userId,
        userName: row.userName,
        role: row.role,
        total: 0,
        validated: 0,
        rejected: 0,
        lateSubmissions: 0,
        nonConformities: 0,
        completionPoints: 0,
      }
      existing.total += 1
      if (row.status === 'validated') existing.validated += 1
      if (row.status === 'rejected') existing.rejected += 1
      if (row.lateSubmission) existing.lateSubmissions += 1
      existing.nonConformities += row.metrics.nonConformities
      const completionRate = row.metrics.total > 0 ? row.metrics.done / row.metrics.total : 0
      existing.completionPoints += completionRate
      byUser.set(row.userId, existing)
    })

    const summary = Array.from(byUser.values())
      .map((row: {
        userId: number
        userName: string
        role: string
        total: number
        validated: number
        rejected: number
        lateSubmissions: number
        nonConformities: number
        completionPoints: number
      }) => ({
        userId: row.userId,
        userName: row.userName,
        role: row.role,
        total: row.total,
        validated: row.validated,
        rejected: row.rejected,
        lateSubmissions: row.lateSubmissions,
        nonConformities: row.nonConformities,
        avgCompletionRate: row.total > 0 ? Math.round((row.completionPoints / row.total) * 100) : 0,
      }))
      .sort((a, b) => b.nonConformities - a.nonConformities || b.lateSubmissions - a.lateSubmissions)

    return res.json(summary)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/review', async (req: AuthRequest, res) => {
  try {
    if (!ensureChecklistModel(res)) return
    const user = req.user
    if (!user) return res.status(401).json({ error: 'Authentification requise' })
    if (!canReview(user.role)) {
      return res.status(403).json({ error: 'Acces reserve aux validateurs.' })
    }
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as { action?: 'validate' | 'reject'; comment?: string }
    if (!body.action || !['validate', 'reject'].includes(body.action)) {
      return res.status(400).json({ error: "Action invalide (validate/reject)." })
    }
    if (body.action === 'reject' && !(body.comment ?? '').trim()) {
      return res.status(400).json({ error: 'Le motif est obligatoire pour un rejet.' })
    }

    const existing = await db.dailyChecklist.findUnique({
      where: { id },
      include: { user: true, validator: true },
    })
    if (!existing) return res.status(404).json({ error: 'Checklist introuvable' })
    if (existing.status !== 'submitted') {
      return res.status(400).json({ error: 'Seules les checklists soumises peuvent etre traitees.' })
    }

    const updated = await db.dailyChecklist.update({
      where: { id },
      data:
        body.action === 'validate'
          ? {
              status: 'validated',
              validatedAt: new Date(),
              validatorId: user.sub,
              validatorComment: (body.comment ?? '').trim(),
            }
          : {
              status: 'rejected',
              validatedAt: null,
              validatorId: user.sub,
              validatorComment: (body.comment ?? '').trim(),
            },
      include: { user: true, validator: true },
    })
    await createAuditLog({
      checklistId: updated.id,
      action: body.action === 'validate' ? 'validated' : 'rejected',
      actor: user,
      summary:
        body.action === 'validate'
          ? `Checklist validee${(body.comment ?? '').trim() ? `: ${(body.comment ?? '').trim()}` : ''}`
          : `Checklist rejetee: ${(body.comment ?? '').trim()}`,
      snapshot: updated.data as ChecklistData,
    })

    return res.json(mapChecklist(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

