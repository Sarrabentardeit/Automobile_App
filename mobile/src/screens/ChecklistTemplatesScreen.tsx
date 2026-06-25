import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AppToast from '../components/ui/AppToast'
import {
  fetchAdminTemplates,
  resetAdminTemplate,
  saveAdminTemplates,
} from '../lib/checklistApi'
import { mapRole } from '../types/permissions'
import { theme } from '../theme/appTheme'
import type {
  ChecklistItem,
  ChecklistRole,
  ChecklistSection,
  DailyChecklistData,
} from '../types/checklist'

const ROLES: { id: ChecklistRole; label: string }[] = [
  { id: 'chef_atelier', label: 'Chef atelier' },
  { id: 'coordinateur', label: 'Coordinateur' },
  { id: 'technicien', label: 'Technicien' },
]

function newItem(sectionId: string): ChecklistItem {
  return {
    id: `${sectionId}-i-${Date.now()}`,
    label: '',
    status: 'todo',
    comment: '',
  }
}

function newSection(): ChecklistSection {
  const id = `sec-${Date.now()}`
  return { id, title: 'Nouvelle section', items: [newItem(id)] }
}

function cloneTemplates(
  d: Record<ChecklistRole, DailyChecklistData>
): Record<ChecklistRole, DailyChecklistData> {
  return JSON.parse(JSON.stringify(d)) as Record<ChecklistRole, DailyChecklistData>
}

type Props = {
  accessToken: string
  userRole: string
}

export default function ChecklistTemplatesScreen({ accessToken, userRole }: Props) {
  const isAdmin = mapRole(userRole) === 'admin'
  const [tab, setTab] = useState<ChecklistRole>('chef_atelier')
  const [templates, setTemplates] = useState<Record<ChecklistRole, DailyChecklistData> | null>(null)
  const [usingCustom, setUsingCustom] = useState<Record<ChecklistRole, boolean> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminTemplates(accessToken)
      setTemplates(cloneTemplates(data.effective))
      setUsingCustom(data.usingCustom)
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur chargement', true)
      setTemplates(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    if (isAdmin) void load()
    else setLoading(false)
  }, [isAdmin, load])

  const patchRole = (role: ChecklistRole, next: DailyChecklistData) => {
    setTemplates((prev) => (prev ? { ...prev, [role]: next } : prev))
  }

  const current = templates?.[tab]

  const save = async () => {
    if (!templates) return
    setSaving(true)
    try {
      const data = await saveAdminTemplates(accessToken, { [tab]: templates[tab] })
      setTemplates(cloneTemplates(data.effective))
      setUsingCustom(data.usingCustom)
      showMsg('Modèle enregistré')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur enregistrement', true)
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const data = await resetAdminTemplate(accessToken, tab)
      setTemplates(cloneTemplates(data.effective))
      setUsingCustom(data.usingCustom)
      showMsg('Modèle réinitialisé')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur réinitialisation', true)
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <View style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
        <Text style={styles.deniedTitle}>Accès réservé admin</Text>
      </View>
    )
  }

  if (loading || !current) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="options" size={22} color={theme.primary} />
          <Text style={styles.heroTitle}>Modèles checklists</Text>
          {usingCustom?.[tab] ? (
            <View style={styles.customPill}>
              <Text style={styles.customPillText}>Personnalisé</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tabRow}>
          {ROLES.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setTab(r.id)}
              style={[styles.tab, tab === r.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === r.id && styles.tabTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        {current.sections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <TextInput
              style={styles.sectionTitle}
              value={section.title}
              onChangeText={(title) =>
                patchRole(tab, {
                  ...current,
                  sections: current.sections.map((s) =>
                    s.id === section.id ? { ...s, title } : s
                  ),
                })
              }
            />
            {section.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <TextInput
                  style={styles.itemInput}
                  value={item.label}
                  onChangeText={(label) =>
                    patchRole(tab, {
                      ...current,
                      sections: current.sections.map((s) =>
                        s.id !== section.id
                          ? s
                          : {
                              ...s,
                              items: s.items.map((it) =>
                                it.id === item.id ? { ...it, label } : it
                              ),
                            }
                      ),
                    })
                  }
                  placeholder="Libellé de la tâche"
                />
                {section.items.length > 1 ? (
                  <Pressable
                    onPress={() =>
                      patchRole(tab, {
                        ...current,
                        sections: current.sections.map((s) =>
                          s.id !== section.id
                            ? s
                            : { ...s, items: s.items.filter((it) => it.id !== item.id) }
                        ),
                      })
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable
              style={styles.addItemBtn}
              onPress={() =>
                patchRole(tab, {
                  ...current,
                  sections: current.sections.map((s) =>
                    s.id !== section.id
                      ? s
                      : { ...s, items: [...s.items, newItem(section.id)] }
                  ),
                })
              }
            >
              <Ionicons name="add" size={16} color={theme.primary} />
              <Text style={styles.addItemText}>Ajouter une tâche</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          style={styles.addSectionBtn}
          onPress={() =>
            patchRole(tab, { ...current, sections: [...current.sections, newSection()] })
          }
        >
          <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
          <Text style={styles.addSectionText}>Ajouter une section</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable style={styles.resetBtn} onPress={() => void reset()} disabled={saving}>
            <Text style={styles.resetText}>Réinitialiser</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={() => void save()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  deniedTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  heroTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.text },
  customPill: {
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  customPillText: { fontSize: 11, fontWeight: '700', color: theme.primaryDark },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.primarySoft, borderColor: '#fed7aa' },
  tabText: { fontSize: 11, fontWeight: '700', color: theme.textMuted },
  tabTextActive: { color: theme.primaryDark },
  sectionCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    paddingBottom: 8,
    marginBottom: 10,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addItemText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addSectionText: { fontSize: 14, fontWeight: '700', color: theme.primary },
  footer: { flexDirection: 'row', gap: 10 },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  resetText: { fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  saveText: { fontWeight: '800', color: '#fff' },
})
