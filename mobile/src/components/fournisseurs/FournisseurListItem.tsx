import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { Fournisseur } from '../../types/fournisseur'

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
  fournisseur: Fournisseur
  onPress: () => void
}

export default function FournisseurListItem({ fournisseur, onPress }: Props) {
  const [c1, c2] = avatarGradient(fournisseur.nom)
  const hasEmail = !!fournisseur.email?.trim()
  const hasAdresse = !!fournisseur.adresse?.trim()
  const hasContact = !!fournisseur.contact?.trim()
  const hasNotes = !!fournisseur.notes?.trim()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Fournisseur ${fournisseur.nom}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <LinearGradient colors={[c1, c2]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initial(fournisseur.nom)}</Text>
        </LinearGradient>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {fournisseur.nom}
          </Text>
          <View style={styles.phoneRow}>
            <Ionicons name="call" size={12} color={theme.primary} />
            <Text style={styles.phone} numberOfLines={1}>
              {fournisseur.telephone}
            </Text>
          </View>
          {(hasEmail || hasAdresse || hasContact || hasNotes) ? (
            <View style={styles.metaRow}>
              {hasContact ? (
                <View style={styles.metaChip}>
                  <Ionicons name="person" size={11} color={theme.primaryDark} />
                  <Text style={styles.metaChipText} numberOfLines={1}>
                    {fournisseur.contact}
                  </Text>
                </View>
              ) : null}
              {hasEmail ? (
                <View style={styles.metaChipIcon}>
                  <Ionicons name="mail" size={11} color={theme.primaryDark} />
                </View>
              ) : null}
              {hasAdresse ? (
                <View style={styles.metaChipIcon}>
                  <Ionicons name="location" size={11} color={theme.primaryDark} />
                </View>
              ) : null}
              {hasNotes ? (
                <View style={styles.metaChipIcon}>
                  <Ionicons name="document-text" size={11} color={theme.textMuted} />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
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
  name: { fontSize: 16, fontWeight: '800', color: theme.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  phone: { fontSize: 14, fontWeight: '600', color: theme.primaryDark },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
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
  metaChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
