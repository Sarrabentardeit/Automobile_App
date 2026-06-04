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
import CenteredBlurModal from './ui/CenteredBlurModal'
import { createClient, updateClient } from '../lib/clientApi'
import { theme } from '../theme/appTheme'
import type { Client, ClientInput } from '../types/client'

function emptyForm(): ClientInput {
  return {
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: '',
    matriculeFiscale: '',
  }
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Props = {
  visible: boolean
  client: Client | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
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

export default function ClientFormModal({
  visible,
  client,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!client
  const [form, setForm] = useState<ClientInput>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomInset = Platform.OS === 'ios' ? 20 : 12
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.82, 640)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (client) {
      setForm({
        nom: client.nom,
        telephone: client.telephone,
        email: client.email ?? '',
        adresse: client.adresse ?? '',
        notes: client.notes ?? '',
        matriculeFiscale: client.matriculeFiscale ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [visible, client])

  const set = (k: keyof ClientInput, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const submit = async () => {
    setError(null)
    if (!form.nom.trim()) {
      setError('Le nom est requis.')
      return
    }
    if (!form.telephone.trim()) {
      setError('Le téléphone est requis.')
      return
    }
    if (form.email && !isValidEmail(form.email)) {
      setError('Adresse email invalide.')
      return
    }
    const payload: ClientInput = {
      nom: form.nom.trim(),
      telephone: form.telephone.trim(),
      email: form.email?.trim() || undefined,
      adresse: form.adresse?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      matriculeFiscale: form.matriculeFiscale?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (isEdit && client) {
        await updateClient(accessToken, client.id, payload)
      } else {
        await createClient(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { height: dialogHeight }]}>
        <View style={styles.screenAccent} />
        <View style={styles.sheetHeader}>
          <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.headerBanner}>
            <View style={styles.sheetIcon}>
              <Ionicons
                name={isEdit ? 'create' : 'person-add'}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.sheetTitle}>
                {isEdit ? 'Modifier le client' : 'Nouveau client'}
              </Text>
              <Text style={styles.sheetSub}>
                {isEdit ? 'Mettre à jour les informations' : 'Ajouter un contact atelier'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </LinearGradient>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={theme.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHead}>
                <Ionicons name="id-card-outline" size={16} color={theme.primary} />
                <Text style={styles.section}>Identité</Text>
              </View>
              <Field
                label="Nom complet"
                required
                icon="person-outline"
                value={form.nom}
                onChangeText={(v) => set('nom', v)}
                placeholder="Ex. M. Ben Salem"
              />
              <Field
                label="Téléphone"
                required
                icon="call-outline"
                value={form.telephone}
                onChangeText={(v) => set('telephone', v)}
                keyboardType="phone-pad"
                placeholder="58 000 000"
              />
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHead}>
                <Ionicons name="navigate-outline" size={16} color={theme.primary} />
                <Text style={styles.section}>Coordonnées</Text>
              </View>
              <Field
                label="Email"
                icon="mail-outline"
                value={form.email ?? ''}
                onChangeText={(v) => set('email', v)}
                keyboardType="email-address"
                placeholder="optionnel"
              />
              <Field
                label="Adresse"
                icon="location-outline"
                value={form.adresse ?? ''}
                onChangeText={(v) => set('adresse', v)}
                placeholder="optionnel"
              />
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHead}>
                <Ionicons name="receipt-outline" size={16} color={theme.primary} />
                <Text style={styles.section}>Facturation</Text>
              </View>
              <Field
                label="Matricule fiscal"
                icon="document-text-outline"
                value={form.matriculeFiscale ?? ''}
                onChangeText={(v) => set('matriculeFiscale', v)}
                placeholder="optionnel"
              />
            </View>

            <View style={[styles.sectionCard, styles.sectionCardLast]}>
              <View style={styles.sectionHead}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.primary} />
                <Text style={styles.section}>Notes</Text>
              </View>
              <Field
                label="Remarques"
                icon="create-outline"
                value={form.notes ?? ''}
                onChangeText={(v) => set('notes', v)}
                multiline
                placeholder="Préférences, historique…"
              />
            </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: bottomInset }]}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveDisabled,
              pressed && !saving && styles.btnPressed,
            ]}
            disabled={saving}
            onPress={() => void submit()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#fff" />
            )}
            <Text style={styles.saveBtnText}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Text>
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
    ...theme.shadow.sm,
    elevation: 16,
  },
  screenAccent: {
    height: 3,
    backgroundColor: theme.primary,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'stretch',
  },
  scroll: { flex: 1 },
  headerBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.primary + '28',
  },
  sheetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  headerText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  sheetSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    flexShrink: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  sectionCardLast: { marginBottom: 4 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.dangerSoft,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.danger + '25',
  },
  errorText: { flex: 1, color: theme.danger, fontSize: 13, fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  required: { color: theme.primary, fontWeight: '800' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  inputRowMulti: { alignItems: 'flex-start' },
  inputIcon: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: theme.primarySoft,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top', paddingTop: 14 },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textSecondary,
    textAlign: 'center',
  },
  saveBtn: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  saveDisabled: { opacity: 0.65 },
  btnPressed: { opacity: 0.9 },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
})
