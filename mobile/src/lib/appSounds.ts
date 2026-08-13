import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'

type SoundKind = 'message' | 'notification'

const sources: Record<SoundKind, number> = {
  message: require('../../assets/sounds/message.wav'),
  notification: require('../../assets/sounds/notification.wav'),
}

const players: Partial<Record<SoundKind, AudioPlayer>> = {}
let modeReady = false
let lastPlayAt = 0
const MIN_GAP_MS = 1200

async function ensureMode() {
  if (modeReady) return
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
    modeReady = true
  } catch {
    /* ignore */
  }
}

function getPlayer(kind: SoundKind): AudioPlayer {
  if (!players[kind]) {
    const player = createAudioPlayer(sources[kind], {
      updateInterval: 500,
      keepAudioSessionActive: true,
    })
    player.volume = kind === 'message' ? 0.7 : 0.8
    players[kind] = player
  }
  return players[kind]!
}

async function play(kind: SoundKind) {
  const now = Date.now()
  if (now - lastPlayAt < MIN_GAP_MS) return
  lastPlayAt = now
  try {
    await ensureMode()
    const player = getPlayer(kind)
    await player.seekTo(0)
    player.play()
  } catch {
    /* ignore */
  }
}

export function playMessageSound() {
  void play('message')
}

export function playNotificationSound() {
  void play('notification')
}
