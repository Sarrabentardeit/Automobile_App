import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
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

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocalInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const normalized = t.includes('T') ? t : t.replace(' ', 'T')
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function NotePersonnelleFormModal({ visible, note, onClose, onSave }: Props) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [rappelLocal, setRappelLocal] = useState('')
  const [couleur, setCouleur] = useState<NoteCouleur>('')
  const [epinglee, setEpinglee] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setTitre(note?.titre ?? '')
    setContenu(note?.contenu ?? '')
    setRappelLocal(toLocalInput(note?.rappelAt ?? null))
    setCouleur((note?.couleur as NoteCouleur) || '')
    setEpinglee(note?.epinglee ?? false)
    setError(null)
    setSaving(false)
  }, [visible, note])

  const submit = async () => {
    if (!titre.trim() && !contenu.trim()) {
      setError('Ajoutez un titre ou un contenu')
      return
    }
    let rappelAt: string | null = null
    if (rappelLocal.trim()) {
      rappelAt = parseLocalInput(rappelLocal)
      if (!rappelAt) {
        setError('Rappel invalide (ex. 2026-08-25 09:30)')
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        titre: titre.trim(),
        contenu: contenu.trim(),
        rappelAt,
        couleur,
        epinglee,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{note ? 'Modifier la note' : 'Nouvelle note'}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.input}
              value={titre}
              onChangeText={setTitre}
              placeholder="Titre"
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
            <Text style={styles.label}>Rappel (AAAA-MM-JJ HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={rappelLocal}
              onChangeText={setRappelLocal}
              placeholder="Optionnel"
              placeholderTextColor={theme.textSubtle}
            />
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
            <Pressable
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={submit}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.text },
  body: { padding: 20, paddingBottom: 36, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surfaceMuted,
  },
  textarea: { minHeight: 110 },
  colors: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
    marginTop: 12,
    marginBottom: 4,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: theme.text },
  error: { color: theme.danger, fontSize: 13, marginTop: 4 },
  saveBtn: {
    marginTop: 16,
    backgroundColor: theme.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...theme.shadow.primaryBtn,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
