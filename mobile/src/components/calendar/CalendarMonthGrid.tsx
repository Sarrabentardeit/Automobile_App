import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { DayCell } from '../../lib/calendarGrid'
import { WEEKDAYS } from '../../lib/calendarGrid'
import { theme } from '../../theme/appTheme'

type Props = {
  grid: DayCell[]
  selectedDate: string | null
  countByDate: Map<string, number>
  onSelectDate: (date: string) => void
}

export default function CalendarMonthGrid({
  grid,
  selectedDate,
  countByDate,
  onSelectDate,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.map((cell, i) => {
          const count = countByDate.get(cell.date) ?? 0
          const selected = selectedDate === cell.date
          return (
            <Pressable
              key={`${cell.date}-${i}`}
              onPress={() => onSelectDate(cell.date)}
              style={[
                styles.cell,
                !cell.isCurrentMonth && styles.cellMuted,
                selected && styles.cellSelected,
                (i + 1) % 7 === 0 && styles.cellRightEdge,
              ]}
            >
              <View
                style={[
                  styles.dayBubble,
                  cell.isToday && styles.dayToday,
                  selected && !cell.isToday && styles.daySelectedRing,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !cell.isCurrentMonth && styles.dayNumMuted,
                    cell.isToday && styles.dayNumToday,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
              {count > 0 ? (
                <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
                  <Text style={[styles.countText, selected && styles.countTextSelected]}>
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              ) : (
                <View style={styles.badgePlaceholder} />
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: theme.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.2857%',
    minHeight: 52,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surface,
  },
  cellRightEdge: { borderRightWidth: 0 },
  cellMuted: { backgroundColor: theme.surfaceMuted },
  cellSelected: { backgroundColor: theme.primarySoft },
  dayBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { backgroundColor: theme.primary },
  daySelectedRing: { borderWidth: 2, borderColor: theme.primary },
  dayNum: { fontSize: 13, fontWeight: '700', color: theme.text },
  dayNumMuted: { color: theme.textSubtle },
  dayNumToday: { color: '#fff' },
  badgePlaceholder: { minHeight: 16 },
  countBadge: {
    marginTop: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeSelected: { backgroundColor: theme.primaryDark },
  countText: { fontSize: 10, fontWeight: '800', color: '#fff', lineHeight: 12 },
  countTextSelected: { color: '#fff' },
})
