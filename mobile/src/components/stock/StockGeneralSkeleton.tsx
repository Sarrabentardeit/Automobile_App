import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

export default function StockGeneralSkeleton() {
  return (
    <View style={styles.wrap}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.row}>
          <View style={styles.lines}>
            <View style={[styles.bar, { width: '70%' }]} />
            <View style={[styles.bar, { width: '40%', height: 10 }]} />
          </View>
          <View style={styles.pill} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  lines: { flex: 1, gap: 8 },
  bar: { height: 14, backgroundColor: theme.border, borderRadius: 6 },
  pill: { width: 52, height: 32, borderRadius: 16, backgroundColor: theme.border },
})
