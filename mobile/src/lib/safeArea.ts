import Constants from 'expo-constants'
import { Dimensions, Platform, StatusBar } from 'react-native'

/** Marge haute sous la barre de statut (sans react-native-safe-area-context). */
export function getStatusBarInset(): number {
  const fromExpo = Constants.statusBarHeight
  if (typeof fromExpo === 'number' && fromExpo > 0) return fromExpo
  if (Platform.OS === 'android') return StatusBar.currentHeight ?? 28
  return 47
}

/**
 * Marge basse (nav Android 3 boutons / gestes, home indicator iOS).
 * Toujours ≥ 24 pour que footers de modals restent cliquables.
 */
export function getSheetBottomInset(): number {
  if (Platform.OS === 'ios') {
    const screenH = Dimensions.get('screen').height
    const windowH = Dimensions.get('window').height
    const diff = Math.round(screenH - windowH)
    // iPhone avec home indicator ≈ 34 ; anciens modèles plus bas
    return Math.max(diff > 0 ? Math.min(diff, 40) : 20, 20)
  }
  const screenH = Dimensions.get('screen').height
  const windowH = Dimensions.get('window').height
  const diff = Math.round(screenH - windowH)
  // Barre 3 boutons ≈ 48 ; gestes parfois 0 → minimum sûr
  return Math.max(diff > 0 ? diff : 0, 48)
}
