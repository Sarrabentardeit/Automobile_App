import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme/appTheme'
import type { Reclamation } from '../../types/reclamation'

type Props = {
  reclamations: Reclamation[]
}

type StatItem = {
  label: string
  value: number
  valueColor: string
  bg: string
  border: string
}

export default function ReclamationStatsStrip({ reclamations }: Props) {
  const ouvertes = reclamations.filter((r) => r.statut === 'ouverte').length
  const enCours = reclamations.filter((r) => r.statut === 'en_cours').length
  const traitees = reclamations.filter((r) => r.statut === 'traitee').length
  const cloturees = reclamations.filter((r) => r.statut === 'cloturee').length
  const urgentes = reclamations.filter(
    (r) => r.priorite === 'haute' && r.statut !== 'cloturee'
  ).length

  const items: StatItem[] = [
    { label: 'Total', value: reclamations.length, valueColor: theme.text, bg: theme.surface, border: theme.borderLight },
    { label: 'Ouvertes', value: ouvertes, valueColor: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'En cours', value: enCours, valueColor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'Traitées', value: traitees, valueColor: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { label: 'Clôturées', value: cloturees, valueColor: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
    { label: 'Urgentes', value: urgentes, valueColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  ]

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.chip, { backgroundColor: item.bg, borderColor: item.border }]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.value, { color: item.valueColor }]}>{item.value}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: 8, marginBottom: 12 },
  chip: {
    minWidth: 76,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  label: { fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' },
  value: { fontSize: 18, fontWeight: '800', marginTop: 4 },
})
