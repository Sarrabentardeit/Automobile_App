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
import { createContactImportant, updateContactImportant } from '../lib/contactImportantApi'
import { theme } from '../theme/appTheme'
import {
  CONTACT_CATEGORIES,
  type ContactImportant,
  type ContactImportantInput,
} from '../types/contactImportant'

type Props = {
  visible: boolean
  contact: ContactImportant | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

export default function ContactImportantFormModal({
  visible,
  contact,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!contact
  const [nom, setNom] = useState('')
  const [numero, setNumero] = useState('')
  const [categorie, setCategorie] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomInset = Platform.OS === 'ios' ? 20 : 12
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.78, 580)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (contact) {
      setNom(contact.nom)
      setNumero(contact.numero)
      setCategorie(contact.categorie ?? '')
      setNotes(contact.notes ?? '')
    } else {
      setNom('')
      setNumero('')
      setCategorie('')
      setNotes('')
    }
  }, [visible, contact])

  const submit = async () => {
    setError(null)
    if (!nom.trim()) {
      setError('Le nom est requis.')
      return
    }
    if (!numero.trim()) {
      setError('Le numéro est requis.')
      return
    }
    const payload: ContactImportantInput = {
      nom: nom.trim(),
      numero: numero.trim(),
      categorie: categorie.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    setSaving(true)
    try {
      if (isEdit && contact) {
        await updateContactImportant(accessToken, contact.id, payload)
      } else {
        await createContactImportant(accessToken, payload)
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
        <View style={styles.header}>
          <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.headerBanner}>
            <View style={styles.headerIcon}>
              <Ionicons
                name={isEdit ? 'create' : 'call'}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {isEdit ? 'Modifier le contact' : 'Nouveau contact'}
              </Text>
              {isEdit && contact ? (
                <Text style={styles.sub}>{contact.nom}</Text>
              ) : (
                <Text style={styles.sub}>Fournisseur, assurance, dépannage…</Text>
              )}
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
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.label}>
              Nom <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Ex. Dépannage 24h"
              placeholderTextColor={theme.textSubtle}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>
              Numéro <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={numero}
              onChangeText={setNumero}
              placeholder="Ex. 71 123 456"
              placeholderTextColor={theme.textSubtle}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHead}>Catégorie</Text>
            <View style={styles.chipsWrap}>
              <Pressable
                style={[styles.chip, !categorie && styles.chipActive]}
                onPress={() => setCategorie('')}
              >
                <Text style={[styles.chipText, !categorie && styles.chipTextActive]}>—</Text>
              </Pressable>
              {CONTACT_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.chip, categorie === cat && styles.chipActive]}
                  onPress={() => setCategorie(cat)}
                >
                  <Text
                    style={[styles.chipText, categorie === cat && styles.chipTextActive]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optionnel"
              placeholderTextColor={theme.textSubtle}
              multiline
            />
          </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: bottomInset }]}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveDisabled,
              pressed && !saving && styles.pressed,
            ]}
            disabled={saving}
            onPress={() => void submit()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#fff" />
            )}
            <Text style={styles.saveText}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
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
  screenAccent: { height: 3, backgroundColor: theme.primary },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.primary + '28',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  sectionHead: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
  required: { color: theme.primary, fontWeight: '800' },
  input: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: theme.primaryDark, fontWeight: '800' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.dangerSoft,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.danger + '25',
  },
  errorText: { flex: 1, color: theme.danger, fontSize: 13, fontWeight: '600' },
  footerBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.textSecondary },
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
  pressed: { opacity: 0.9 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
