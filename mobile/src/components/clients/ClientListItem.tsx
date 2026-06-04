import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { Client } from '../../types/client'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function avatarGradient(nom: string): [string, string] {
  let h = 0
  for (let i = 0; i < nom.length; i++) h = nom.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function initial(nom: string): string {
  const t = nom.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

type Props = {
  client: Client
  onPress: () => void
}

export default function ClientListItem({ client, onPress }: Props) {
  const [c1, c2] = avatarGradient(client.nom)
  const hasEmail = !!client.email?.trim()
  const hasAdresse = !!client.adresse?.trim()
  const hasNotes = !!client.notes?.trim()
  const metaCount = [hasEmail, hasAdresse, hasNotes, !!client.matriculeFiscale].filter(Boolean).length

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Client ${client.nom}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <LinearGradient colors={[c1, c2]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(client.nom)}</Text>
        </LinearGradient>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {client.nom}
          </Text>
          <Text style={styles.phone} numberOfLines={1}>
            {client.telephone}
          </Text>
          {metaCount > 0 ? (
            <View style={styles.metaRow}>
              {hasEmail ? (
                <View style={styles.metaChip}>
                  <Ionicons name="mail" size={11} color={theme.primary} />
                </View>
              ) : null}
              {hasAdresse ? (
                <View style={styles.metaChip}>
                  <Ionicons name="location" size={11} color={theme.primary} />
                </View>
              ) : null}
              {client.matriculeFiscale ? (
                <Text style={styles.metaMf}>MF</Text>
              ) : null}
              {hasNotes ? (
                <View style={styles.metaChip}>
                  <Ionicons name="document-text" size={11} color={theme.textMuted} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  cardPressed: {
    backgroundColor: theme.surfaceMuted,
    borderColor: theme.primary + '55',
  },
  accent: {
    width: 4,
    backgroundColor: theme.primary,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingRight: 12,
    paddingLeft: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 19, fontWeight: '800', color: '#fff' },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.2,
  },
  phone: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaMf: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.primaryDark,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  chevronWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
