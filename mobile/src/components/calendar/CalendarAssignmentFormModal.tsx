import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from '../ui/ModalBlurBackdrop'
import CalendarMemberPicker, { buildMemberRows } from './CalendarMemberPicker'
import CalendarVehiclePicker, { type VehiclePickerValue } from './CalendarVehiclePicker'
import { createClient, fetchClients } from '../../lib/clientApi'
import {
  createCalendarAssignment,
  updateCalendarAssignment,
} from '../../lib/calendarApi'
import { formatDateFr } from '../../lib/calendarGrid'
import { createNotification } from '../../lib/notifications'
import { getModalLayout } from '../../lib/modalLayout'
import { buildModeleLabel, parseMarqueModele } from '../../lib/vehiculeBrands'
import type { AppUser } from '../../lib/vehiculeApi'
import { theme } from '../../theme/appTheme'
import type { CalendarAssignment, CalendarAssignmentInput } from '../../types/calendarAssignment'
import type { Vehicule } from '../../types/vehicule'

export type AssignmentFormState = {
  date: string
  memberName: string
  vehicleId: number | null
  vehicleLabel: string
  description: string
  clientName: string
  clientTelephone: string
  extraMembers: string[]
}

function emptyForm(date: string, memberName: string): AssignmentFormState {
  return {
    date,
    memberName,
    vehicleId: null,
    vehicleLabel: '',
    description: '',
    clientName: '',
    clientTelephone: '',
    extraMembers: [],
  }
}

type Props = {
  visible: boolean
  editing: CalendarAssignment | null
  initialDate: string
  memberNames: string[]
  users: AppUser[]
  vehicules: Vehicule[]
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

export default function CalendarAssignmentFormModal({
  visible,
  editing,
  initialDate,
  memberNames,
  users,
  vehicules,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<AssignmentFormState>(
    emptyForm(initialDate, memberNames[0] ?? '')
  )
  const [vehiclePicker, setVehiclePicker] = useState<VehiclePickerValue>({
    vehicleId: null,
    vehicleLabel: '',
    isOther: false,
    vehicleMarque: '',
    vehicleModele: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { cardMaxHeight, scrollMaxHeight, cardWidth, footerPaddingBottom } = getModalLayout({
    maxCard: 640,
    chrome: 150,
  })

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (editing) {
      const parsed =
        editing.vehicleId == null
          ? parseMarqueModele(editing.vehicleLabel)
          : { marque: '', modele: '' }
      setForm({
        date: editing.date,
        memberName: editing.memberName,
        vehicleId: editing.vehicleId,
        vehicleLabel: editing.vehicleLabel,
        description: editing.description,
        clientName: editing.clientName ?? '',
        clientTelephone: editing.clientTelephone ?? '',
        extraMembers: [],
      })
      setVehiclePicker({
        vehicleId: editing.vehicleId,
        vehicleLabel: editing.vehicleLabel,
        isOther: editing.vehicleId == null,
        vehicleMarque: parsed.marque,
        vehicleModele: parsed.modele,
      })
    } else {
      const firstV = vehicules[0]
      const label = firstV ? `${firstV.modele} (${firstV.immatriculation})` : ''
      setForm({
        ...emptyForm(initialDate, memberNames[0] ?? ''),
        vehicleId: firstV?.id ?? null,
        vehicleLabel: label,
      })
      setVehiclePicker({
        vehicleId: firstV?.id ?? null,
        vehicleLabel: label,
        isOther: !firstV,
        vehicleMarque: '',
        vehicleModele: '',
      })
    }
  }, [visible, editing, initialDate, memberNames, vehicules])

  const memberRows = useMemo(
    () => buildMemberRows(users, memberNames),
    [users, memberNames]
  )

  const canSave = form.date.trim().length > 0 && form.memberName.trim().length > 0

  const setPrincipal = (name: string) => {
    setForm((f) => ({
      ...f,
      memberName: name,
      extraMembers: f.extraMembers.filter((m) => m !== name),
    }))
  }

  const toggleExtraMember = (name: string) => {
    if (name === form.memberName) return
    setForm((f) => ({
      ...f,
      extraMembers: f.extraMembers.includes(name)
        ? f.extraMembers.filter((m) => m !== name)
        : [...f.extraMembers, name],
    }))
  }

  const handleVehicleChange = (next: VehiclePickerValue) => {
    setVehiclePicker(next)
    setForm((f) => ({
      ...f,
      vehicleId: next.isOther ? null : next.vehicleId,
      vehicleLabel: next.vehicleLabel,
    }))
  }

  const buildPayload = (memberName: string): CalendarAssignmentInput => {
    const vehicleLabel = vehiclePicker.isOther
      ? buildModeleLabel(vehiclePicker.vehicleMarque, vehiclePicker.vehicleModele)
      : vehiclePicker.vehicleLabel.trim() || 'Véhicule'
    return {
      date: form.date.trim(),
      memberName: memberName.trim(),
      vehicleId: vehiclePicker.isOther ? null : vehiclePicker.vehicleId,
      vehicleLabel,
      description: form.description.trim(),
      clientName: form.clientName.trim() || undefined,
      clientTelephone: form.clientTelephone.trim() || undefined,
      statut: editing?.statut ?? 'prevu',
    }
  }

  const submit = async () => {
    if (!canSave) return
    if (vehiclePicker.isOther && !vehiclePicker.vehicleMarque.trim()) {
      setError('Sélectionnez la marque du véhicule')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const clientName = form.clientName.trim()
      const clientTel = form.clientTelephone.trim()
      if (clientName && clientTel) {
        const clients = await fetchClients(accessToken, { limit: 500 })
        const exists = (clients.data ?? []).some(
          (c) =>
            c.telephone === clientTel ||
            c.nom.toLowerCase() === clientName.toLowerCase()
        )
        if (!exists) {
          await createClient(accessToken, { nom: clientName, telephone: clientTel })
        }
      }

      const resolvedLabel = vehiclePicker.isOther
        ? buildModeleLabel(vehiclePicker.vehicleMarque, vehiclePicker.vehicleModele)
        : vehiclePicker.vehicleLabel.trim() || 'Véhicule'

      if (editing) {
        await updateCalendarAssignment(accessToken, editing.id, buildPayload(form.memberName))
      } else {
        const allMembers = [
          form.memberName.trim(),
          ...form.extraMembers.map((m) => m.trim()),
        ].filter(Boolean)
        const unique = Array.from(new Set(allMembers.map((m) => m.toLowerCase()))).map(
          (lower) => allMembers.find((m) => m.toLowerCase() === lower)!
        )
        for (const name of unique) {
          await createCalendarAssignment(accessToken, buildPayload(name))
          const tech = users.find((u) => u.nom_complet.toLowerCase() === name.toLowerCase())
          if (tech) {
            void createNotification(accessToken, {
              userId: tech.id,
              message: `Affectation le ${formatDateFr(form.date)} : ${resolvedLabel} — ${form.description || 'Travail'}`,
              type: 'calendar_assignment',
              title: 'Calendrier',
              vehiculeId:
                typeof form.vehicleId === 'number' && form.vehicleId > 0
                  ? form.vehicleId
                  : undefined,
            }).catch(() => {})
          }
        }
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ModalBlurBackdrop onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centerWrap}
          pointerEvents="box-none"
        >
          <View style={[styles.card, { width: cardWidth, maxHeight: cardMaxHeight }]}>
            <View style={styles.accent} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {editing ? 'Modifier affectation' : 'Nouvelle affectation'}
                </Text>
                <Text style={styles.subtitle}>{formatDateFr(form.date)}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Text style={styles.label}>Équipe *</Text>
              {memberRows.length === 0 ? (
                <Text style={styles.hint}>Aucun membre d’équipe disponible</Text>
              ) : (
                <CalendarMemberPicker
                  members={memberRows}
                  principal={form.memberName}
                  extraMembers={form.extraMembers}
                  onPrincipalChange={setPrincipal}
                  onExtraToggle={toggleExtraMember}
                  showExtra={!editing}
                />
              )}

              <Text style={styles.label}>Véhicule</Text>
              <CalendarVehiclePicker
                vehicules={vehicules}
                value={vehiclePicker}
                onChange={handleVehicleChange}
              />

              <Text style={styles.label}>Travail à faire</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(description) => setForm((f) => ({ ...f, description }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Ex. JOINT CULASSE, DIAG, 4 AMORTISSEURS…"
                placeholderTextColor={theme.textSubtle}
              />

              <Text style={styles.label}>Client (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={form.clientName}
                onChangeText={(clientName) => setForm((f) => ({ ...f, clientName }))}
                placeholder="Nom du client"
                placeholderTextColor={theme.textSubtle}
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={form.clientTelephone}
                onChangeText={(clientTelephone) => setForm((f) => ({ ...f, clientTelephone }))}
                keyboardType="phone-pad"
                placeholder="Téléphone"
                placeholderTextColor={theme.textSubtle}
              />
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!canSave || saving) && styles.disabled]}
                onPress={() => void submit()}
                disabled={!canSave || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>{editing ? 'Mettre à jour' : 'Enregistrer'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 2,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    ...theme.shadow.sm,
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
  scroll: { padding: 16, paddingBottom: 20 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 10,
  },
  hint: {
    fontSize: 13,
    color: theme.textMuted,
    backgroundColor: theme.bg,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  textArea: { minHeight: 80 },
  error: { color: theme.danger, fontSize: 13, marginBottom: 8 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  saveText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.5 },
})
