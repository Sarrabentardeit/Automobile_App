import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { CalendarAssignment } from '../../types/calendarAssignment'

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

type Props = {
  assignment: CalendarAssignment
  onPress: () => void
}

export default function CalendarAssignmentCard({ assignment, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.accent} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{memberInitials(assignment.memberName)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.member} numberOfLines={1}>
            {assignment.memberName}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
        </View>

        <View style={styles.row}>
          <Ionicons name="car" size={14} color={theme.textMuted} />
          <Text style={styles.vehicle} numberOfLines={1}>
            {assignment.vehicleLabel}
          </Text>
        </View>

        {assignment.description?.trim() ? (
          <View style={styles.row}>
            <Ionicons name="construct" size={14} color={theme.textMuted} />
            <Text style={styles.desc} numberOfLines={3}>
              {assignment.description}
            </Text>
          </View>
        ) : null}

        {assignment.clientName?.trim() ? (
          <View style={styles.clientRow}>
            <Ionicons name="call-outline" size={14} color={theme.primary} />
            <Text style={styles.client} numberOfLines={1}>
              {assignment.clientName}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    marginBottom: 10,
    ...theme.shadow.sm,
  },
  pressed: { opacity: 0.92 },
  accent: { width: 4, alignSelf: 'stretch', backgroundColor: theme.primary },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: theme.primaryDark },
  body: { flex: 1, padding: 12, paddingLeft: 10, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  member: { fontSize: 15, fontWeight: '800', color: theme.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vehicle: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  desc: { flex: 1, fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  client: { flex: 1, fontSize: 12, fontWeight: '600', color: theme.primaryDark },
})
