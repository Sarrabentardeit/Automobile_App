import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatDateFr } from '../../lib/reclamationDisplay'
import { createReclamation, updateReclamation } from '../../lib/reclamationApi'
import { theme } from '../../theme/appTheme'
import {
  RECLAMATION_PRIORITE_LABELS,
  RECLAMATION_STATUT_LABELS,
  RECLAMATION_STATUTS,
  type Reclamation,
  type ReclamationInput,
  type ReclamationPriorite,
} from '../../types/reclamation'

type Props = {
  visible: boolean
  reclamation: Reclamation | null
  assignableNames: string[]
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

const PRIORITES: ReclamationPriorite[] = ['basse', 'normale', 'haute']

function emptyForm(): ReclamationInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    clientName: '',
    clientTelephone: '',
    vehicleRef: '',
    sujet: '',
    description: '',
    statut: 'ouverte',
    assigneA: '',
    priorite: 'normale',
    techniciens: [],
  }
}

export default function ReclamationFormModal({
  visible,
  reclamation,
  assignableNames,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!reclamation
  const [form, setForm] = useState<ReclamationInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 640)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (reclamation) {
      setForm({
        date: reclamation.date,
        clientName: reclamation.clientName,
        clientTelephone: reclamation.clientTelephone ?? '',
        vehicleRef: reclamation.vehicleRef ?? '',
        sujet: reclamation.sujet ?? '',
        description: reclamation.description ?? '',
        statut: reclamation.statut,
        assigneA: reclamation.assigneA ?? '',
        priorite: reclamation.priorite ?? 'normale',
        techniciens: reclamation.techniciens ?? [],
      })
    } else {
      setForm(emptyForm())
    }
  }, [visible, reclamation])

  const toggleTechnicien = (name: string) => {
    setForm((prev) => {
      const list = prev.techniciens ?? []
      if (list.includes(name)) {
        return { ...prev, techniciens: list.filter((n) => n !== name) }
      }
      return { ...prev, techniciens: [...list, name] }
    })
  }

  const canSave = form.clientName.trim().length > 0 && form.date.trim().length > 0

  const submit = async () => {
    if (!canSave) return
    setError(null)
    const payload: ReclamationInput = {
      ...form,
      clientName: form.clientName.trim(),
      clientTelephone: form.clientTelephone?.trim() || undefined,
      vehicleRef: (form.vehicleRef ?? '').trim(),
      sujet: (form.sujet ?? '').trim(),
      description: (form.description ?? '').trim(),
      assigneA: form.assigneA?.trim() || undefined,
      techniciens: form.techniciens ?? [],
    }
    setSaving(true)
    try {
      if (isEdit && reclamation) {
        await updateReclamation(accessToken, reclamation.id, payload)
      } else {
        await createReclamation(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const subtitle = form.date ? formatDateFr(form.date) : undefined

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { height: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isEdit ? 'Modifier la réclamation' : 'Nouvelle réclamation'}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={form.date}
            onChangeText={(date) => setForm((f) => ({ ...f, date }))}
            placeholder="AAAA-MM-JJ"
          />

          <Text style={styles.label}>Client</Text>
          <TextInput
            style={styles.input}
            value={form.clientName}
            onChangeText={(clientName) => setForm((f) => ({ ...f, clientName }))}
            placeholder="Nom du client"
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={form.clientTelephone ?? ''}
            onChangeText={(clientTelephone) => setForm((f) => ({ ...f, clientTelephone }))}
            keyboardType="phone-pad"
            placeholder="Optionnel"
          />

          <Text style={styles.label}>Véhicule (immat ou modèle)</Text>
          <TextInput
            style={styles.input}
            value={form.vehicleRef}
            onChangeText={(vehicleRef) => setForm((f) => ({ ...f, vehicleRef }))}
            placeholder="Ex. SEAT IBIZA 127 TU 2987"
          />

          <Text style={styles.label}>Sujet</Text>
          <TextInput
            style={styles.input}
            value={form.sujet}
            onChangeText={(sujet) => setForm((f) => ({ ...f, sujet }))}
            placeholder="Ex. Bruit frein arrière"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Détails de la réclamation…"
          />

          <Text style={styles.label}>Statut</Text>
          <View style={styles.chips}>
            {RECLAMATION_STATUTS.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, form.statut === s && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, statut: s }))}
              >
                <Text style={[styles.chipText, form.statut === s && styles.chipTextActive]}>
                  {RECLAMATION_STATUT_LABELS[s]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Assigné à</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable
              style={[styles.chip, !form.assigneA && styles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, assigneA: '' }))}
            >
              <Text style={[styles.chipText, !form.assigneA && styles.chipTextActive]}>
                Non assigné
              </Text>
            </Pressable>
            {assignableNames.map((n) => (
              <Pressable
                key={`main-${n}`}
                style={[styles.chip, form.assigneA === n && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, assigneA: n }))}
              >
                <Text style={[styles.chipText, form.assigneA === n && styles.chipTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Autres assignés</Text>
          <View style={styles.chips}>
            {assignableNames.map((n) => {
              const on = (form.techniciens ?? []).includes(n)
              return (
                <Pressable
                  key={`tech-${n}`}
                  style={[styles.chip, on && styles.chipActive]}
                  onPress={() => toggleTechnicien(n)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.label}>Priorité</Text>
          <View style={styles.chips}>
            {PRIORITES.map((p) => (
              <Pressable
                key={p}
                style={[styles.chip, form.priorite === p && styles.chipActive]}
                onPress={() => setForm((f) => ({ ...f, priorite: p }))}
              >
                <Text style={[styles.chipText, form.priorite === p && styles.chipTextActive]}>
                  {RECLAMATION_PRIORITE_LABELS[p]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveDisabled]}
            onPress={() => void submit()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </Pressable>
        </View>
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
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  textArea: { minHeight: 80 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primaryDark },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  error: { color: theme.danger, fontSize: 13, marginBottom: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: { fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '800' },
})
