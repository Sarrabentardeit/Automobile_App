import { Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'

type Props = {
  onPress: () => void
  visible?: boolean
}

export default function AddContactFab({ onPress, visible = true }: Props) {
  if (!visible) return null

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Ajouter un contact"
      style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
    >
      <LinearGradient colors={['#fb923c', '#f97316']} style={styles.gradient}>
        <Ionicons name="add" size={28} color="#fff" />
      </LinearGradient>
    </Pressable>
  )
}

const FAB_SIZE = 56

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    ...theme.shadow.fab,
  },
  wrapPressed: { transform: [{ scale: 0.94 }], opacity: 0.95 },
  gradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
})
