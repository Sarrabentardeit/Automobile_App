import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDate } from '../../lib/format'
import { formatMontant } from '../../lib/formatMoney'
import { factureResteTTC, factureTotalTTC, STATUT_COLORS } from '../../lib/factureVenteHelpers'
import { FACTURE_STATUT_LABELS } from '../../types/factureVente'
import { theme } from '../../theme/appTheme'
import type { FactureVente } from '../../types/factureVente'

type Props = {
  facture: FactureVente
  onPress: () => void
}

export default function FactureVenteListItem({ facture, onPress }: Props) {
  const total = factureTotalTTC(facture.lignes, facture.timbre)
  const reste =
    facture.statut === 'envoyee' || facture.statut === 'partiellement_payee'
      ? factureResteTTC(facture)
      : null
  const dot = STATUT_COLORS[facture.statut].dot
  const statutText = STATUT_COLORS[facture.statut].text

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Facture ${facture.numero}`}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <View style={styles.main}>
          <View style={styles.top}>
            <Text style={styles.numero} numberOfLines={1}>
              {facture.numero}
            </Text>
            <Text style={styles.amount}>{formatMontant(total)}</Text>
          </View>
          <Text style={styles.client} numberOfLines={1}>
            {facture.clientNom}
          </Text>
          <View style={styles.bottom}>
            <Text style={styles.meta}>{formatDate(facture.date)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[styles.meta, { color: statutText }]}>
              {FACTURE_STATUT_LABELS[facture.statut]}
            </Text>
            {reste != null && reste > 0.01 ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.reste}>Reste {formatMontant(reste)}</Text>
              </>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  pressed: { backgroundColor: theme.primarySoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 2 },
  main: { flex: 1, gap: 3 },
  top: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  numero: { fontSize: 15, fontWeight: '600', color: theme.text, flex: 1 },
  amount: { fontSize: 15, fontWeight: '600', color: theme.primaryDark },
  client: { fontSize: 14, color: theme.textMuted, fontWeight: '400' },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 2 },
  meta: { fontSize: 12, color: theme.textSubtle },
  metaDot: { fontSize: 12, color: theme.border },
  reste: { fontSize: 12, color: theme.primaryDark, fontWeight: '500' },
})
