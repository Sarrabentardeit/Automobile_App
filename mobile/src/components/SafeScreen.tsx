import type { ReactNode } from 'react'
import { Platform, SafeAreaView, StatusBar, StyleSheet, View, type ViewStyle } from 'react-native'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Marges sûres sans react-native-safe-area-context (évite erreurs Metro sur Windows). */
export default function SafeScreen({ children, style }: Props) {
  if (Platform.OS === 'ios') {
    return <SafeAreaView style={[styles.flex, style]}>{children}</SafeAreaView>
  }
  const top = StatusBar.currentHeight ?? 28
  return (
    <View style={[styles.flex, { paddingTop: top, paddingBottom: 16 }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
