type SoundKind = 'message' | 'notification'

const SRC: Record<SoundKind, string> = {
  message: '/sounds/message.wav',
  notification: '/sounds/notification.wav',
}

let unlocked = false
let lastPlayAt = 0
const MIN_GAP_MS = 1200

const cache: Partial<Record<SoundKind, HTMLAudioElement>> = {}

function getAudio(kind: SoundKind): HTMLAudioElement {
  if (!cache[kind]) {
    const a = new Audio(SRC[kind])
    a.preload = 'auto'
    a.volume = kind === 'message' ? 0.55 : 0.65
    cache[kind] = a
  }
  return cache[kind]!
}

/** Débloque l’audio navigateur après une interaction utilisateur. */
export function unlockAppSounds() {
  if (unlocked || typeof window === 'undefined') return
  unlocked = true
  try {
    const a = getAudio('message')
    a.muted = true
    void a
      .play()
      .then(() => {
        a.pause()
        a.currentTime = 0
        a.muted = false
      })
      .catch(() => {
        a.muted = false
        unlocked = false
      })
  } catch {
    unlocked = false
  }
}

function play(kind: SoundKind) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastPlayAt < MIN_GAP_MS) return
  lastPlayAt = now
  try {
    const a = getAudio(kind)
    a.currentTime = 0
    void a.play().catch(() => {
      /* autoplay bloqué tant que pas d’interaction */
    })
  } catch {
    /* ignore */
  }
}

export function playMessageSound() {
  play('message')
}

export function playNotificationSound() {
  play('notification')
}
