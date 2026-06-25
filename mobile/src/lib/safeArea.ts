import Constants from 'expo-constants'
import { Dimensions, Platform, StatusBar } from 'react-native'

/** Marge haute sous la barre de statut (sans react-native-safe-area-context). */
export function getStatusBarInset(): number {
  const fromExpo = Constants.statusBarHeight
  if (typeof fromExpo === 'number' && fromExpo > 0) return fromExpo
  if (Platform.OS === 'android') return StatusBar.currentHeight ?? 28
  return 44
}

/** Marge basse (barre de navigation Android / home indicator iOS). */
export function getSheetBottomInset(): number {
  if (Platform.OS === 'ios') return 34
  const screenH = Dimensions.get('screen').height
  const windowH = Dimensions.get('window').height
  const diff = Math.round(screenH - windowH)
  return Math.max(diff > 0 ? diff : 0, 48)
}
