import { StyleSheet, Text, View } from 'react-native'
import { DEMANDE_DEVIS_STATUT_LABELS, type DemandeDevisStatut } from '../../types/demandeDevis'
import { STATUT_COLORS } from '../../lib/demandeDevisHelpers'

type Props = {
  statut: DemandeDevisStatut
  compact?: boolean
}

export default function DevisStatutBadge({ statut, compact }: Props) {
  const c = STATUT_COLORS[statut]
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }, compact && styles.compact]}>
      <Text style={[styles.text, { color: c.text }, compact && styles.textCompact]}>
        {DEMANDE_DEVIS_STATUT_LABELS[statut]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
  textCompact: { fontSize: 10 },
})
