import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ChecklistDetailModal from '../components/checklists/ChecklistDetailModal'
import ChecklistReviewModal from '../components/checklists/ChecklistReviewModal'
import ChecklistSectionCard from '../components/checklists/ChecklistSectionCard'
import ChecklistWorkflowBadge from '../components/checklists/ChecklistWorkflowBadge'
import ChecklistsSkeleton from '../components/checklists/ChecklistsSkeleton'
import AppToast from '../components/ui/AppToast'
import {
  fetchMonthlyKpi,
  fetchMyHistory,
  fetchPendingReview,
  fetchTodayChecklist,
  reviewChecklist,
  saveChecklistDraft,
  submitChecklist,
} from '../lib/checklistApi'
import {
  CHECKLIST_ROLE_LABELS,
  completion,
  formatDateFr,
  isChecklistReadOnly,
  monthBounds,
  shiftDate,
  todayDate,
} from '../lib/checklistHelpers'
import { mapRole } from '../types/permissions'
import { theme } from '../theme/appTheme'
import type {
  ChecklistItemStatus,
  ChecklistMonthlyKpi,
  DailyChecklist,
} from '../types/checklist'

type Tab = 'today' | 'history' | 'review'

type Props = {
  accessToken: string
  userRole: string
  drawerOpen?: boolean
}

export default function ChecklistsScreen({
  accessToken,
  userRole,
  drawerOpen = false,
}: Props) {
  const role = mapRole(userRole)
  const canReview = role === 'admin' || role === 'responsable'

  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayDate())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [kpi, setKpi] = useState<ChecklistMonthlyKpi | null>(null)
  const [history, setHistory] = useState<DailyChecklist[]>([])
  const [pending, setPending] = useState<DailyChecklist[]>([])
  const [detailId, setDetailId] = useState<number | null>(null)
  const [reviewTargetId, setReviewTargetId] = useState<number | null>(null)
  const [reviewAction, setReviewAction] = useState<'validate' | 'reject' | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const readOnly = checklist ? isChecklistReadOnly(checklist.status) : true
  const prog = completion(checklist)
  const percent = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0
  const { from, to } = monthBounds(date)

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const loadToday = useCallback(async () => {
    try {
      const data = await fetchTodayChecklist(accessToken, date)
      setChecklist(data)
    } catch (e) {
      setChecklist(null)
      showMsg(e instanceof Error ? e.message : 'Erreur chargement', true)
    }
  }, [accessToken, date])

  const loadKpi = useCallback(async () => {
    const [y, m] = date.split('-').map(Number)
    try {
      setKpi(await fetchMonthlyKpi(accessToken, y, m))
    } catch {
      setKpi(null)
    }
  }, [accessToken, date])

  const loadHistory = useCallback(async () => {
    try {
      const list = await fetchMyHistory(accessToken, { from, to, limit: 200 })
      setHistory(list)
    } catch {
      setHistory([])
    }
  }, [accessToken, from, to])

  const loadPending = useCallback(async () => {
    if (!canReview) return
    try {
      setPending(await fetchPendingReview(accessToken))
    } catch {
      setPending([])
    }
  }, [accessToken, canReview])

  const loadAll = useCallback(async () => {
    await Promise.all([loadToday(), loadKpi(), loadHistory(), loadPending()])
  }, [loadToday, loadKpi, loadHistory, loadPending])

  useEffect(() => {
    setLoading(true)
    void loadAll().finally(() => setLoading(false))
  }, [loadAll])

  const updateItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<{ status: ChecklistItemStatus; comment: string }>
  ) => {
    setChecklist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        data: {
          ...prev.data,
          sections: prev.data.sections.map((section) =>
            section.id !== sectionId
              ? section
              : {
                  ...section,
                  items: section.items.map((item) =>
                    item.id !== itemId ? item : { ...item, ...patch }
                  ),
                }
          ),
        },
      }
    })
  }

  const saveDraft = async () => {
    if (!checklist || readOnly) return
    setSaving(true)
    try {
      const updated = await saveChecklistDraft(accessToken, checklist.id, checklist.data)
      setChecklist(updated)
      showMsg('Checklist enregistrée')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur enregistrement', true)
    } finally {
      setSaving(false)
    }
  }

  const doSubmit = async () => {
    if (!checklist || readOnly) return
    setSaving(true)
    try {
      const updated = await submitChecklist(accessToken, checklist.id)
      setChecklist(updated)
      showMsg('Checklist soumise pour validation')
      void loadPending()
      void loadKpi()
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur soumission', true)
    } finally {
      setSaving(false)
    }
  }

  const openReview = (id: number, action: 'validate' | 'reject') => {
    setReviewTargetId(id)
    setReviewAction(action)
    setReviewComment('')
  }

  const closeReview = () => {
    if (reviewSaving) return
    setReviewTargetId(null)
    setReviewAction(null)
    setReviewComment('')
  }

  const confirmReview = async () => {
    if (!reviewTargetId || !reviewAction) return
    if (reviewAction === 'reject' && !reviewComment.trim()) {
      showMsg('Motif obligatoire pour rejeter', true)
      return
    }
    setReviewSaving(true)
    try {
      await reviewChecklist(
        accessToken,
        reviewTargetId,
        reviewAction,
        reviewComment.trim() || undefined
      )
      showMsg(reviewAction === 'validate' ? 'Checklist validée' : 'Checklist rejetée')
      closeReview()
      setDetailId(null)
      void loadAll()
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur traitement', true)
    } finally {
      setReviewSaving(false)
    }
  }

  const tabs = useMemo(() => {
    const list: { id: Tab; label: string; badge?: number }[] = [
      { id: 'today', label: 'Aujourd\'hui' },
      { id: 'history', label: 'Historique' },
    ]
    if (canReview) {
      list.push({ id: 'review', label: 'Validation', badge: pending.length || undefined })
    }
    return list
  }, [canReview, pending.length])

  const reviewModalOpen = !!reviewAction && !!reviewTargetId

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="checkbox" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Checklist journalière</Text>
            <Text style={styles.heroSub}>Remplir, enregistrer et soumettre</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
              {t.badge ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{t.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'today' ? (
        <>
          <View style={styles.dateRow}>
            <Pressable style={styles.dateBtn} onPress={() => setDate((d) => shiftDate(d, -1))}>
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
            <Pressable style={styles.dateCenter} onPress={() => setDate(todayDate())}>
              <Text style={styles.dateText}>{formatDateFr(date)}</Text>
              {date !== todayDate() ? (
                <Text style={styles.dateTodayHint}>Revenir à aujourd&apos;hui</Text>
              ) : null}
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => setDate((d) => shiftDate(d, 1))}>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.kpiRow}>
            {[
              ['Total', kpi?.totalChecklists ?? 0],
              ['Retards', kpi?.lateSubmissions ?? 0],
              ['Non-conf.', kpi?.nonConformities ?? 0],
            ].map(([label, value]) => (
              <View key={label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{label}</Text>
                <Text style={styles.kpiValue}>{value}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  )

  const todayBody = () => {
    if (loading && !checklist) return <ChecklistsSkeleton />
    if (!checklist) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Checklist introuvable</Text>
        </View>
      )
    }

    return (
      <>
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.roleLabel}>
              {CHECKLIST_ROLE_LABELS[checklist.role] ?? checklist.role}
            </Text>
            <ChecklistWorkflowBadge status={checklist.status} />
          </View>
          <Text style={styles.progressLabel}>
            Progression {prog.done}/{prog.total} ({percent}%)
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          {checklist.status === 'rejected' ? (
            <View style={styles.alertReject}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text style={styles.alertRejectText}>
                Rejetée par {checklist.validatorName || 'validateur'} :{' '}
                {checklist.validatorComment || 'Aucun commentaire.'}
              </Text>
            </View>
          ) : null}
          {checklist.status === 'validated' ? (
            <View style={styles.alertOk}>
              <Ionicons name="checkmark-circle" size={16} color="#047857" />
              <Text style={styles.alertOkText}>Checklist validée — modification verrouillée.</Text>
            </View>
          ) : null}
        </View>

        {checklist.data.sections.map((section) => (
          <ChecklistSectionCard
            key={section.id}
            section={section}
            readOnly={readOnly}
            onItemChange={(itemId, patch) => updateItem(section.id, itemId, patch)}
          />
        ))}

        {!readOnly ? (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={() => void saveDraft()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color={theme.primary} />
                  <Text style={styles.saveText}>Enregistrer</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.submitBtn, saving && styles.btnDisabled]}
              onPress={() => void doSubmit()}
              disabled={saving || checklist.status === 'submitted'}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitText}>Soumettre</Text>
            </Pressable>
          </View>
        ) : null}
      </>
    )
  }

  const historyBody = () => (
    <View style={styles.listBlock}>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>Aucune checklist sur cette période</Text>
      ) : (
        history.map((entry) => {
          const p = completion(entry)
          return (
            <Pressable
              key={entry.id}
              style={styles.historyRow}
              onPress={() => setDetailId(entry.id)}
            >
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{formatDateFr(entry.date)}</Text>
                <Text style={styles.historySub}>
                  {p.done}/{p.total} · {CHECKLIST_ROLE_LABELS[entry.role] ?? entry.role}
                </Text>
              </View>
              <ChecklistWorkflowBadge status={entry.status} />
            </Pressable>
          )
        })
      )}
    </View>
  )

  const reviewBody = () => (
    <View style={styles.listBlock}>
      {pending.length === 0 ? (
        <Text style={styles.emptyText}>Aucune checklist en attente</Text>
      ) : (
        pending.map((entry) => {
          const p = completion(entry)
          return (
            <Pressable
              key={entry.id}
              style={styles.historyRow}
              onPress={() => setDetailId(entry.id)}
            >
              <View style={styles.historyLeft}>
                <Text style={styles.historyName}>{entry.userName}</Text>
                <Text style={styles.historySub}>
                  {formatDateFr(entry.date)} · {p.done}/{p.total}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
            </Pressable>
          )
        })
      )}
    </View>
  )

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadAll().finally(() => setRefreshing(false))
            }}
            tintColor={theme.primary}
          />
        }
      >
        {header}
        {tab === 'today' ? todayBody() : null}
        {tab === 'history' ? historyBody() : null}
        {tab === 'review' ? reviewBody() : null}
        <View style={styles.footerSpacer} />
      </ScrollView>

      <ChecklistDetailModal
        visible={!!detailId && !reviewModalOpen}
        checklistId={detailId}
        accessToken={accessToken}
        canReview={canReview}
        onClose={() => setDetailId(null)}
        onValidate={(id) => openReview(id, 'validate')}
        onReject={(id) => openReview(id, 'reject')}
      />

      <ChecklistReviewModal
        visible={!!reviewAction && !!reviewTargetId}
        action={reviewAction}
        comment={reviewComment}
        saving={reviewSaving}
        onCommentChange={setReviewComment}
        onClose={closeReview}
        onConfirm={() => void confirmReview()}
      />

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  headerWrap: { marginBottom: 12 },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  heroSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabActive: { backgroundColor: theme.primarySoft, borderColor: '#fed7aa' },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  tabTextActive: { color: theme.primaryDark },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  dateText: { fontSize: 15, fontWeight: '800', color: theme.text },
  dateTodayHint: { fontSize: 10, color: theme.primary, marginTop: 2, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 10,
    alignItems: 'center',
  },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted },
  kpiValue: { fontSize: 16, fontWeight: '800', color: theme.text, marginTop: 2 },
  progressCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.sm,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roleLabel: { fontSize: 14, fontWeight: '800', color: theme.text },
  progressLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.bg,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', backgroundColor: theme.primary },
  alertReject: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertRejectText: { flex: 1, fontSize: 12, color: '#b45309', lineHeight: 18 },
  alertOk: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  alertOkText: { fontSize: 12, color: '#047857', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  saveText: { fontWeight: '700', color: theme.primaryDark },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  submitText: { fontWeight: '800', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
  listBlock: { gap: 8 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
    ...theme.shadow.sm,
  },
  historyLeft: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: '800', color: theme.text },
  historyDate: { fontSize: 15, fontWeight: '700', color: theme.text },
  historySub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  footerSpacer: { height: 16 },
})
