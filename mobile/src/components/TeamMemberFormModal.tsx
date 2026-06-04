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
import { createTeamMember, updateTeamMember } from '../lib/teamMemberApi'
import { theme } from '../theme/appTheme'
import type { TeamMember } from '../types/teamMember'

type Props = {
  visible: boolean
  member: TeamMember | null
  accessToken: string
  existingNames?: string[]
  onClose: () => void
  onSaved: () => void
}

export default function TeamMemberFormModal({
  visible,
  member,
  accessToken,
  existingNames = [],
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!member
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bottomInset = Platform.OS === 'ios' ? 20 : 12
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.72, 520)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (member) {
      setName(member.name)
      setPhone(member.phone ?? '')
    } else {
      setName('')
      setPhone('')
    }
  }, [visible, member])

  const submit = async () => {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Le nom est requis.')
      return
    }
    const duplicate = existingNames.some(
      (n) =>
        n.toLowerCase() === trimmedName.toLowerCase() &&
        (!isEdit || n.toLowerCase() !== member!.name.toLowerCase())
    )
    if (duplicate) {
      setError('Un membre avec ce nom existe déjà.')
      return
    }
    setSaving(true)
    try {
      if (isEdit && member) {
        await updateTeamMember(accessToken, member.id, {
          name: trimmedName,
          phone: phone.trim(),
        })
      } else {
        await createTeamMember(accessToken, {
          name: trimmedName,
          phone: phone.trim(),
        })
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
                name={isEdit ? 'create' : 'person-add'}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {isEdit ? 'Modifier le membre' : 'Nouveau membre'}
              </Text>
              {isEdit && member ? (
                <Text style={styles.sub}>{member.name}</Text>
              ) : (
                <Text style={styles.sub}>Ajouter à l&apos;équipe atelier</Text>
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
            <View style={styles.sectionHead}>
              <Ionicons name="id-card-outline" size={16} color={theme.primary} />
              <Text style={styles.section}>Identité</Text>
            </View>
            <Text style={styles.label}>
              Nom <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <Ionicons name="person-outline" size={18} color={theme.primary} />
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex. Ahmed, Karim…"
                placeholderTextColor={theme.textSubtle}
                autoFocus={!isEdit}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHead}>
              <Ionicons name="call-outline" size={16} color={theme.primary} />
              <Text style={styles.section}>Contact</Text>
            </View>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIcon}>
                <Ionicons name="call-outline" size={18} color={theme.primary} />
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Optionnel — ex. 58 000 000"
                placeholderTextColor={theme.textSubtle}
                keyboardType="phone-pad"
              />
            </View>
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
    zIndex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
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
