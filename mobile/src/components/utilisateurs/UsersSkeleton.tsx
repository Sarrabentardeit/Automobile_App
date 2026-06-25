import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

export default function UsersSkeleton() {
  return (
    <View style={styles.wrap}>
      {[1, 2, 3, 4, 5].map((k) => (
        <View key={k} style={styles.card}>
          <View style={styles.avatar} />
          <View style={styles.body}>
            <View style={styles.lineLg} />
            <View style={styles.lineMd} />
            <View style={styles.lineSm} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.primarySoft,
  },
  body: { flex: 1, gap: 8, justifyContent: 'center' },
  lineLg: { height: 14, width: '55%', borderRadius: 6, backgroundColor: theme.borderLight },
  lineMd: { height: 12, width: '80%', borderRadius: 6, backgroundColor: theme.borderLight },
  lineSm: { height: 10, width: '40%', borderRadius: 6, backgroundColor: theme.borderLight },
})
