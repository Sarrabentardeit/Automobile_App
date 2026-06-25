import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import {
  createOutilAhmed,
  deleteOutilAhmed,
  updateOutilAhmed,
} from '../../lib/outilAhmedApi'
import { todayIsoDate } from '../../lib/demandeDevisHelpers'
import { theme } from '../../theme/appTheme'
import type { OutilAhmed, OutilAhmedInput } from '../../types/outilAhmed'

const ACCENT = '#059669'

type Props = {
  visible: boolean
  entry: OutilAhmed | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function emptyForm(): OutilAhmedInput {
  return {
    date: todayIsoDate(),
    vehicule: '',
    typeTravaux: '',
    prixGarage: undefined,
    prixAhmed: 0,
  }
}

export default function OutilAhmedFormModal({
  visible,
  entry,
  accessToken,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!entry
  const [form, setForm] = useState<OutilAhmedInput>(emptyForm)
  const [prixGarageText, setPrixGarageText] = useState('')
  const [prixAhmedText, setPrixAhmedText] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 560)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (entry) {
      setForm({
        date: entry.date,
        vehicule: entry.vehicule,
        typeTravaux: entry.typeTravaux,
        prixGarage: entry.prixGarage,
        prixAhmed: entry.prixAhmed,
      })
      setPrixGarageText(
        entry.prixGarage != null && entry.prixGarage !== 0 ? String(entry.prixGarage) : ''
      )
      setPrixAhmedText(String(entry.prixAhmed))
    } else {
      setForm(emptyForm())
      setPrixGarageText('')
      setPrixAhmedText('0')
    }
  }, [visible, entry])

  const canSave = form.date.trim().length > 0 && prixAhmedText.trim().length > 0

  const parseAmount = (text: string): number | undefined => {
    const t = text.trim().replace(',', '.')
    if (!t) return undefined
    const n = Number(t)
    return Number.isNaN(n) ? undefined : n
  }

  const confirmDelete = () => {
    if (!entry) return
    Alert.alert('Supprimer', 'Supprimer cette entrée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await deleteOutilAhmed(accessToken, entry.id)
              onDeleted()
              onClose()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Suppression impossible')
            } finally {
              setSaving(false)
            }
          })()
        },
      },
    ])
  }

  const submit = async () => {
    if (!canSave) return
    const prixAhmed = parseAmount(prixAhmedText)
    if (prixAhmed === undefined) {
      setError('Prix Ahmed invalide')
      return
    }
    setError(null)
    const payload: OutilAhmedInput = {
      date: form.date.trim(),
      vehicule: form.vehicule.trim(),
      typeTravaux: form.typeTravaux.trim(),
      prixGarage: parseAmount(prixGarageText),
      prixAhmed,
    }
    setSaving(true)
    try {
      if (isEdit && entry) {
        await updateOutilAhmed(accessToken, entry.id, payload)
      } else {
        await createOutilAhmed(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={440}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{isEdit ? 'Modifier' : 'Nouvelle entrée'}</Text>
            <Text style={styles.subtitle}>Opération Ahmed — travaux & prix</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Field
            icon="calendar-outline"
            value={form.date}
            onChangeText={(date) => setForm((f) => ({ ...f, date }))}
            placeholder="Date AAAA-MM-JJ *"
          />
          <Field
            icon="car-outline"
            value={form.vehicule}
            onChangeText={(vehicule) => setForm((f) => ({ ...f, vehicule }))}
            placeholder="Voiture (ex: CHERRY, PAIEMENT…)"
          />
          <Field
            icon="construct-outline"
            value={form.typeTravaux}
            onChangeText={(typeTravaux) => setForm((f) => ({ ...f, typeTravaux }))}
            placeholder="Type de travaux"
          />
          <Field
            icon="business-outline"
            value={prixGarageText}
            onChangeText={setPrixGarageText}
            placeholder="Prix garage (TND)"
            keyboardType="decimal-pad"
          />
          <Field
            icon="cash-outline"
            value={prixAhmedText}
            onChangeText={setPrixAhmedText}
            placeholder="Prix Ahmed (+revenu / -paiement) *"
            keyboardType="decimal-pad"
          />
          <Text style={styles.hint}>
            Prix Ahmed positif = revenu · négatif = paiement ou avance
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          {isEdit ? (
            <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={saving}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled, !isEdit && styles.saveBtnFull]}
            onPress={() => void submit()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Enregistrer' : 'Ajouter'}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </CenteredBlurModal>
  )
}

function Field({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  keyboardType?: 'default' | 'decimal-pad'
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={theme.textMuted} />
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSubtle}
        keyboardType={keyboardType}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  accent: { height: 4, backgroundColor: ACCENT },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 12 },
  error: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    padding: 12,
    backgroundColor: theme.dangerSoft,
    borderRadius: theme.radius.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  fieldInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 14 },
  hint: {
    fontSize: 12,
    color: theme.textMuted,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: ACCENT,
    ...theme.shadow.primaryBtn,
  },
  saveBtnFull: { flex: 1 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
