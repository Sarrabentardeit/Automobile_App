import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import { formatDateFr, formatReclamationAssignText } from '../../lib/reclamationDisplay'
import {
  RECLAMATION_STATUT_LABELS,
  STATUT_COLORS,
  type Reclamation,
} from '../../types/reclamation'

type Props = {
  reclamation: Reclamation
  onPress: () => void
}

export default function ReclamationListItem({ reclamation: r, onPress }: Props) {
  const st = STATUT_COLORS[r.statut]
  const assignText = formatReclamationAssignText(r)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
          <Text style={[styles.badgeText, { color: st.text }]}>
            {RECLAMATION_STATUT_LABELS[r.statut]}
          </Text>
        </View>
        {r.priorite && r.priorite !== 'normale' ? (
          <Text
            style={[
              styles.prioriteTag,
              r.priorite === 'haute' ? styles.prioriteHaute : styles.prioriteBasse,
            ]}
          >
            {r.priorite}
          </Text>
        ) : null}
        <Text style={styles.date}>{formatDateFr(r.date)}</Text>
      </View>
      <Text style={styles.sujet} numberOfLines={1}>
        {r.sujet || '—'}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name="person-outline" size={14} color={theme.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>
          {r.clientName}
        </Text>
      </View>
      {r.vehicleRef?.trim() ? (
        <View style={styles.metaRow}>
          <Ionicons name="car-outline" size={14} color={theme.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {r.vehicleRef}
          </Text>
        </View>
      ) : null}
      {r.description?.trim() ? (
        <Text style={styles.desc} numberOfLines={2}>
          {r.description}
        </Text>
      ) : null}
      {assignText ? (
        <Text style={styles.assign} numberOfLines={1}>
          {assignText}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} style={styles.chev} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    paddingRight: 36,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  pressed: { opacity: 0.92 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  prioriteTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  prioriteHaute: { color: '#dc2626' },
  prioriteBasse: { color: theme.textMuted },
  date: { fontSize: 11, color: theme.textMuted, marginLeft: 'auto' },
  sujet: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { flex: 1, fontSize: 13, color: theme.textSecondary },
  desc: { fontSize: 12, color: theme.textMuted, marginTop: 8, lineHeight: 17 },
  assign: { fontSize: 11, color: theme.textSubtle, marginTop: 8 },
  chev: { position: 'absolute', right: 12, top: '50%', marginTop: -9 },
})
