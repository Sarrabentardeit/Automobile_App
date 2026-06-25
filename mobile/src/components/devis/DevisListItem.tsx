import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDate } from '../../lib/format'
import { formatMontant } from '../../lib/formatMoney'
import { theme } from '../../theme/appTheme'
import type { DemandeDevis } from '../../types/demandeDevis'
import DevisStatutBadge from './DevisStatutBadge'

type Props = {
  demande: DemandeDevis
  onPress: () => void
}

export default function DevisListItem({ demande, onPress }: Props) {
  const hasMontant = demande.montantEstime != null && demande.montantEstime > 0
  const hasVehicle = !!demande.vehicleRef?.trim()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, theme.shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Devis ${demande.clientName}`}
    >
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text" size={22} color={theme.primary} />
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {demande.clientName}
            </Text>
            <DevisStatutBadge statut={demande.statut} compact />
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {demande.description}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={theme.primary} />
              <Text style={styles.metaText}>{formatDate(demande.date)}</Text>
            </View>
            {hasVehicle ? (
              <View style={styles.metaChip}>
                <Ionicons name="car-outline" size={11} color={theme.primary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {demande.vehicleRef}
                </Text>
              </View>
            ) : null}
            {hasMontant ? (
              <View style={styles.amountChip}>
                <Text style={styles.amountText}>{formatMontant(demande.montantEstime!)}</Text>
              </View>
            ) : null}
          </View>
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  clientName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: theme.text,
  },
  description: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.primarySoft,
    maxWidth: '48%',
  },
  metaText: { fontSize: 11, fontWeight: '600', color: theme.primaryDark },
  amountChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#d1fae5',
  },
  amountText: { fontSize: 11, fontWeight: '800', color: '#065f46' },
})
