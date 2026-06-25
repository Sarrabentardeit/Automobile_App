import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDate } from '../../lib/format'
import { formatMontant } from '../../lib/formatMoney'
import { theme } from '../../theme/appTheme'
import type { OutilAhmed } from '../../types/outilAhmed'

const ACCENT = '#059669'

type Props = {
  entry: OutilAhmed
  onPress: () => void
}

export default function OutilAhmedListItem({ entry, onPress }: Props) {
  const positive = entry.prixAhmed >= 0
  const hasGarage = entry.prixGarage != null && entry.prixGarage !== 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="construct" size={22} color={ACCENT} />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.vehicule} numberOfLines={1}>
              {entry.vehicule.trim() || '—'}
            </Text>
            <Text style={[styles.prixAhmed, positive ? styles.positive : styles.negative]}>
              {formatMontant(entry.prixAhmed)} TND
            </Text>
          </View>
          <Text style={styles.travaux} numberOfLines={2}>
            {entry.typeTravaux.trim() || 'Type de travaux non renseigné'}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={ACCENT} />
              <Text style={styles.metaText}>{formatDate(entry.date)}</Text>
            </View>
            {hasGarage ? (
              <View style={styles.garageChip}>
                <Text style={styles.garageLabel}>Garage</Text>
                <Text style={styles.garageValue}>{formatMontant(entry.prixGarage!)}</Text>
              </View>
            ) : null}
          </View>
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
  accent: { height: 3, backgroundColor: ACCENT },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingRight: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  vehicule: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
  },
  prixAhmed: { fontSize: 14, fontWeight: '800' },
  positive: { color: '#047857' },
  negative: { color: '#e11d48' },
  travaux: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  metaText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  garageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  garageLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted },
  garageValue: { fontSize: 11, fontWeight: '700', color: theme.textSecondary },
})
