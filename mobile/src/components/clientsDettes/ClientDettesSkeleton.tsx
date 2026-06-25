import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '../../theme/appTheme'

export default function ClientDettesSkeleton() {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.kpiSkeleton} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.row}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.bar, { width: '55%' }]} />
            <View style={[styles.bar, { width: '80%', height: 10, marginTop: 8 }]} />
            <View style={[styles.bar, { width: '40%', height: 10, marginTop: 6 }]} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  kpiSkeleton: {
    height: 88,
    borderRadius: theme.radius.lg,
    marginBottom: 4,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.border,
  },
  lines: { flex: 1 },
  bar: { height: 14, backgroundColor: theme.border, borderRadius: 6 },
})
