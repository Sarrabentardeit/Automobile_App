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
  createDemandeDevis,
  deleteDemandeDevis,
  updateDemandeDevis,
} from '../../lib/demandeDevisApi'
import { todayIsoDate } from '../../lib/demandeDevisHelpers'
import { theme } from '../../theme/appTheme'
import {
  DEMANDE_DEVIS_STATUTS,
  type DemandeDevis,
  type DemandeDevisInput,
} from '../../types/demandeDevis'
import DevisStatutBadge from './DevisStatutBadge'

type Props = {
  visible: boolean
  demande: DemandeDevis | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function emptyForm(): DemandeDevisInput {
  return {
    date: todayIsoDate(),
    clientName: '',
    clientTelephone: '',
    vehicleRef: '',
    description: '',
    statut: 'en_attente',
    montantEstime: undefined,
    dateLimite: '',
    notes: '',
  }
}

export default function DevisFormModal({
  visible,
  demande,
  accessToken,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!demande
  const [form, setForm] = useState<DemandeDevisInput>(emptyForm)
  const [montantText, setMontantText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.92, 680)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (demande) {
      setForm({
        date: demande.date,
        clientName: demande.clientName,
        clientTelephone: demande.clientTelephone ?? '',
        vehicleRef: demande.vehicleRef ?? '',
        description: demande.description,
        statut: demande.statut,
        montantEstime: demande.montantEstime,
        dateLimite: demande.dateLimite ?? '',
        notes: demande.notes ?? '',
      })
      setMontantText(
        demande.montantEstime != null && demande.montantEstime > 0
          ? String(demande.montantEstime)
          : ''
      )
    } else {
      setForm(emptyForm())
      setMontantText('')
    }
  }, [visible, demande])

  const canSave =
    form.clientName.trim().length > 0 &&
    form.date.trim().length > 0 &&
    form.description.trim().length > 0

  const confirmDelete = () => {
    if (!demande) return
    Alert.alert('Supprimer', `Supprimer le devis de « ${demande.clientName} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSaving(true)
            try {
              await deleteDemandeDevis(accessToken, demande.id)
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
    setError(null)
    const montant = montantText.trim() ? Number(montantText.replace(',', '.')) : undefined
    const payload: DemandeDevisInput = {
      date: form.date.trim(),
      clientName: form.clientName.trim(),
      clientTelephone: form.clientTelephone?.trim() || undefined,
      vehicleRef: form.vehicleRef?.trim() || '',
      description: form.description.trim(),
      statut: form.statut,
      montantEstime: montant != null && !Number.isNaN(montant) ? montant : undefined,
      dateLimite: form.dateLimite?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (isEdit && demande) {
        await updateDemandeDevis(accessToken, demande.id, payload)
      } else {
        await createDemandeDevis(accessToken, payload)
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
            <Text style={styles.title}>
              {isEdit ? 'Modifier la demande' : 'Nouvelle demande de devis'}
            </Text>
            <Text style={styles.subtitle}>Suivi client & travaux</Text>
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

          <Text style={styles.sectionLabel}>Client</Text>
          <Field
            icon="person-outline"
            value={form.clientName}
            onChangeText={(clientName) => setForm((f) => ({ ...f, clientName }))}
            placeholder="Nom du client *"
          />
          <Field
            icon="call-outline"
            value={form.clientTelephone ?? ''}
            onChangeText={(clientTelephone) => setForm((f) => ({ ...f, clientTelephone }))}
            placeholder="Téléphone"
            keyboardType="phone-pad"
          />
          <Field
            icon="car-outline"
            value={form.vehicleRef ?? ''}
            onChangeText={(vehicleRef) => setForm((f) => ({ ...f, vehicleRef }))}
            placeholder="Réf. véhicule (modèle, immat…)"
          />

          <Text style={styles.sectionLabel}>Demande</Text>
          <Field
            icon="calendar-outline"
            value={form.date}
            onChangeText={(date) => setForm((f) => ({ ...f, date }))}
            placeholder="Date AAAA-MM-JJ *"
          />
          <View style={styles.textAreaWrap}>
            <Text style={styles.fieldLabel}>Description des travaux *</Text>
            <TextInput
              style={styles.textArea}
              value={form.description}
              onChangeText={(description) => setForm((f) => ({ ...f, description }))}
              placeholder="Détaillez les travaux à chiffrer…"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.sectionLabel}>Statut</Text>
          <View style={styles.statutRow}>
            {DEMANDE_DEVIS_STATUTS.map((s) => {
              const selected = form.statut === s
              return (
                <Pressable
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, statut: s }))}
                  style={[styles.statutChip, selected && styles.statutChipOn]}
                >
                  <DevisStatutBadge statut={s} compact />
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.sectionLabel}>Montant & échéance</Text>
          <Field
            icon="cash-outline"
            value={montantText}
            onChangeText={setMontantText}
            placeholder="Montant estimé (TND)"
            keyboardType="decimal-pad"
          />
          <Field
            icon="time-outline"
            value={form.dateLimite ?? ''}
            onChangeText={(dateLimite) => setForm((f) => ({ ...f, dateLimite }))}
            placeholder="Date limite AAAA-MM-JJ"
          />

          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.textArea, styles.notesArea]}
            value={form.notes ?? ''}
            onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
            placeholder="Notes internes (optionnel)"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
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
                <Text style={styles.saveBtnText}>{isEdit ? 'Enregistrer' : 'Créer la demande'}</Text>
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
  keyboardType?: 'default' | 'phone-pad' | 'decimal-pad'
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={theme.textMuted} style={styles.fieldIcon} />
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
  accent: { height: 4, backgroundColor: theme.primary },
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  fieldIcon: { marginRight: 4 },
  fieldInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 6 },
  textAreaWrap: { marginBottom: 10 },
  textArea: {
    minHeight: 96,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  notesArea: { minHeight: 72 },
  statutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  statutChip: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statutChipOn: { borderColor: theme.primary },
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
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  saveBtnFull: { flex: 1 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
