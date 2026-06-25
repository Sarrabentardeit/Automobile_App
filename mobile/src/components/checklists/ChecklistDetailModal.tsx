import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import ChecklistSectionCard from './ChecklistSectionCard'
import ChecklistWorkflowBadge from './ChecklistWorkflowBadge'
import { fetchChecklistAudit, fetchChecklistItem } from '../../lib/checklistApi'
import {
  CHECKLIST_ROLE_LABELS,
  completion,
  formatDateFr,
} from '../../lib/checklistHelpers'
import { theme } from '../../theme/appTheme'
import type { ChecklistAuditLog, DailyChecklist } from '../../types/checklist'

type Props = {
  visible: boolean
  checklistId: number | null
  accessToken: string
  canReview?: boolean
  onClose: () => void
  onValidate?: (id: number) => void
  onReject?: (id: number) => void
}

export default function ChecklistDetailModal({
  visible,
  checklistId,
  accessToken,
  canReview = false,
  onClose,
  onValidate,
  onReject,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null)
  const [audit, setAudit] = useState<ChecklistAuditLog[]>([])
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.9, 640)

  useEffect(() => {
    if (!visible || !checklistId) {
      setChecklist(null)
      setAudit([])
      return
    }
    setLoading(true)
    void Promise.all([
      fetchChecklistItem(accessToken, checklistId),
      fetchChecklistAudit(accessToken, checklistId),
    ])
      .then(([cl, logs]) => {
        setChecklist(cl)
        setAudit(Array.isArray(logs) ? logs : [])
      })
      .catch(() => {
        setChecklist(null)
        setAudit([])
      })
      .finally(() => setLoading(false))
  }, [visible, checklistId, accessToken])

  const prog = completion(checklist)

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {checklist?.userName ?? 'Checklist'}
            </Text>
            {checklist ? (
              <Text style={styles.sub}>
                {formatDateFr(checklist.date)} ·{' '}
                {CHECKLIST_ROLE_LABELS[checklist.role] ?? checklist.role}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !checklist ? (
          <View style={styles.loading}>
            <Text style={styles.error}>Impossible de charger la checklist</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
              <View style={styles.metaRow}>
                <ChecklistWorkflowBadge status={checklist.status} />
                <Text style={styles.prog}>
                  {prog.done}/{prog.total} ({prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0}%)
                </Text>
              </View>

              {checklist.data.sections.map((section) => (
                <ChecklistSectionCard
                  key={section.id}
                  section={section}
                  readOnly
                  onItemChange={() => {}}
                />
              ))}

              <Text style={styles.auditTitle}>Journal d&apos;audit</Text>
              {audit.length === 0 ? (
                <Text style={styles.auditEmpty}>Aucun log</Text>
              ) : (
                audit.map((log) => (
                  <View key={log.id} style={styles.auditRow}>
                    <View style={styles.auditTop}>
                      <Text style={styles.auditAction}>{log.action}</Text>
                      <Text style={styles.auditDate}>
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </Text>
                    </View>
                    <Text style={styles.auditSummary}>{log.summary}</Text>
                    <Text style={styles.auditActor}>
                      {log.actorName || 'Système'}
                      {log.actorRole ? ` (${log.actorRole})` : ''}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {checklist.status === 'submitted' && canReview ? (
              <View style={styles.footer}>
                <Pressable
                  style={[styles.btn, styles.btnValidate]}
                  onPress={() => onValidate?.(checklist.id)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.btnValidateText}>Valider</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => onReject?.(checklist.id)}
                >
                  <Ionicons name="close-circle" size={20} color={theme.danger} />
                  <Text style={styles.btnRejectText}>Rejeter</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 16,
  },
  accent: { height: 3, backgroundColor: theme.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  loading: { padding: 40, alignItems: 'center' },
  error: { color: theme.danger, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  prog: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  auditTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  auditEmpty: { fontSize: 13, color: theme.textMuted, marginBottom: 8 },
  auditRow: {
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginBottom: 8,
    backgroundColor: theme.bg,
  },
  auditTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  auditAction: { fontSize: 12, fontWeight: '700', color: theme.text },
  auditDate: { fontSize: 10, color: theme.textSubtle },
  auditSummary: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  auditActor: { fontSize: 10, color: theme.textSubtle, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
  },
  btnValidate: { backgroundColor: theme.primary },
  btnValidateText: { color: '#fff', fontWeight: '800' },
  btnReject: {
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  btnRejectText: { color: theme.danger, fontWeight: '700' },
})
