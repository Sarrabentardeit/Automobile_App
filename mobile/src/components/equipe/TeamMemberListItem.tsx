import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { TeamMember } from '../../types/teamMember'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function avatarGradient(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function initial(name: string): string {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

type Props = {
  member: TeamMember
  onPress: () => void
}

export default function TeamMemberListItem({ member, onPress }: Props) {
  const [c1, c2] = avatarGradient(member.name)
  const hasPhone = !!member.phone?.trim()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Membre ${member.name}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <LinearGradient colors={[c1, c2]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(member.name)}</Text>
        </LinearGradient>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {member.name}
          </Text>
          {hasPhone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={12} color={theme.primary} />
              <Text style={styles.phone} numberOfLines={1}>
                {member.phone}
              </Text>
            </View>
          ) : (
            <Text style={styles.noPhone}>Sans téléphone</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  cardPressed: {
    backgroundColor: theme.surfaceMuted,
    borderColor: theme.primary + '55',
  },
  accent: { width: 4, backgroundColor: theme.primary },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 19, fontWeight: '800', color: '#fff' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: theme.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phone: { fontSize: 14, fontWeight: '600', color: theme.primary },
  noPhone: { fontSize: 13, color: theme.textMuted, marginTop: 4, fontStyle: 'italic' },
})
