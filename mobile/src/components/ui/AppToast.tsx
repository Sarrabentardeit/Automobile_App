import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'

type Props = {
  message: string | null
  type?: 'success' | 'error'
  onDismiss?: () => void
}

export default function AppToast({ message, type = 'success', onDismiss }: Props) {
  const y = useRef(new Animated.Value(80)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!message) return
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start()
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: 80, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss?.())
    }, 2800)
    return () => clearTimeout(t)
  }, [message, y, opacity, onDismiss])

  if (!message) return null

  const err = type === 'error'
  return (
    <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY: y }] }]}>
      <View style={[styles.inner, err && styles.innerError]}>
        <Ionicons
          name={err ? 'close-circle' : 'checkmark-circle'}
          size={22}
          color={err ? theme.danger : theme.success}
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    zIndex: 50,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.dark,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
    ...theme.shadow.sm,
  },
  innerError: { backgroundColor: '#7f1d1d', borderLeftColor: theme.danger },
  text: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
})
