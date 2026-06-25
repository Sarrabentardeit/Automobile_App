import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { createFournisseur, deleteFournisseur, updateFournisseur } from '../../lib/fournisseurApi'
import { theme } from '../../theme/appTheme'
import type { Fournisseur, FournisseurInput } from '../../types/fournisseur'

function emptyForm(): FournisseurInput {
  return {
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    contact: '',
    notes: '',
  }
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Props = {
  visible: boolean
  fournisseur: Fournisseur | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  placeholder,
  icon,
  required,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  multiline?: boolean
  keyboardType?: 'default' | 'phone-pad' | 'email-address'
  placeholder?: string
  icon: keyof typeof Ionicons.glyphMap
  required?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMulti]}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={18} color={theme.primary} />
        </View>
        <TextInput
          style={[styles.input, multiline && styles.textarea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSubtle}
          multiline={multiline}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  )
}

export default function FournisseurFormModal({
  visible,
  fournisseur,
  accessToken,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!fournisseur
  const [form, setForm] = useState<FournisseurInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomInset = Platform.OS === 'ios' ? 20 : 12
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 620)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (fournisseur) {
      setForm({
        nom: fournisseur.nom,
        telephone: fournisseur.telephone,
        email: fournisseur.email ?? '',
        adresse: fournisseur.adresse ?? '',
        contact: fournisseur.contact ?? '',
        notes: fournisseur.notes ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [visible, fournisseur])

  const canSave = form.nom.trim().length > 0 && form.telephone.trim().length > 0

  const confirmDelete = () => {
    if (!fournisseur) return
    Alert.alert(
      'Supprimer',
      `Supprimer « ${fournisseur.nom} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true)
              setError(null)
              try {
                await deleteFournisseur(accessToken, fournisseur.id)
                onDeleted?.()
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Suppression impossible')
              } finally {
                setSaving(false)
              }
            })()
          },
        },
      ]
    )
  }

  const submit = async () => {
    if (!canSave) return
    if (!isValidEmail(form.email ?? '')) {
      setError('Adresse e-mail invalide')
      return
    }
    setError(null)
    const payload: FournisseurInput = {
      nom: form.nom.trim(),
      telephone: form.telephone.trim(),
      email: form.email?.trim() || undefined,
      adresse: form.adresse?.trim() || undefined,
      contact: form.contact?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (isEdit && fournisseur) {
        await updateFournisseur(accessToken, fournisseur.id, payload)
      } else {
        await createFournisseur(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.headerBanner}>
            <View style={styles.headerIcon}>
              <Ionicons
                name={isEdit ? 'create' : 'storefront'}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </Text>
              <Text style={styles.subtitle}>
                {isEdit ? 'Mettre à jour les informations' : 'Pièces, huiles, équipements…'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Field
            label="Nom du fournisseur"
            value={form.nom}
            onChangeText={(nom) => setForm((f) => ({ ...f, nom }))}
            placeholder="Ex. Auto Parts Tunis"
            icon="business-outline"
            required
          />
          <Field
            label="Téléphone"
            value={form.telephone}
            onChangeText={(telephone) => setForm((f) => ({ ...f, telephone }))}
            placeholder="Ex. 71 234 567"
            icon="call-outline"
            keyboardType="phone-pad"
            required
          />
          <Field
            label="E-mail"
            value={form.email ?? ''}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            placeholder="Optionnel"
            icon="mail-outline"
            keyboardType="email-address"
          />
          <Field
            label="Adresse"
            value={form.adresse ?? ''}
            onChangeText={(adresse) => setForm((f) => ({ ...f, adresse }))}
            placeholder="Optionnel"
            icon="location-outline"
          />
          <Field
            label="Personne de contact"
            value={form.contact ?? ''}
            onChangeText={(contact) => setForm((f) => ({ ...f, contact }))}
            placeholder="Ex. M. Karim"
            icon="person-outline"
          />
          <Field
            label="Notes"
            value={form.notes ?? ''}
            onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
            placeholder="Optionnel (ex. type de produits)"
            icon="document-text-outline"
            multiline
          />
        </ScrollView>

        {isEdit ? (
          <Pressable
            style={[styles.deleteBtn, saving && styles.disabled]}
            onPress={confirmDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        ) : null}

        <View style={[styles.footer, { paddingBottom: bottomInset }]}>
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
  header: { borderBottomWidth: 1, borderBottomColor: theme.borderLight },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, paddingBottom: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
  required: { color: theme.danger },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    paddingHorizontal: 10,
  },
  inputRowMulti: { alignItems: 'flex-start', paddingVertical: 8 },
  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    paddingVertical: 12,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top', paddingTop: 8 },
  error: { color: theme.danger, fontSize: 13, marginBottom: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: theme.dangerSoft,
  },
  deleteText: { fontWeight: '700', color: theme.danger },
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
