import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme/appTheme'

export type ChartSeries = {
  key: string
  label: string
  color: string
}

type Props = {
  data: Array<Record<string, string | number>>
  series: ChartSeries[]
  periodKey?: string
  formatValue?: (v: number) => string
  barHeight?: number
}

export default function MiniBarChart({
  data,
  series,
  periodKey = 'period',
  formatValue = (v) => String(Math.round(v)),
  barHeight = 120,
}: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucune donnée pour cette période</Text>
      </View>
    )
  }

  const maxVal = Math.max(
    1,
    ...data.flatMap((point) =>
      series.map((s) => Math.max(0, Number(point[s.key] ?? 0)))
    )
  )

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {data.map((point, idx) => {
          const label = String(point[periodKey] ?? idx + 1)
          return (
            <View key={`${label}-${idx}`} style={styles.column}>
              <View style={[styles.bars, { height: barHeight }]}>
                {series.map((s) => {
                  const val = Math.max(0, Number(point[s.key] ?? 0))
                  const h = Math.max(val > 0 ? 4 : 0, (val / maxVal) * barHeight)
                  return (
                    <View key={s.key} style={styles.barWrap}>
                      <View
                        style={[
                          styles.bar,
                          { height: h, backgroundColor: s.color },
                        ]}
                      />
                    </View>
                  )
                })}
              </View>
              <Text style={styles.period} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function MiniBarChartSummary({
  data,
  series,
  formatValue = (v) => String(Math.round(v)),
}: {
  data: Array<Record<string, string | number>>
  series: ChartSeries[]
  formatValue?: (v: number) => string
}) {
  return (
    <View style={styles.summaryRow}>
      {series.map((s) => {
        const total = data.reduce((acc, p) => acc + Number(p[s.key] ?? 0), 0)
        return (
          <View key={s.key} style={styles.summaryChip}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>{s.label}</Text>
              <Text style={styles.summaryValue}>{formatValue(total)}</Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 4, gap: 10, paddingBottom: 4 },
  column: { alignItems: 'center', minWidth: 52 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    justifyContent: 'center',
  },
  barWrap: { width: 10, justifyContent: 'flex-end', height: '100%' },
  bar: { width: 10, borderRadius: 4, minHeight: 0 },
  period: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textMuted,
    marginTop: 6,
    maxWidth: 48,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: theme.textMuted },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    minWidth: '46%',
    flexGrow: 1,
  },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: theme.text, marginTop: 2 },
})
