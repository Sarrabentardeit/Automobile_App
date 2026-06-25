import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Bone({ style }: { style?: object }) {
  return <View style={[styles.bone, style]} />
}

export default function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <Bone style={styles.hero} />
      <View style={styles.statsRow}>
        <Bone style={styles.stat} />
        <Bone style={styles.stat} />
        <Bone style={styles.stat} />
      </View>
      <Bone style={styles.strip} />
      <View style={styles.grid}>
        <Bone style={styles.tile} />
        <Bone style={styles.tile} />
        <Bone style={styles.tile} />
        <Bone style={styles.tile} />
      </View>
      <Bone style={styles.section} />
      <Bone style={styles.section} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  bone: {
    backgroundColor: theme.borderLight,
    borderRadius: theme.radius.md,
  },
  hero: { height: 100 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, height: 72 },
  strip: { height: 88 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47%', height: 72 },
  section: { height: 140 },
})
