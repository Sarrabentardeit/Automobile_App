import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

export default function ReclamationsSkeleton() {
  return (
    <View style={styles.wrap}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.bar, { width: '40%', height: 12 }]} />
          <View style={[styles.bar, { width: '90%', marginTop: 10 }]} />
          <View style={[styles.bar, { width: '60%', height: 10, marginTop: 8 }]} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  bar: { height: 14, backgroundColor: theme.border, borderRadius: 6 },
})
