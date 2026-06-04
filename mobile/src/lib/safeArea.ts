import Constants from 'expo-constants'
import { Platform, StatusBar } from 'react-native'

/** Marge haute sous la barre de statut (sans react-native-safe-area-context). */
export function getStatusBarInset(): number {
  const fromExpo = Constants.statusBarHeight
  if (typeof fromExpo === 'number' && fromExpo > 0) return fromExpo
  if (Platform.OS === 'android') return StatusBar.currentHeight ?? 28
  return 44
}
