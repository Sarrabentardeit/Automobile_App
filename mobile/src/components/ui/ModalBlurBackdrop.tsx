import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
type Props = {
  /** Si défini, un tap sur le fond déclenche cette action */
  onPress?: () => void
}

/** Fond semi-transparent + flou pour isoler les bottom sheets / modals */
export default function ModalBlurBackdrop({ onPress }: Props) {
  const layers = (
    <>
      <BlurView
        intensity={Platform.OS === 'android' ? 80 : 50}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={styles.dim} pointerEvents="none" />
    </>
  )

  if (onPress) {
    return (
      <Pressable style={styles.pressable} onPress={onPress} accessibilityRole="button">
        {layers}
      </Pressable>
    )
  }

  return (
    <View style={styles.pressable} pointerEvents="none">
      {layers}
    </View>
  )
}

const styles = StyleSheet.create({
  pressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'android' ? 'rgba(17, 24, 39, 0.5)' : 'rgba(17, 24, 39, 0.35)',
  },
})
