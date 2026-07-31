import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import {
  CALENDAR_RDV_STATUT_CONFIG,
  type CalendarAssignment,
} from '../../types/calendarAssignment'

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
  const statut = assignment.statut ?? 'prevu'
  const cfg = CALENDAR_RDV_STATUT_CONFIG[statut]
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: cfg.color + '55', backgroundColor: cfg.bg },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.accent, { backgroundColor: cfg.color }]} />
      <View style={[styles.avatar, { backgroundColor: cfg.color }]}>
        <Text style={styles.avatarText}>{memberInitials(assignment.memberName)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={[styles.member, { color: cfg.text }]} numberOfLines={1}>
            {assignment.memberName}
          </Text>
          <View style={[styles.badge, { backgroundColor: '#fff', borderColor: cfg.color }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
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
            <Ionicons name="call-outline" size={14} color={cfg.color} />
            <Text style={[styles.client, { color: cfg.text }]} numberOfLines={1}>
              {assignment.clientName}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 10,
    gap: 10,
  },
  pressed: { opacity: 0.92 },
  accent: { width: 4, alignSelf: 'stretch' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  member: { flex: 1, fontSize: 14, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  vehicle: { flex: 1, fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
  desc: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 16 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  client: { flex: 1, fontSize: 12, fontWeight: '600' },
})
