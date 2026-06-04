import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Block({ opacity, style }: { opacity: Animated.Value; style: object }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />
}

export default function ContactsImportantsSkeleton() {
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
        <View key={i} style={styles.card}>
          <Block opacity={pulse} style={styles.accent} />
          <View style={styles.body}>
            <Block opacity={pulse} style={styles.icon} />
            <View style={{ flex: 1, gap: 8 }}>
              <Block opacity={pulse} style={styles.lineL} />
              <Block opacity={pulse} style={styles.lineS} />
            </View>
            <Block opacity={pulse} style={styles.chevron} />
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
  accent: { width: 4, height: '100%', backgroundColor: theme.border },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  block: { backgroundColor: theme.border },
  icon: { width: 44, height: 44, borderRadius: 12 },
  lineL: { height: 14, width: '55%', borderRadius: 6 },
  lineS: { height: 12, width: '40%', borderRadius: 6 },
  chevron: { width: 20, height: 20, borderRadius: 4 },
})
