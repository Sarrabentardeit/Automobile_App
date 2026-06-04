import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDuree } from '../lib/format'
import { ETAT_CONFIG, type EtatVehicule, type HistoriqueEtat } from '../types/vehicule'

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

type Props = {
  historique: HistoriqueEtat[]
  dateEntree: string
}

export default function VehiculeStats({ historique, dateEntree }: Props) {
  const sorted = [...historique].sort(
    (a, b) => new Date(a.date_changement).getTime() - new Date(b.date_changement).getTime()
  )
  const startTime =
    sorted.length > 0
      ? new Date(sorted[0].date_changement).getTime()
      : parseDateOnly(dateEntree).getTime()
  const totalMinutes = Math.max(0, Math.round((Date.now() - startTime) / 60000))

  const timeByEtat: Partial<Record<EtatVehicule, number>> = {}
  historique.forEach((h) => {
    if (h.etat_precedent && h.duree_etat_precedent_minutes) {
      const prev = h.etat_precedent as EtatVehicule
      timeByEtat[prev] = (timeByEtat[prev] || 0) + h.duree_etat_precedent_minutes
    }
  })

  const etats = Object.entries(timeByEtat).sort(([, a], [, b]) => b - a) as [
    EtatVehicule,
    number,
  ][]
  const transitions = historique.length
  const longestEtat = etats.length > 0 ? etats[0] : null

  return (
    <View style={styles.root}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="time-outline" size={16} color="#9ca3af" />
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>{formatDuree(totalMinutes)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="swap-horizontal" size={16} color="#9ca3af" />
          <Text style={styles.summaryLabel}>Transitions</Text>
          <Text style={styles.summaryValue}>{transitions}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="timer-outline" size={16} color="#9ca3af" />
          <Text style={styles.summaryLabel}>Plus long</Text>
          {longestEtat ? (
            <Text style={[styles.summaryValue, { color: ETAT_CONFIG[longestEtat[0]].color }]}>
              {formatDuree(longestEtat[1])}
            </Text>
          ) : (
            <Text style={[styles.summaryValue, { color: '#d1d5db' }]}>—</Text>
          )}
        </View>
      </View>

      {etats.length > 0 ? (
        <View style={styles.repartition}>
          <Text style={styles.repartitionTitle}>Répartition du temps</Text>
          <View style={styles.stackedBar}>
            {etats.map(([etat, mins]) => {
              const pct = totalMinutes > 0 ? (mins / totalMinutes) * 100 : 0
              if (pct < 1) return null
              return (
                <View
                  key={etat}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: ETAT_CONFIG[etat].color,
                    height: '100%',
                  }}
                />
              )
            })}
          </View>
          {etats.map(([etat, mins]) => {
            const cfg = ETAT_CONFIG[etat]
            const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0
            return (
              <View key={etat} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {cfg.label}
                </Text>
                <View style={styles.legendBarBg}>
                  <View
                    style={[
                      styles.legendBarFill,
                      { width: `${pct}%`, backgroundColor: cfg.color },
                    ]}
                  />
                </View>
                <Text style={styles.legendMins}>{formatDuree(mins)}</Text>
                <Text style={styles.legendPct}>{pct}%</Text>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 4,
  },
  summaryLabel: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  repartition: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  repartitionTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 10 },
  stackedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { width: 72, fontSize: 11, fontWeight: '600', color: '#374151' },
  legendBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  legendBarFill: { height: '100%', borderRadius: 999 },
  legendMins: { width: 52, fontSize: 10, fontWeight: '700', color: '#4b5563', textAlign: 'right' },
  legendPct: { width: 32, fontSize: 10, color: '#9ca3af', textAlign: 'right' },
})
