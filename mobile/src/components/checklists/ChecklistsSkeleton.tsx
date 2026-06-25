import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { theme } from '../../theme/appTheme'

function Block({ opacity, style }: { opacity: Animated.Value; style: object }) {
  return <Animated.View style={[styles.block, style, { opacity }]} />
}

export default function ChecklistsSkeleton() {
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
    <View style={styles.wrap}>
      <Block opacity={pulse} style={styles.hero} />
      <Block opacity={pulse} style={styles.card} />
      <Block opacity={pulse} style={styles.cardTall} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  block: { backgroundColor: theme.border, borderRadius: theme.radius.lg },
  hero: { height: 88 },
  card: { height: 120 },
  cardTall: { height: 200 },
})
