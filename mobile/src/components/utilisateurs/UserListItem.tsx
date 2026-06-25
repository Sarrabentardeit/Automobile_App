import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import {
  countPermissions,
  isPermissionsCustomized,
  ROLE_STYLE,
  TOTAL_PERMISSION_SLOTS,
} from '../../types/permissions'
import type { AppAccount } from '../../types/appUser'

const GRADIENTS: [string, string][] = [
  ['#6366f1', '#818cf8'],
  ['#0ea5e9', '#38bdf8'],
  ['#f97316', '#fb923c'],
  ['#10b981', '#34d399'],
]

function avatarGradient(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

type Props = {
  user: AppAccount
  onPress: () => void
}

export default function UserListItem({ user, onPress }: Props) {
  const rc = ROLE_STYLE[user.role]
  const custom = isPermissionsCustomized(user.role, user.permissions)
  const permCount = countPermissions(user.permissions)
  const [c1, c2] = avatarGradient(user.nom_complet)
  const initial = user.nom_complet.trim().charAt(0).toUpperCase() || '?'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Utilisateur ${user.nom_complet}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <LinearGradient colors={[c1, c2]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </LinearGradient>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {user.nom_complet}
            </Text>
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
          </View>

          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>

          <View style={styles.metaRow}>
            <View style={[styles.roleBadge, { backgroundColor: rc.bg, borderColor: rc.border }]}>
              <Ionicons name="shield-outline" size={11} color={rc.color} />
              <Text style={[styles.roleText, { color: rc.color }]}>{rc.label}</Text>
            </View>
            {custom ? <Text style={styles.customTag}>personnalisé</Text> : null}
            <View style={styles.permChip}>
              <Ionicons name="eye-outline" size={11} color={theme.primary} />
              <Text style={styles.permText}>
                {permCount}/{TOTAL_PERMISSION_SLOTS}
              </Text>
            </View>
          </View>

          {user.telephone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={12} color={theme.textMuted} />
              <Text style={styles.phone}>{user.telephone}</Text>
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  pressed: { opacity: 0.94 },
  accent: { height: 3, backgroundColor: theme.primary },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingRight: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  info: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: theme.text },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statutOn: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  statutOff: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statutText: { fontSize: 10, fontWeight: '800' },
  statutTextOn: { color: '#047857' },
  statutTextOff: { color: '#b91c1c' },
  email: { fontSize: 12, color: theme.textMuted, marginBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleText: { fontSize: 10, fontWeight: '800' },
  customTag: { fontSize: 10, fontWeight: '700', color: theme.primary },
  permChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  permText: { fontSize: 11, fontWeight: '700', color: theme.primaryDark },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  phone: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
})
