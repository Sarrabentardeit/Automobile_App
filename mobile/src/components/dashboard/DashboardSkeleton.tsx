import { StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Bone({ style }: { style?: object }) {
  return <View style={[styles.bone, style]} />
}

export default function DashboardSkeleton() {
  return (
    <View style={styles.wrap}>
      <Bone style={styles.kpi} />
      <Bone style={styles.label} />
      <Bone style={styles.panel} />
      <Bone style={styles.panel} />
      <Bone style={styles.label} />
      <Bone style={styles.report} />
      <Bone style={styles.label} />
      <Bone style={styles.panel} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  bone: {
    backgroundColor: theme.borderLight,
    borderRadius: 16,
  },
  kpi: { height: 78 },
  label: { height: 12, width: 88, borderRadius: 6 },
  panel: { height: 160 },
  report: { height: 200 },
})
