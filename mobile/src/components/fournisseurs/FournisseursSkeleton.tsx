import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Block({ opacity, style }: { opacity: Animated.Value; style: object }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />
}

export default function FournisseursSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 550, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  return (
    <View style={styles.list}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, theme.shadow.sm]}>
          <Block opacity={pulse} style={styles.accent} />
          <View style={styles.body}>
            <Block opacity={pulse} style={styles.circle} />
            <View style={{ flex: 1, gap: 8 }}>
              <Block opacity={pulse} style={styles.lineL} />
              <Block opacity={pulse} style={styles.lineS} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  accent: { height: 3, backgroundColor: theme.primarySoft },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  block: { backgroundColor: theme.border },
  circle: { width: 48, height: 48, borderRadius: 14 },
  lineL: { height: 14, width: '55%', borderRadius: 6 },
  lineS: { height: 12, width: '38%', borderRadius: 6 },
})
