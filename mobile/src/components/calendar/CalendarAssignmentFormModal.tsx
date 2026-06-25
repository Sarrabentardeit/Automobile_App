import { useEffect, useMemo, useState } from 'react'
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
import CalendarMemberPicker, { buildMemberRows } from './CalendarMemberPicker'
import CalendarVehiclePicker, { type VehiclePickerValue } from './CalendarVehiclePicker'
import { createClient, fetchClients } from '../../lib/clientApi'
import {
  createCalendarAssignment,
  updateCalendarAssignment,
} from '../../lib/calendarApi'
import { formatDateFr } from '../../lib/calendarGrid'
import { createNotification } from '../../lib/notifications'
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
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.9, 680)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (editing) {
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

  const buildPayload = (memberName: string): CalendarAssignmentInput => ({
    date: form.date.trim(),
    memberName: memberName.trim(),
    vehicleId: vehiclePicker.isOther ? null : vehiclePicker.vehicleId,
    vehicleLabel: vehiclePicker.vehicleLabel.trim() || 'Véhicule',
    description: form.description.trim(),
    clientName: form.clientName.trim() || undefined,
    clientTelephone: form.clientTelephone.trim() || undefined,
  })

  const submit = async () => {
    if (!canSave) return
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
              message: `Affectation le ${formatDateFr(form.date)} : ${form.vehicleLabel || 'Véhicule'} — ${form.description || 'Travail'}`,
              type: 'calendar_assignment',
              title: 'Calendrier',
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
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Équipe *</Text>
          <CalendarMemberPicker
            members={memberRows}
            principal={form.memberName}
            extraMembers={form.extraMembers}
            onPrincipalChange={setPrincipal}
            onExtraToggle={toggleExtraMember}
            showExtra={!editing}
          />

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

        <View style={styles.footer}>
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 10,
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
  saveText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.5 },
})
