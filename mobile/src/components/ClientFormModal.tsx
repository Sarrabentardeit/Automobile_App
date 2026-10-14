import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from './ui/CenteredBlurModal'
import { createClient, fetchNextCarte, updateClient } from '../lib/clientApi'
import { getModalLayout } from '../lib/modalLayout'
import { theme } from '../theme/appTheme'
import type { CarteVip, CarteVipAcces, Client, ClientInput } from '../types/client'

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function emptyCarte(): CarteVip {
  return { numero: '', debut: todayIso(), fin: '', acces: 'standard' }
}

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
  const [carteOn, setCarteOn] = useState(false)
  const [carte, setCarte] = useState<CarteVip>(emptyCarte())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 640,
    chrome: 180,
  })

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
      setCarteOn(Boolean(client.carteVip))
      setCarte(client.carteVip ?? emptyCarte())
    } else {
      setForm(emptyForm())
      setCarteOn(false)
      setCarte(emptyCarte())
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
    if (carteOn && (!carte.debut || !carte.fin)) {
      setError('Les dates de la carte VIP sont requises.')
      return
    }
    if (carteOn && carte.fin < carte.debut) {
      setError('La date de fin doit être après la date de début.')
      return
    }
    const payload: ClientInput = {
      nom: form.nom.trim(),
      telephone: form.telephone.trim(),
      email: form.email?.trim() || undefined,
      adresse: form.adresse?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      matriculeFiscale: form.matriculeFiscale?.trim() || undefined,
      carteVip: carteOn
        ? { numero: carte.numero.trim(), debut: carte.debut, fin: carte.fin, acces: carte.acces }
        : null,
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
      <View style={[styles.card, { maxHeight: cardMaxHeight }]}>
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
          style={{ maxHeight: scrollMaxHeight }}
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

            <View style={styles.sectionCard}>
              <View style={styles.sectionHead}>
                <Ionicons name="card-outline" size={16} color="#92400e" />
                <Text style={styles.section}>Carte VIP</Text>
                <Switch
                  value={carteOn}
                  onValueChange={(on) => {
                    setCarteOn(on)
                    if (on && !carte.numero) {
                      void fetchNextCarte(accessToken)
                        .then((numero) => setCarte((prev) => ({ ...prev, numero: prev.numero || numero })))
                        .catch(() => undefined)
                    }
                  }}
                  trackColor={{ false: '#e5e7eb', true: '#f59e0b' }}
                  thumbColor="#fff"
                />
              </View>
              {carteOn ? (
                <View>
                  <View style={styles.preview}>
                    <View style={styles.previewTop}>
                      <Text style={styles.previewKicker}>EL MECANO</Text>
                      <Text style={[styles.previewPill, carte.acces === 'advanced' && styles.previewPillAdvanced]}>
                        {carte.acces === 'advanced' ? 'Advanced' : 'Standard'}
                      </Text>
                    </View>
                    <Text style={styles.previewName}>{form.nom || 'Nom du client'}</Text>
                    <Text style={styles.previewNumero}>{carte.numero || 'VIP-····'}</Text>
                    <View style={styles.previewDates}>
                      <View style={styles.previewDateCell}>
                        <Text style={styles.previewLabel}>Valable du</Text>
                        <Text style={styles.previewDate}>{carte.debut || '—'}</Text>
                      </View>
                      <View style={[styles.previewDateCell, styles.previewDateSplit]}>
                        <Text style={styles.previewLabel}>Jusqu'au</Text>
                        <Text style={styles.previewDate}>{carte.fin || '—'}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.label}>N° de carte</Text>
                  <TextInput
                    style={styles.carteInput}
                    value={carte.numero}
                    onChangeText={(numero) => setCarte((prev) => ({ ...prev, numero }))}
                    placeholder="VIP-0001"
                    placeholderTextColor={theme.textSubtle}
                    autoCapitalize="characters"
                  />
                  <Text style={styles.label}>Accès</Text>
                  <View style={styles.accesRow}>
                    {(['standard', 'advanced'] as CarteVipAcces[]).map((acces) => (
                      <Pressable
                        key={acces}
                        onPress={() => setCarte((prev) => ({ ...prev, acces }))}
                        style={[styles.accesBtn, carte.acces === acces && (acces === 'advanced' ? styles.accesAdvanced : styles.accesOn)]}
                      >
                        <Text style={[styles.accesText, carte.acces === acces && styles.accesTextOn]}>
                          {acces === 'advanced' ? 'Advanced' : 'Standard'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.label}>Début (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={styles.carteInput}
                    value={carte.debut}
                    onChangeText={(debut) => setCarte((prev) => ({ ...prev, debut }))}
                    placeholder="2026-10-14"
                    placeholderTextColor={theme.textSubtle}
                  />
                  <Text style={styles.label}>Fin (AAAA-MM-JJ)</Text>
                  <TextInput
                    style={styles.carteInput}
                    value={carte.fin}
                    onChangeText={(fin) => setCarte((prev) => ({ ...prev, fin }))}
                    placeholder="2027-10-14"
                    placeholderTextColor={theme.textSubtle}
                  />
                </View>
              ) : null}
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

        <View style={[styles.footerBar, { paddingBottom: footerPaddingBottom }]}>
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
  preview: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  previewKicker: { color: theme.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  previewPill: { color: theme.textMuted, fontSize: 11, fontWeight: '800', backgroundColor: theme.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  previewPillAdvanced: { color: '#fff', backgroundColor: theme.primary },
  previewLabel: { color: theme.textSubtle, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  previewName: { color: theme.text, fontSize: 22, fontWeight: '700', marginTop: 16, paddingHorizontal: 16 },
  previewNumero: {
    color: theme.textSecondary, marginTop: 10, marginHorizontal: 16, alignSelf: 'flex-start',
    fontSize: 13, letterSpacing: 1.4, backgroundColor: theme.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden',
  },
  previewDates: { flexDirection: 'row', marginTop: 16, backgroundColor: theme.surfaceMuted, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  previewDate: { color: theme.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  previewDateCell: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  previewDateSplit: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border },
  carteInput: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: theme.text, backgroundColor: '#fff', marginTop: 4, marginBottom: 8,
  },
  accesRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 8 },
  accesBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 10, backgroundColor: '#fff' },
  accesOn: { backgroundColor: '#111827', borderColor: '#111827' },
  accesAdvanced: { backgroundColor: '#78350f', borderColor: '#78350f' },
  accesText: { fontWeight: '700', color: theme.textMuted },
  accesTextOn: { color: '#fff' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  section: {
    flex: 1,
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
