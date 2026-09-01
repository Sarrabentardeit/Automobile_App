import { Alert, Linking, Platform } from 'react-native'
import * as IntentLauncher from 'expo-intent-launcher'
import * as SecureStore from 'expo-secure-store'

const PROMPT_KEY = 'elmecano_battery_prompt_v2'
const PACKAGE = 'com.elmecano.garage'

/** Ouvre les réglages batterie Android. */
export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${PACKAGE}` }
    )
    return
  } catch {
    /* fallback */
  }
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
    )
    return
  } catch {
    /* fallback */
  }
  try {
    await Linking.openSettings()
  } catch {
    /* ignore */
  }
}

/**
 * Affiche une alerte guidant l'utilisateur vers les réglages batterie
 * pour que les rappels arrivent même app fermée.
 * S'affiche une seule fois (clé stockée en SecureStore).
 */
export async function maybePromptBackgroundReminders(): Promise<void> {
  if (Platform.OS !== 'android') return
  try {
    const done = await SecureStore.getItemAsync(PROMPT_KEY)
    if (done === '1') return
  } catch {
    /* continue */
  }

  Alert.alert(
    '⏰ Rappel en arrière-plan',
    "Pour recevoir ce rappel à l'heure exacte même si l'app est fermée :\n\n" +
      "1. Appuyez « Ouvrir réglages »\n" +
      "2. Choisissez « Sans restriction » pour la batterie\n\n" +
      "Sur Huawei : Lancement applis → EL MECANO → Manuel → tout activer.",
    [
      {
        text: 'Ne plus afficher',
        style: 'cancel',
        onPress: () => {
          void SecureStore.setItemAsync(PROMPT_KEY, '1').catch(() => undefined)
        },
      },
      {
        text: 'Ouvrir réglages',
        onPress: () => {
          void SecureStore.setItemAsync(PROMPT_KEY, '1').catch(() => undefined)
          void openBatterySettings()
        },
      },
    ]
  )
}
