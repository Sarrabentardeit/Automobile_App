import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatDate } from '../../lib/format'
import {
  countPermissions,
  isPermissionsCustomized,
  ROLE_STYLE,
  TOTAL_PERMISSION_SLOTS,
} from '../../types/permissions'
import { theme } from '../../theme/appTheme'
import type { AppAccount } from '../../types/appUser'

type Props = {
  visible: boolean
  user: AppAccount | null
  canDelete: boolean
  onClose: () => void
  onEdit: () => void
  onViewPermissions: () => void
  onToggleStatut: () => void
  onDelete: () => void
}

export default function UserDetailSheet({
  visible,
  user,
  canDelete,
  onClose,
  onEdit,
  onViewPermissions,
  onToggleStatut,
  onDelete,
}: Props) {
  if (!user) return null
  const rc = ROLE_STYLE[user.role]
  const custom = isPermissionsCustomized(user.role, user.permissions)
  const permCount = countPermissions(user.permissions)

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{user.nom_complet}</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.badges}>
            <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
              <Ionicons name="shield-outline" size={14} color={rc.color} />
              <Text style={[styles.roleText, { color: rc.color }]}>{rc.label}</Text>
            </View>
            <View
              style={[
                styles.statutBadge,
                user.statut === 'actif' ? styles.statutOn : styles.statutOff,
              ]}
            >
              <Text
                style={[
                  styles.statutText,
                  user.statut === 'actif' ? styles.statutTextOn : styles.statutTextOff,
                ]}
              >
                {user.statut === 'actif' ? 'Actif' : 'Inactif'}
              </Text>
            </View>
            {custom ? (
              <View style={styles.customBadge}>
                <Text style={styles.customText}>Accès personnalisé</Text>
              </View>
            ) : null}
          </View>

          {user.telephone ? (
            <InfoRow icon="call-outline" label="Téléphone" value={user.telephone} />
          ) : null}
          <InfoRow icon="calendar-outline" label="Créé le" value={formatDate(user.date_creation)} />
          <Pressable style={styles.permBtn} onPress={onViewPermissions}>
            <Ionicons name="eye-outline" size={18} color={theme.primary} />
            <Text style={styles.permBtnText}>
              Voir les accès ({permCount}/{TOTAL_PERMISSION_SLOTS})
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
          </Pressable>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Modifier</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, user.statut === 'actif' ? styles.toggleOff : styles.toggleOn]}
            onPress={onToggleStatut}
          >
            <Ionicons
              name={user.statut === 'actif' ? 'ban-outline' : 'checkmark-circle-outline'}
              size={20}
              color={user.statut === 'actif' ? '#dc2626' : '#059669'}
            />
          </Pressable>
          {canDelete ? (
            <Pressable style={styles.deleteBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </CenteredBlurModal>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.textMuted} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
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
  subtitle: { fontSize: 14, color: theme.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleText: { fontSize: 12, fontWeight: '800' },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statutOn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statutOff: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statutText: { fontSize: 12, fontWeight: '800' },
  statutTextOn: { color: '#047857' },
  statutTextOff: { color: '#b91c1c' },
  customBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  customText: { fontSize: 11, fontWeight: '700', color: theme.primaryDark },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2 },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  permBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.primaryDark },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggleBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleOff: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  toggleOn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
})
