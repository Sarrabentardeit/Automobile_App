import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { getModalLayout } from '../../lib/modalLayout'
import { theme } from '../../theme/appTheme'
import {
  NOTE_COULEURS,
  type NoteCouleur,
  type NotePersonnelle,
  type NotePersonnelleInput,
} from '../../types/notePersonnelle'

type Props = {
  visible: boolean
  note: NotePersonnelle | null
  onClose: () => void
  onSave: (data: NotePersonnelleInput) => Promise<void>
}

function pad(n: number) { return String(n).padStart(2, '0') }

function parseIsoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function todayLabel(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NotePersonnelleFormModal({ visible, note, onClose, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [rappelDate, setRappelDate] = useState<Date | null>(null)
  const [heure, setHeure] = useState('09')
  const [minute, setMinute] = useState('00')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [couleur, setCouleur] = useState<NoteCouleur>('')
  const [epinglee, setEpinglee] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const minuteRef = useRef<TextInput>(null)

  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 620,
    chrome: 150,
  })

  useEffect(() => {
    if (!visible) return
    setTitre(note?.titre ?? '')
    setContenu(note?.contenu ?? '')
    const d = parseIsoToDate(note?.rappelAt)
    setRappelDate(d)
    setHeure(d ? pad(d.getHours()) : '09')
    setMinute(d ? pad(d.getMinutes()) : '00')
    setCouleur((note?.couleur as NoteCouleur) || '')
    setEpinglee(note?.epinglee ?? false)
    setError(null)
    setSaving(false)
    setShowDatePicker(false)
  }, [visible, note])

  const onDateChange = (_e: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false)
    if (selected) setRappelDate(selected)
  }

  /** Construit le Date final depuis rappelDate + heure + minute */
  function buildRappelAt(): Date | null {
    if (!rappelDate) return null
    const h = parseInt(heure, 10)
    const m = parseInt(minute, 10)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    const d = new Date(rappelDate)
    d.setHours(Math.min(h, 23), Math.min(m, 59), 0, 0)
    return d
  }

  const submit = async () => {
    if (!titre.trim() && !contenu.trim()) {
      setError('Ajoutez un titre ou un contenu')
      return
    }
    let rappelAt: string | null = null
    if (rappelDate) {
      const built = buildRappelAt()
      if (!built) {
        setError('Heure invalide — entrez HH et MM')
        return
      }
      rappelAt = built.toISOString()
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ titre: titre.trim(), contenu: contenu.trim(), rappelAt, couleur, epinglee })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={440}>
      <View style={[styles.card, { maxHeight: cardMaxHeight }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{note ? 'Modifier la note' : 'Nouvelle note'}</Text>
            <Text style={styles.subtitle}>Notes privées — rappel optionnel</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={titre}
            onChangeText={setTitre}
            placeholder="Ex. Rappeler le client"
            placeholderTextColor={theme.textSubtle}
          />

          <Text style={styles.label}>Contenu</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={contenu}
            onChangeText={setContenu}
            placeholder="Détails…"
            placeholderTextColor={theme.textSubtle}
            multiline
            textAlignVertical="top"
          />

          {/* ─── Rappel ─── */}
          <Text style={styles.label}>Rappel (optionnel)</Text>

          {/* Bouton date */}
          <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={[styles.dateBtnText, !rappelDate && styles.placeholder]}>
              {rappelDate ? todayLabel(rappelDate) : 'Choisir une date'}
            </Text>
            {rappelDate ? (
              <Pressable
                hitSlop={10}
                onPress={() => setRappelDate(null)}
                accessibilityLabel="Supprimer"
              >
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>

          {showDatePicker ? (
            <DateTimePicker
              value={rappelDate ?? new Date()}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          ) : null}

          {/* Heure + Minute en saisie manuelle */}
          {rappelDate ? (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={18} color={theme.primary} style={styles.timeIcon} />
              <TextInput
                style={styles.timeInput}
                value={heure}
                onChangeText={v => {
                  const clean = v.replace(/\D/g, '').slice(0, 2)
                  setHeure(clean)
                  if (clean.length === 2) minuteRef.current?.focus()
                }}
                onBlur={() => {
                  const n = parseInt(heure, 10)
                  if (!Number.isNaN(n)) setHeure(pad(Math.min(n, 23)))
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={theme.textSubtle}
                selectTextOnFocus
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                ref={minuteRef}
                style={styles.timeInput}
                value={minute}
                onChangeText={v => {
                  const clean = v.replace(/\D/g, '').slice(0, 2)
                  setMinute(clean)
                }}
                onBlur={() => {
                  const n = parseInt(minute, 10)
                  if (!Number.isNaN(n)) setMinute(pad(Math.min(n, 59)))
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={theme.textSubtle}
                selectTextOnFocus
              />
            </View>
          ) : null}

          {/* ─── Couleur ─── */}
          <Text style={styles.label}>Couleur</Text>
          <View style={styles.colors}>
            {NOTE_COULEURS.map(c => (
              <Pressable
                key={c.value || 'none'}
                onPress={() => setCouleur(c.value)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c.value ? c.hex : '#fff' },
                  !c.value && styles.colorDotEmpty,
                  couleur === c.value && styles.colorDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Épingler</Text>
            <Switch
              value={epinglee}
              onValueChange={setEpinglee}
              trackColor={{ false: '#d1d5db', true: '#fdba74' }}
              thumbColor={epinglee ? theme.primary : '#f4f4f5'}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void submit()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            )}
          </Pressable>
        </View>
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  body: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  textarea: { minHeight: 100 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: theme.bg,
  },
  dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.text },
  placeholder: { color: theme.textSubtle, fontWeight: '500' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  timeIcon: { marginRight: 4 },
  timeInput: {
    width: 64,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    backgroundColor: theme.bg,
    textAlign: 'center',
  },
  timeSep: { fontSize: 24, fontWeight: '800', color: theme.text, marginHorizontal: 4 },
  colors: { flexDirection: 'row', gap: 10, marginTop: 2 },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotEmpty: { borderColor: theme.border },
  colorDotActive: { borderColor: theme.dark, transform: [{ scale: 1.1 }] },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: theme.text },
  error: { color: theme.danger, fontSize: 13, marginTop: 10 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  cancelBtnText: { fontWeight: '700', fontSize: 15, color: theme.textSecondary },
  saveBtn: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
