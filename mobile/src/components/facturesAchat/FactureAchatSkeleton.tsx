import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Bone({ w, h = 12 }: { w: number | `${number}%`; h?: number }) {
  return <View style={[styles.bone, { width: w, height: h }]} />
}

export default function FactureAchatSkeleton() {
  return (
    <View style={styles.wrap}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.dot} />
          <View style={styles.lines}>
            <Bone w="40%" h={14} />
            <Bone w="65%" />
            <Bone w="50%" />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingTop: 4 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.borderLight,
    marginTop: 4,
  },
  lines: { flex: 1, gap: 8 },
  bone: { backgroundColor: theme.borderLight, borderRadius: 6 },
})
