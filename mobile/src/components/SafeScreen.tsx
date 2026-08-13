import type { ReactNode } from 'react'
import { Platform, SafeAreaView, StyleSheet, View, type ViewStyle } from 'react-native'
import { getSheetBottomInset, getStatusBarInset } from '../lib/safeArea'

type Props = {
  children: ReactNode
  style?: ViewStyle
}

/** Marges sûres sans react-native-safe-area-context (évite erreurs Metro sur Windows). */
export default function SafeScreen({ children, style }: Props) {
  if (Platform.OS === 'ios') {
    return <SafeAreaView style={[styles.flex, style]}>{children}</SafeAreaView>
  }
  const top = getStatusBarInset()
  const bottom = Math.min(getSheetBottomInset(), 24)
  return (
    <View style={[styles.flex, { paddingTop: top, paddingBottom: bottom }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
