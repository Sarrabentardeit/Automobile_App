import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch, getApiUrl } from '@/lib/api'
import type {
  ChecklistAuditLog,
  ChecklistHistoryEntry,
  ChecklistHistorySummaryRow,
  ChecklistWorkflowStatus,
  DailyChecklist,
} from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { ArrowLeft, Download, Eye, History } from 'lucide-react'
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

function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = date.split('-').map(Number)
  const year = Number.isFinite(y) ? y : new Date().getFullYear()
  const month = Number.isFinite(m) ? m : new Date().getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function completion(checklist: DailyChecklist): { done: number; total: number } {
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

export default function ChecklistsHistoryPage() {
  const navigate = useNavigate()
  const { user, getAccessToken } = useAuth()
  const toast = useToast()
  const [date] = useState(todayDate())
  const [myHistory, setMyHistory] = useState<DailyChecklist[]>([])
  const [reviewHistory, setReviewHistory] = useState<ChecklistHistoryEntry[]>([])
  const [reviewSummary, setReviewSummary] = useState<ChecklistHistorySummaryRow[]>([])
  const [selectedChecklist, setSelectedChecklist] = useState<DailyChecklist | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<ChecklistAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [rangeFrom, setRangeFrom] = useState(() => monthBounds(todayDate()).from)
  const [rangeTo, setRangeTo] = useState(() => monthBounds(todayDate()).to)
  const [reviewStatus, setReviewStatus] = useState<'all' | 'validated' | 'rejected'>('all')
  const [reviewSortBy, setReviewSortBy] = useState<'date' | 'nonConformities' | 'late' | 'user' | 'status'>('date')
  const [reviewSortDir, setReviewSortDir] = useState<'asc' | 'desc'>('desc')
  const [reviewQuery, setReviewQuery] = useState('')

  const canReview = user?.role === 'admin' || user?.role === 'responsable'

  const reviewQuickStats = useMemo(() => {
    let late = 0
    let nonConform = 0
    let rejected = 0
    reviewHistory.forEach(entry => {
      if (entry.lateSubmission) late += 1
      nonConform += entry.metrics.nonConformities
      if (entry.status === 'rejected') rejected += 1
    })
    return { total: reviewHistory.length, late, nonConform, rejected }
  }, [reviewHistory])

  const loadMyHistory = async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await apiFetch<DailyChecklist[]>('/checklists/me/history', {
        token,
        params: { limit: 60 },
      })
      setMyHistory(Array.isArray(list) ? list : [])
    } catch {
      setMyHistory([])
    }
  }

  const loadReviewHistory = async () => {
    if (!canReview) return
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await apiFetch<ChecklistHistoryEntry[]>('/checklists/review/history', {
        token,
        params: {
          from: rangeFrom,
          to: rangeTo,
          status: reviewStatus === 'all' ? '' : reviewStatus,
          q: reviewQuery.trim(),
          sortBy: reviewSortBy,
          sortDir: reviewSortDir,
          limit: 120,
        },
      })
      setReviewHistory(Array.isArray(list) ? list : [])
    } catch {
      setReviewHistory([])
    }
  }

  const loadReviewSummary = async () => {
    if (!canReview) return
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await apiFetch<ChecklistHistorySummaryRow[]>('/checklists/review/summary', {
        token,
        params: { from: rangeFrom, to: rangeTo },
      })
      setReviewSummary(Array.isArray(list) ? list : [])
    } catch {
      setReviewSummary([])
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
    void (async () => {
      setLoading(true)
      try {
        await Promise.all([loadMyHistory(), loadReviewHistory(), loadReviewSummary()])
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReview, rangeFrom, rangeTo, reviewStatus, reviewSortBy, reviewSortDir, reviewQuery])

  useEffect(() => {
    const b = monthBounds(date)
    setRangeFrom(b.from)
    setRangeTo(b.to)
  }, [date])

  const exportCsv = async () => {
    const token = getAccessToken()
    if (!token) return
    setExporting(true)
    try {
      const url = getApiUrl('/checklists/export', { from: rangeFrom, to: rangeTo, format: 'csv' })
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `checklists-${rangeFrom}-${rangeTo}.csv`
      a.click()
      URL.revokeObjectURL(blobUrl)
      toast.success('Export CSV généré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur export CSV')
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = async () => {
    const token = getAccessToken()
    if (!token) return
    setExporting(true)
    try {
      const rows = await apiFetch<
        Array<DailyChecklist & { metrics: { done: number; todo: number; na: number; total: number; nonConformities: number }; lateSubmission: boolean }>
      >('/checklists/export', {
        token,
        params: { from: rangeFrom, to: rangeTo, format: 'json' },
      })

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
      const pageHeight = 210
      const margin = 10
      let y = 14

      const colHeaders = ['Date', 'Utilisateur', 'Role', 'Statut', 'Fait', 'Non fait', 'Retard']
      const colWidths = [28, 75, 34, 34, 24, 24, 24]
      const rowHeight = 7

      const drawHeader = () => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(`Rapport Checklists (${rangeFrom} -> ${rangeTo})`, margin, y)
        y += 6
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Genere le ${new Date().toLocaleString('fr-FR')}`, margin, y)
        y += 6

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        let x = margin
        colHeaders.forEach((h, i) => {
          doc.rect(x, y, colWidths[i], rowHeight)
          doc.text(h, x + 1.5, y + 4.8)
          x += colWidths[i]
        })
        y += rowHeight
        doc.setFont('helvetica', 'normal')
      }

      const fit = (value: string, maxChars: number) => (value.length <= maxChars ? value : `${value.slice(0, Math.max(0, maxChars - 1))}…`)

      drawHeader()
      rows.forEach(r => {
        if (y + rowHeight > pageHeight - margin) {
          doc.addPage()
          y = 14
          drawHeader()
        }

        const values = [
          r.date,
          fit(r.userName || '', 32),
          ROLE_LABELS[r.role as keyof typeof ROLE_LABELS] ?? r.role,
          WORKFLOW_BADGES[r.status].label,
          String(r.metrics.done),
          String(r.metrics.todo),
          r.lateSubmission ? 'Oui' : 'Non',
        ]

        let x = margin
        values.forEach((v, i) => {
          doc.rect(x, y, colWidths[i], rowHeight)
          doc.text(v, x + 1.5, y + 4.8)
          x += colWidths[i]
        })
        y += rowHeight
      })

      doc.save(`checklists-${rangeFrom}-${rangeTo}.pdf`)
      toast.success('Export PDF généré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur export PDF')
    } finally {
      setExporting(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-orange-500" />
            Historique checklists
          </h1>
          <p className="text-sm text-gray-500 mt-1">Vue complète: historique personnel, suivi manager, audits, exports.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/checklists')} icon={<ArrowLeft className="w-4 h-4" />}>
          Retour à checklist du jour
        </Button>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={rangeFrom}
            onChange={e => setRangeFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
          />
          <span className="text-xs text-gray-500">à</span>
          <input
            type="date"
            value={rangeTo}
            onChange={e => setRangeTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
          />
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={exporting} icon={<Download className="w-4 h-4" />}>
            Export Excel (CSV)
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={exporting} icon={<Download className="w-4 h-4" />}>
            Export PDF
          </Button>
        </div>
      </Card>

      <Card padding="sm">
        <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Mon historique récent</h2>
        {loading ? (
          <p className="text-xs text-gray-500">Chargement...</p>
        ) : myHistory.length === 0 ? (
          <p className="text-xs text-gray-500">Aucun historique.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {myHistory.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => void openChecklistDetail(entry.id)}
                className="w-full text-left rounded-lg border border-gray-100 hover:border-gray-200 p-2.5 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{entry.date}</p>
                  <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium', WORKFLOW_BADGES[entry.status].cls)}>
                    {WORKFLOW_BADGES[entry.status].label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ROLE_LABELS[entry.role as keyof typeof ROLE_LABELS] ?? entry.role} - {completion(entry).done}/{completion(entry).total}
                </p>
                {entry.validatorComment && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{entry.validatorComment}</p>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {canReview && (
        <>
          <Card padding="sm">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Historique validations avancé</h2>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 mb-3">
              <select
                value={reviewStatus}
                onChange={e => setReviewStatus(e.target.value as 'all' | 'validated' | 'rejected')}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
              >
                <option value="all">Tous statuts</option>
                <option value="validated">Validées</option>
                <option value="rejected">Rejetées</option>
              </select>
              <select
                value={reviewSortBy}
                onChange={e => setReviewSortBy(e.target.value as 'date' | 'nonConformities' | 'late' | 'user' | 'status')}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
              >
                <option value="date">Tri: date validation</option>
                <option value="nonConformities">Tri: non-conformités</option>
                <option value="late">Tri: retards</option>
                <option value="user">Tri: utilisateur</option>
                <option value="status">Tri: statut</option>
              </select>
              <select
                value={reviewSortDir}
                onChange={e => setReviewSortDir(e.target.value as 'asc' | 'desc')}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
              >
                <option value="desc">Descendant</option>
                <option value="asc">Ascendant</option>
              </select>
              <input
                type="text"
                value={reviewQuery}
                onChange={e => setReviewQuery(e.target.value)}
                placeholder="Recherche: nom, commentaire, contenu..."
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs lg:col-span-2"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                ['Lignes', reviewQuickStats.total],
                ['Retards', reviewQuickStats.late],
                ['Rejets', reviewQuickStats.rejected],
                ['Non-conformités', reviewQuickStats.nonConform],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                  <p className="text-[11px] text-gray-500">{label}</p>
                  <p className="text-sm font-bold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {reviewHistory.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune checklist validée/rejetée sur la période choisie.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {reviewHistory.map(entry => {
                  const badges = [
                    entry.lateSubmission ? 'Retard' : '',
                    entry.metrics.nonConformities > 0 ? `NC: ${entry.metrics.nonConformities}` : '',
                  ].filter(Boolean)
                  return (
                    <div key={entry.id} className="rounded-lg border border-gray-100 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{entry.userName || `User #${entry.userId}`}</p>
                          <p className="text-xs text-gray-500">
                            {ROLE_LABELS[entry.role as keyof typeof ROLE_LABELS] ?? entry.role} - validateur: {entry.validatorName || '—'} - {entry.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium', WORKFLOW_BADGES[entry.status].cls)}>
                            {WORKFLOW_BADGES[entry.status].label}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => void openChecklistDetail(entry.id)} icon={<Eye className="w-4 h-4" />}>
                            Détails
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {badges.map(b => (
                          <span
                            key={b}
                            className={cn(
                              'text-[11px] px-2 py-0.5 rounded-full border',
                              b === 'Retard' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200',
                            )}
                          >
                            {b}
                          </span>
                        ))}
                        <span className="text-[11px] text-gray-500">
                          Progression: {entry.metrics.done}/{entry.metrics.total}
                        </span>
                      </div>
                      {entry.validatorComment && <p className="mt-1 text-xs text-gray-600 line-clamp-2">{entry.validatorComment}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card padding="sm">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Performance par utilisateur</h2>
            {reviewSummary.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune donnée sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-1.5 pr-2">Utilisateur</th>
                      <th className="py-1.5 pr-2">Rôle</th>
                      <th className="py-1.5 pr-2">Total</th>
                      <th className="py-1.5 pr-2">Validées</th>
                      <th className="py-1.5 pr-2">Rejets</th>
                      <th className="py-1.5 pr-2">Retards</th>
                      <th className="py-1.5 pr-2">NC</th>
                      <th className="py-1.5 pr-2">Complétion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewSummary.map(row => (
                      <tr key={row.userId} className="border-b border-gray-50">
                        <td className="py-1.5 pr-2 font-medium text-gray-900">{row.userName || `User #${row.userId}`}</td>
                        <td className="py-1.5 pr-2 text-gray-600">{ROLE_LABELS[row.role as keyof typeof ROLE_LABELS] ?? row.role}</td>
                        <td className="py-1.5 pr-2 text-gray-700">{row.total}</td>
                        <td className="py-1.5 pr-2 text-emerald-700">{row.validated}</td>
                        <td className="py-1.5 pr-2 text-amber-700">{row.rejected}</td>
                        <td className="py-1.5 pr-2 text-orange-700">{row.lateSubmissions}</td>
                        <td className="py-1.5 pr-2 text-rose-700">{row.nonConformities}</td>
                        <td className="py-1.5 pr-2 text-gray-700">{row.avgCompletionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
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
          </div>
        )}
      </Modal>
    </div>
  )
}
