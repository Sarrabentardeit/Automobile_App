import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import {
  cloneRolePermissions,
  createAppAccount,
  updateAppAccount,
} from '../../lib/userApi'
import { theme } from '../../theme/appTheme'
import type { AppAccount } from '../../types/appUser'
import {
  ALL_ROLES,
  ALL_TOGGLE_KEYS,
  isPermissionsCustomized,
  ROLE_STYLE,
  TOGGLE_PERMISSION_LABELS,
  VISIBILITY_OPTIONS,
  type Permissions,
  type Role,
  type TogglePermissionKey,
  type VehiculeVisibility,
} from '../../types/permissions'

type Props = {
  visible: boolean
  user: AppAccount | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

type FormState = {
  nom_complet: string
  email: string
  telephone: string
  password: string
  role: Role
  permissions: Permissions
}

function emptyForm(): FormState {
  return {
    nom_complet: '',
    email: '',
    telephone: '',
    password: '',
    role: 'technicien',
    permissions: cloneRolePermissions('technicien'),
  }
}

export default function UserFormModal({
  visible,
  user,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!user
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.92, 720)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (user) {
      setForm({
        nom_complet: user.nom_complet,
        email: user.email,
        telephone: user.telephone,
        password: '',
        role: user.role,
        permissions: { ...user.permissions },
      })
    } else {
      setForm(emptyForm())
    }
  }, [visible, user])

  const hasCustom = isPermissionsCustomized(form.role, form.permissions)

  const selectRole = (role: Role) => {
    setForm((f) => ({
      ...f,
      role,
      permissions: cloneRolePermissions(role),
    }))
  }

  const resetPermissions = () => {
    setForm((f) => ({ ...f, permissions: cloneRolePermissions(f.role) }))
  }

  const togglePerm = (key: TogglePermissionKey) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }))
  }

  const setVisibility = (val: VehiculeVisibility) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, vehiculeVisibility: val },
    }))
  }

  const canSave =
    form.nom_complet.trim().length > 0 &&
    form.email.trim().length > 0 &&
    (isEdit || form.password.trim().length >= 6)

  const submit = async () => {
    if (!canSave) return
    setError(null)
    setSaving(true)
    try {
      if (isEdit && user) {
        await updateAppAccount(accessToken, user.id, {
          nom_complet: form.nom_complet.trim(),
          telephone: form.telephone.trim(),
          role: form.role,
          permissions: form.permissions,
          ...(form.password.trim().length >= 6 ? { password: form.password.trim() } : {}),
        })
      } else {
        await createAppAccount(accessToken, {
          nom_complet: form.nom_complet.trim(),
          email: form.email.trim().toLowerCase(),
          telephone: form.telephone.trim(),
          password: form.password.trim(),
          role: form.role,
          permissions: form.permissions,
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement')
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
            <Text style={styles.title}>{isEdit ? 'Modifier le compte' : 'Nouveau compte'}</Text>
            <Text style={styles.subtitle}>
              {isEdit ? user!.email : 'Rôle et accès personnalisables'}
            </Text>
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

          <Text style={styles.sectionLabel}>Identité</Text>
          <Field
            icon="person-outline"
            value={form.nom_complet}
            onChangeText={(nom_complet) => setForm((f) => ({ ...f, nom_complet }))}
            placeholder="Nom complet *"
          />
          <Field
            icon="mail-outline"
            value={form.email}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            placeholder="Email *"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEdit}
          />
          <Field
            icon="call-outline"
            value={form.telephone}
            onChangeText={(telephone) => setForm((f) => ({ ...f, telephone }))}
            placeholder="Téléphone"
            keyboardType="phone-pad"
          />
          <Field
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={(password) => setForm((f) => ({ ...f, password }))}
            placeholder={
              isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe (min. 6 car.) *'
            }
            secureTextEntry
          />

          <Text style={styles.sectionLabel}>Rôle</Text>
          <View style={styles.roleGrid}>
            {ALL_ROLES.map((role) => {
              const rc = ROLE_STYLE[role]
              const selected = form.role === role
              return (
                <Pressable
                  key={role}
                  onPress={() => selectRole(role)}
                  style={[
                    styles.roleChip,
                    selected && { backgroundColor: rc.bg, borderColor: rc.color },
                  ]}
                >
                  <Ionicons name="shield-outline" size={16} color={selected ? rc.color : theme.textMuted} />
                  <Text style={[styles.roleChipText, selected && { color: rc.color, fontWeight: '800' }]}>
                    {rc.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.permHeader}>
            <View>
              <Text style={styles.sectionLabel}>Accès</Text>
              <Text style={styles.permHint}>
                Prérempli selon le rôle.
                {hasCustom ? ' · Modifié' : ''}
              </Text>
            </View>
            {hasCustom ? (
              <Pressable onPress={resetPermissions} style={styles.resetBtn}>
                <Ionicons name="refresh-outline" size={16} color={theme.primary} />
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.subSectionLabel}>Visibilité véhicules</Text>
          {VISIBILITY_OPTIONS.map((opt) => {
            const selected = form.permissions.vehiculeVisibility === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                style={[styles.visRow, selected && styles.visRowOn]}
              >
                <View style={styles.visText}>
                  <Text style={[styles.visLabel, selected && styles.visLabelOn]}>{opt.label}</Text>
                  <Text style={styles.visDesc}>{opt.description}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            )
          })}

          <Text style={[styles.subSectionLabel, { marginTop: 12 }]}>Autres accès</Text>
          {ALL_TOGGLE_KEYS.map((key) => {
            const config = TOGGLE_PERMISSION_LABELS[key]
            const isOn = form.permissions[key]
            return (
              <View key={key} style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleLabel}>{config.label}</Text>
                  <Text style={styles.toggleDesc}>{config.description}</Text>
                </View>
                <Switch
                  value={isOn}
                  onValueChange={() => togglePerm(key)}
                  trackColor={{ false: theme.border, true: '#fdba74' }}
                  thumbColor={isOn ? theme.primary : '#f4f4f5'}
                />
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
            onPress={() => void submit()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Enregistrer' : 'Créer le compte'}</Text>
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
  autoCapitalize,
  secureTextEntry,
  editable = true,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences'
  secureTextEntry?: boolean
  editable?: boolean
}) {
  return (
    <View style={[styles.field, !editable && styles.fieldDisabled]}>
      <Ionicons name={icon} size={18} color={theme.textMuted} />
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSubtle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        editable={editable}
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
    marginBottom: 10,
    marginTop: 8,
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
  fieldDisabled: { opacity: 0.65 },
  fieldInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 14 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  roleChip: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  roleChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  permHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  permHint: { fontSize: 12, color: theme.textMuted, marginTop: -6, marginBottom: 8 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.primarySoft,
  },
  resetText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    marginBottom: 8,
  },
  visRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.borderLight,
    backgroundColor: theme.bg,
    marginBottom: 8,
  },
  visRowOn: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  visText: { flex: 1 },
  visLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
  visLabelOn: { color: '#1d4ed8' },
  visDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
  toggleDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
