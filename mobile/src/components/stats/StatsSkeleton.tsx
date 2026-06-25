import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Block() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon} />
        <View style={styles.body}>
          <View style={styles.lineLg} />
          <View style={styles.lineSm} />
        </View>
      </View>
    </View>
  )
}

export default function StatsSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.hero} />
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((k) => (
          <View key={k} style={styles.gridCell} />
        ))}
      </View>
      <View style={styles.chart} />
      <Block />
      <Block />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 4 },
  hero: {
    height: 88,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.borderLight,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: {
    width: '47%',
    height: 72,
    borderRadius: theme.radius.md,
    backgroundColor: theme.borderLight,
  },
  chart: {
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.borderLight,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
  },
  body: { flex: 1, gap: 8 },
  lineLg: { height: 14, width: '60%', borderRadius: 6, backgroundColor: theme.borderLight },
  lineSm: { height: 10, width: '40%', borderRadius: 6, backgroundColor: theme.borderLight },
})
