import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { formatMontant } from '../../lib/formatMoney'
import { theme } from '../../theme/appTheme'
import type { ClientAvecDette } from '../../types/clientDette'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function avatarGradient(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function initial(name: string): string {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

type Props = {
  client: ClientAvecDette
  onPress: () => void
}

export default function ClientDetteListItem({ client, onPress }: Props) {
  const [c1, c2] = avatarGradient(client.clientName)
  const hasPhone = !!client.telephoneClient?.trim()
  const hasNotes = !!client.notes?.trim()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Dette ${client.clientName}, ${formatMontant(client.reste)}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <LinearGradient colors={[c1, c2]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(client.clientName)}</Text>
        </LinearGradient>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {client.clientName}
            </Text>
            <View style={styles.amountPill}>
              <Text style={styles.amount}>{formatMontant(client.reste)}</Text>
            </View>
          </View>

          {client.designation?.trim() ? (
            <Text style={styles.designation} numberOfLines={1}>
              {client.designation}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {hasPhone ? (
              <View style={styles.metaChip}>
                <Ionicons name="call" size={11} color={theme.primary} />
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {client.telephoneClient}
                </Text>
              </View>
            ) : null}
            {hasNotes ? (
              <View style={styles.metaChipMuted}>
                <Ionicons name="document-text-outline" size={11} color={theme.textMuted} />
                <Text style={styles.metaChipMutedText}>Note</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} style={styles.chev} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  accent: { height: 3, backgroundColor: theme.primary },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingRight: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  info: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  amountPill: {
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  amount: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  designation: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  metaChipText: { fontSize: 11, fontWeight: '600', color: theme.primaryDark, flexShrink: 1 },
  metaChipMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  metaChipMutedText: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  chev: { marginLeft: 2 },
})
