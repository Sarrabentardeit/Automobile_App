import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
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

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
}) {
  const inner = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={4}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={18} color={theme.textSubtle} /> : null}
    </View>
  )
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.88 }}>
        {inner}
      </Pressable>
    )
  }
  return inner
}

type Props = {
  visible: boolean
  client: ClientAvecDette | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ClientDetteDetailSheet({
  visible,
  client,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!client) return null

  const [c1, c2] = avatarGradient(client.clientName)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 580)
  const tel = client.telephoneClient?.replace(/\s/g, '') ?? ''

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Détail créance</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {client.clientName}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <View style={styles.profile}>
            <LinearGradient colors={[c1, c2]} style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initial(client.clientName)}</Text>
            </LinearGradient>
            <Text style={styles.name}>{client.clientName}</Text>
            {client.designation?.trim() ? (
              <Text style={styles.designation} numberOfLines={2}>
                {client.designation}
              </Text>
            ) : null}
          </View>

          <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.amountCard}>
            <Text style={styles.amountLabel}>Reste à payer</Text>
            <Text style={styles.amountValue}>{formatMontant(client.reste)}</Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails</Text>
            {client.telephoneClient?.trim() ? (
              <InfoRow
                icon="call-outline"
                label="Téléphone / référence"
                value={client.telephoneClient}
                onPress={
                  /^\+?\d[\d\s-]{6,}$/.test(tel)
                    ? () => void Linking.openURL(`tel:${tel}`)
                    : undefined
                }
              />
            ) : null}
            {client.designation?.trim() ? (
              <InfoRow icon="briefcase-outline" label="Désignation" value={client.designation} />
            ) : null}
            {client.notes?.trim() ? (
              <InfoRow icon="document-text-outline" label="Notes" value={client.notes} />
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.footerBtn, styles.footerEdit, pressed && styles.pressed]}
            onPress={onEdit}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
            <Text style={styles.footerEditText}>Modifier</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.footerBtn, styles.footerDelete, pressed && styles.pressed]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
            <Text style={styles.footerDeleteText}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 16,
  },
  accent: { height: 3, backgroundColor: theme.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 8 },
  profile: { alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarLgText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center' },
  designation: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  amountCard: {
    borderRadius: theme.radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 12,
  },
  amountLabel: { fontSize: 12, fontWeight: '700', color: theme.primaryDark, textTransform: 'uppercase' },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  section: { gap: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: theme.text, lineHeight: 21 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
  },
  footerEdit: { backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: '#fed7aa' },
  footerEditText: { fontWeight: '700', color: theme.primaryDark },
  footerDelete: { backgroundColor: theme.dangerSoft, borderWidth: 1, borderColor: '#fecaca' },
  footerDeleteText: { fontWeight: '700', color: theme.danger },
  pressed: { opacity: 0.88 },
})
