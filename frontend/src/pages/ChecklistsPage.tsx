import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch } from '@/lib/api'
import type { ChecklistAuditLog, ChecklistItemStatus, ChecklistMonthlyKpi, ChecklistWorkflowStatus, DailyChecklist } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { ClipboardList, CheckCircle2, AlertTriangle, Send, Save, Eye, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_LABELS = {
  technicien: 'Technicien',
  coordinateur: 'Coordinateur',
  chef_atelier: 'Chef atelier',
}

const WORKFLOW_BADGES: Record<ChecklistWorkflowStatus, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  submitted: { label: 'Soumise', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  validated: { label: 'Validée', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'À corriger', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function completion(checklist: DailyChecklist | null): { done: number; total: number } {
  if (!checklist) return { done: 0, total: 0 }
  let total = 0
  let done = 0
  checklist.data.sections.forEach(section => {
    section.items.forEach(item => {
      total += 1
      if (item.status === 'done' || item.status === 'na') done += 1
    })
  })
  return { done, total }
}

export default function ChecklistsPage() {
  const navigate = useNavigate()
  const { user, getAccessToken } = useAuth()
  const toast = useToast()
  const [date, setDate] = useState(todayDate())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [pendingReview, setPendingReview] = useState<DailyChecklist[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<DailyChecklist | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<ChecklistAuditLog[]>([])
  const [kpi, setKpi] = useState<ChecklistMonthlyKpi | null>(null)
  const [reviewAction, setReviewAction] = useState<'validate' | 'reject' | null>(null)
  const [reviewTargetId, setReviewTargetId] = useState<number | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const canReview = user?.role === 'admin' || user?.role === 'responsable'
  const readOnly = checklist?.status === 'submitted' || checklist?.status === 'validated'
  const { done, total } = completion(checklist)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const roleLabel = useMemo(() => {
    if (!checklist) return ''
    return ROLE_LABELS[checklist.role as keyof typeof ROLE_LABELS] ?? checklist.role
  }, [checklist])

  const loadChecklist = async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await apiFetch<DailyChecklist>('/checklists/me/today', {
        token,
        params: { date },
      })
      setChecklist(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement checklist')
      setChecklist(null)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingReview = async () => {
    if (!canReview) return
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await apiFetch<DailyChecklist[]>('/checklists/pending/review', { token })
      setPendingReview(Array.isArray(list) ? list : [])
    } catch {
      setPendingReview([])
    }
  }

  const loadKpi = async () => {
    const token = getAccessToken()
    if (!token) return
    const [y, m] = date.split('-').map(Number)
    try {
      const data = await apiFetch<ChecklistMonthlyKpi>('/checklists/kpi/monthly', {
        token,
        params: { year: y, month: m },
      })
      setKpi(data)
    } catch {
      setKpi(null)
    }
  }

  const openChecklistDetail = async (id: number) => {
    const token = getAccessToken()
    if (!token) return
    try {
      const full = await apiFetch<DailyChecklist>(`/checklists/item/${id}`, { token })
      setSelectedChecklist(full)
      const logs = await apiFetch<ChecklistAuditLog[]>(`/checklists/audit/${id}`, { token })
      setSelectedAudit(Array.isArray(logs) ? logs : [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’ouvrir la checklist')
    }
  }

  useEffect(() => {
    void loadChecklist()
    void loadPendingReview()
    void loadKpi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, canReview])

  const updateItem = (sectionId: string, itemId: string, patch: Partial<{ status: ChecklistItemStatus; comment: string }>) => {
    setChecklist(prev => {
      if (!prev) return prev
      return {
        ...prev,
        data: {
          ...prev.data,
          sections: prev.data.sections.map(section =>
            section.id !== sectionId
              ? section
              : {
                  ...section,
                  items: section.items.map(item => (item.id !== itemId ? item : { ...item, ...patch })),
                },
          ),
        },
      }
    })
  }

  const saveDraft = async () => {
    if (!checklist) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    try {
      const updated = await apiFetch<DailyChecklist>(`/checklists/${checklist.id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ data: checklist.data }),
      })
      setChecklist(updated)
      toast.success('Checklist enregistrée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const submitChecklist = async () => {
    if (!checklist) return
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    try {
      const updated = await apiFetch<DailyChecklist>(`/checklists/${checklist.id}/submit`, {
        method: 'POST',
        token,
      })
      setChecklist(updated)
      toast.success('Checklist soumise pour validation')
      void loadPendingReview()
      void loadKpi()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur soumission')
    } finally {
      setSaving(false)
    }
  }

  const openReviewModal = (id: number, action: 'validate' | 'reject') => {
    setReviewTargetId(id)
    setReviewAction(action)
    setReviewComment('')
  }

  const closeReviewModal = () => {
    if (reviewSubmitting) return
    setReviewTargetId(null)
    setReviewAction(null)
    setReviewComment('')
  }

  const reviewChecklist = async () => {
    if (!reviewTargetId || !reviewAction) return
    const token = getAccessToken()
    if (!token) return
    const comment = reviewComment.trim()
    if (reviewAction === 'reject' && !comment) {
      toast.error('Le motif est obligatoire pour rejeter la checklist')
      return
    }
    try {
      setReviewSubmitting(true)
      await apiFetch<DailyChecklist>(`/checklists/${reviewTargetId}/review`, {
        method: 'POST',
        token,
        body: JSON.stringify({ action: reviewAction, comment }),
      })
      toast.success(reviewAction === 'validate' ? 'Checklist validée' : 'Checklist rejetée')
      closeReviewModal()
      void loadPendingReview()
      void loadKpi()
      if (checklist?.id === reviewTargetId) void loadChecklist()
      if (selectedChecklist?.id === reviewTargetId) {
        const refreshed = await apiFetch<DailyChecklist>(`/checklists/item/${reviewTargetId}`, { token })
        setSelectedChecklist(refreshed)
        const logs = await apiFetch<ChecklistAuditLog[]>(`/checklists/audit/${reviewTargetId}`, { token })
        setSelectedAudit(Array.isArray(logs) ? logs : [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur traitement checklist')
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-orange-500" />
            Checklist journalière
          </h1>
          <p className="text-sm text-gray-500 mt-1">Chaque membre remplit sa checklist quotidienne puis la soumet.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Date:</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <Card padding="sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Résumé historique rapide</p>
            <p className="text-xs text-gray-500">Vue légère sur la période mensuelle actuelle.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/checklists/history')} icon={<History className="w-4 h-4" />}>
            Voir tout l’historique
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
          {[
            ['Total checklists', kpi?.totalChecklists ?? 0],
            ['Retards', kpi?.lateSubmissions ?? 0],
            ['Non-conformités', kpi?.nonConformities ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <p className="text-[11px] text-gray-500">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card padding="md">
          <p className="text-gray-500">Chargement...</p>
        </Card>
      ) : !checklist ? (
        <Card padding="md">
          <p className="text-red-600">Checklist introuvable.</p>
        </Card>
      ) : (
        <>
          <Card padding="sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{roleLabel}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', WORKFLOW_BADGES[checklist.status].cls)}>
                  {WORKFLOW_BADGES[checklist.status].label}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                Progression: <span className="font-semibold">{done}/{total}</span> ({percent}%)
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-orange-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
            {checklist.status === 'rejected' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <p className="text-xs">
                  Rejetée par {checklist.validatorName || 'validateur'}: {checklist.validatorComment || 'Aucun commentaire.'}
                </p>
              </div>
            )}
            {checklist.status === 'validated' && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <p className="text-xs">Checklist validée. Modification verrouillée.</p>
              </div>
            )}
          </Card>

          <div className="space-y-3">
            {checklist.data.sections.map(section => (
              <Card key={section.id} padding="sm">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">{section.title}</h2>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                      <p className="text-sm text-gray-800">{item.label}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {([
                          ['todo', 'Non fait', 'bg-gray-100 text-gray-700 border-gray-200'],
                          ['done', 'Fait', 'bg-emerald-100 text-emerald-700 border-emerald-200'],
                          ['na', 'N/A', 'bg-blue-100 text-blue-700 border-blue-200'],
                        ] as const).map(([status, label, cls]) => (
                          <button
                            key={status}
                            type="button"
                            disabled={readOnly}
                            onClick={() => updateItem(section.id, item.id, { status })}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs border font-medium transition-colors',
                              item.status === status ? cls : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50',
                              readOnly && 'opacity-60 cursor-not-allowed',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={item.comment}
                        disabled={readOnly}
                        onChange={e => updateItem(section.id, item.id, { comment: e.target.value })}
                        placeholder="Commentaire (optionnel)"
                        className="mt-2 w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-xs focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveDraft} disabled={saving || readOnly} icon={<Save className="w-4 h-4" />}>
              Enregistrer brouillon
            </Button>
            <Button
              onClick={submitChecklist}
              disabled={saving || readOnly || checklist.status === 'submitted'}
              icon={<Send className="w-4 h-4" />}
              variant="outline"
            >
              Soumettre
            </Button>
          </div>

          {canReview && (
            <Card padding="sm">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Validation manager (toutes soumissions en attente)</h2>
              {pendingReview.length === 0 ? (
                <p className="text-xs text-gray-500">Aucune checklist soumise en attente.</p>
              ) : (
                <div className="space-y-2">
                  {pendingReview.map(entry => {
                    const prog = completion(entry)
                    return (
                      <div key={entry.id} className="rounded-lg border border-gray-100 p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{entry.userName || `User #${entry.userId}`}</p>
                            <p className="text-xs text-gray-500">
                              {ROLE_LABELS[entry.role as keyof typeof ROLE_LABELS] ?? entry.role} - {entry.date} - {prog.done}/{prog.total}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => void openChecklistDetail(entry.id)} icon={<Eye className="w-4 h-4" />}>
                            Voir réponses
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <Modal
        open={!!selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        title={selectedChecklist ? `Checklist - ${selectedChecklist.userName || `User #${selectedChecklist.userId}`}` : 'Détail checklist'}
        subtitle={selectedChecklist ? `${selectedChecklist.date} - ${ROLE_LABELS[selectedChecklist.role as keyof typeof ROLE_LABELS] ?? selectedChecklist.role}` : undefined}
        maxWidth="xl"
      >
        {selectedChecklist && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', WORKFLOW_BADGES[selectedChecklist.status].cls)}>
                {WORKFLOW_BADGES[selectedChecklist.status].label}
              </span>
              <span className="text-xs text-gray-500">
                Progression: {completion(selectedChecklist).done}/{completion(selectedChecklist).total}
              </span>
            </div>

            {selectedChecklist.data.sections.map(section => (
              <Card key={section.id} padding="sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div key={item.id} className="rounded-lg border border-gray-100 p-2">
                      <p className="text-sm text-gray-800">{item.label}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full border font-medium',
                            item.status === 'done'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : item.status === 'na'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200',
                          )}
                        >
                          {item.status === 'done' ? 'Fait' : item.status === 'na' ? 'N/A' : 'Non fait'}
                        </span>
                        {item.comment && <span className="text-xs text-gray-600">{item.comment}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            <Card padding="sm">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Journal d'audit</h3>
              {selectedAudit.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun log.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedAudit.map(log => (
                    <div key={log.id} className="rounded-lg border border-gray-100 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-gray-800">{log.action}</span>
                        <span className="text-[11px] text-gray-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{log.summary}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {log.actorName || 'Système'} {log.actorRole ? `(${log.actorRole})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {selectedChecklist.status === 'submitted' && canReview && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={() => openReviewModal(selectedChecklist.id, 'validate')}>
                  Valider cette checklist
                </Button>
                <Button size="sm" variant="outline" onClick={() => openReviewModal(selectedChecklist.id, 'reject')}>
                  Rejeter avec motif
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!reviewAction && !!reviewTargetId}
        onClose={closeReviewModal}
        title={reviewAction === 'reject' ? 'Rejeter la checklist' : 'Valider la checklist'}
        subtitle={
          reviewAction === 'reject'
            ? 'Le motif sera visible par l’utilisateur.'
            : 'Commentaire optionnel visible dans l’historique.'
        }
      >
        <div className="space-y-3">
          <textarea
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            rows={4}
            placeholder={reviewAction === 'reject' ? 'Motif du rejet (obligatoire)' : 'Commentaire de validation (optionnel)'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
          />
          {reviewAction === 'reject' && (
            <p className="text-xs text-amber-700">Pour rejet, le commentaire est obligatoire.</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={closeReviewModal} disabled={reviewSubmitting}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => void reviewChecklist()} disabled={reviewSubmitting}>
              {reviewAction === 'reject' ? 'Confirmer rejet' : 'Confirmer validation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
