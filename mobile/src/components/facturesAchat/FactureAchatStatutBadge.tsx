import { StyleSheet, Text, View } from 'react-native'
import { FACTURE_ACHAT_STATUT_LABELS, type FactureAchatStatut } from '../../types/factureAchat'
import { STATUT_COLORS } from '../../lib/factureAchatHelpers'

type Props = {
  statut: FactureAchatStatut
  compact?: boolean
  dotOnly?: boolean
}

export default function FactureAchatStatutBadge({ statut, compact, dotOnly }: Props) {
  const c = STATUT_COLORS[statut]

  if (dotOnly) {
    return <View style={[styles.dot, { backgroundColor: c.dot }]} />
  }

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, compact && styles.compact]}>
      <View style={[styles.dotInline, { backgroundColor: c.dot }]} />
      <Text style={[styles.text, { color: c.text }, compact && styles.textCompact]}>
        {FACTURE_ACHAT_STATUT_LABELS[statut]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotInline: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: '600' },
  textCompact: { fontSize: 11 },
})
