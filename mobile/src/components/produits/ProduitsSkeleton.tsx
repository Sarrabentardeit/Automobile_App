import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Block({ opacity, style }: { opacity: Animated.Value; style: object }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />
}

export default function ProduitsSkeleton() {
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
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <Block opacity={pulse} style={styles.accent} />
          <View style={styles.body}>
            <Block opacity={pulse} style={styles.lineS} />
            <Block opacity={pulse} style={styles.lineL} />
            <Block opacity={pulse} style={styles.lineM} />
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  accent: { width: 4, height: '100%' },
  body: { flex: 1, padding: 14, gap: 8 },
  block: { backgroundColor: theme.border, borderRadius: 6 },
  lineS: { height: 12, width: '30%' },
  lineL: { height: 16, width: '70%' },
  lineM: { height: 12, width: '45%' },
})
