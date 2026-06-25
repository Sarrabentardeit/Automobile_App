import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

export default function OutilAhmedSkeleton() {
  return (
    <View style={styles.wrap}>
      {[1, 2, 3, 4].map((k) => (
        <View key={k} style={styles.card}>
          <View style={styles.accent} />
          <View style={styles.row}>
            <View style={styles.icon} />
            <View style={styles.body}>
              <View style={styles.lineLg} />
              <View style={styles.lineMd} />
              <View style={styles.lineSm} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 8 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  accent: { height: 3, backgroundColor: '#a7f3d0' },
  row: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
  },
  body: { flex: 1, gap: 8 },
  lineLg: { height: 14, width: '55%', borderRadius: 6, backgroundColor: theme.borderLight },
  lineMd: { height: 12, width: '90%', borderRadius: 6, backgroundColor: theme.borderLight },
  lineSm: { height: 10, width: '40%', borderRadius: 6, backgroundColor: theme.borderLight },
})
