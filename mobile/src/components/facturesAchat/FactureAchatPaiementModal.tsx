import { useEffect, useState } from 'react'
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
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatMontant } from '../../lib/formatMoney'
import { addPaiementFactureAchat } from '../../lib/factureAchatApi'
import { factureAchatResteTTC } from '../../lib/factureAchatHelpers'
import { theme } from '../../theme/appTheme'
import {
  MODE_PAIEMENT_OPTIONS,
  type FactureAchat,
  type ModePaiement,
} from '../../types/factureAchat'

type Props = {
  visible: boolean
  facture: FactureAchat | null
  accessToken: string
  onClose: () => void
  onSaved: (f: FactureAchat) => void
  onError: (msg: string) => void
}

export default function FactureAchatPaiementModal({
  visible,
  facture,
  accessToken,
  onClose,
  onSaved,
  onError,
}: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [montant, setMontant] = useState('')
  const [mode, setMode] = useState<ModePaiement | ''>('especes')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible || !facture) return
    const reste = factureAchatResteTTC(facture)
    setDate(new Date().toISOString().slice(0, 10))
    setMontant(reste > 0 ? String(reste) : '')
    setMode('especes')
    setNote('')
  }, [visible, facture])

  if (!facture) return null

  const reste = factureAchatResteTTC(facture)

  const submit = async () => {
    const m = parseFloat(montant.replace(',', '.'))
    if (!date.trim() || !Number.isFinite(m) || m <= 0) {
      onError('Date et montant valides requis')
      return
    }
    if (m > reste + 0.01) {
      onError(`Montant max : ${formatMontant(reste)}`)
      return
    }
    setSaving(true)
    try {
      const updated = await addPaiementFactureAchat(accessToken, facture.id, {
        date: date.trim(),
        montant: m,
        mode,
        note,
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Erreur paiement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Payer</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {facture.numero} · {facture.fournisseurNom}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.resteBox}>
            <Text style={styles.resteLabel}>Reste</Text>
            <Text style={styles.resteValue}>{formatMontant(reste)}</Text>
          </View>

          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textSubtle}
          />

          <Text style={styles.label}>Montant</Text>
          <TextInput
            style={styles.input}
            value={montant}
            onChangeText={setMontant}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={theme.textSubtle}
          />

          <Text style={styles.label}>Mode</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modes}>
            {MODE_PAIEMENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setMode(opt.value)}
                style={[styles.modeChip, mode === opt.value && styles.modeChipActive]}
              >
                <Text style={[styles.modeText, mode === opt.value && styles.modeTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Optionnel"
            placeholderTextColor={theme.textSubtle}
          />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.pressed]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.btnCancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnSave, pressed && styles.pressed]}
            onPress={() => void submit()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnSaveText}>Enregistrer</Text>
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
    borderRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '600', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textSubtle, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { paddingHorizontal: 18, paddingBottom: 8, gap: 6 },
  resteBox: {
    backgroundColor: theme.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  resteLabel: { fontSize: 12, color: theme.textSubtle },
  resteValue: { fontSize: 24, fontWeight: '600', color: theme.primaryDark, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: theme.textSubtle, marginTop: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surfaceMuted,
  },
  textArea: { minHeight: 64, textAlignVertical: 'top' },
  modes: { gap: 8, paddingVertical: 4 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surfaceMuted,
  },
  modeChipActive: { backgroundColor: theme.primarySoft },
  modeText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  modeTextActive: { color: theme.primaryDark, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.borderLight,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnCancel: { backgroundColor: theme.surfaceMuted },
  btnSave: { backgroundColor: theme.primary },
  btnCancelText: { fontWeight: '600', color: theme.textSecondary, fontSize: 15 },
  btnSaveText: { fontWeight: '600', color: '#fff', fontSize: 15 },
  pressed: { opacity: 0.9 },
})
