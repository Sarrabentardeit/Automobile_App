import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import type { ProduitPlusVendu } from '../../lib/stockGeneralParity'

type Props = {
  items: ProduitPlusVendu[]
  expanded: boolean
  onToggle: () => void
}

export default function StockTopVendusCard({ items, expanded, onToggle }: Props) {
  if (items.length === 0) return null

  return (
    <View style={styles.card}>
      <Pressable style={styles.head} onPress={onToggle}>
        <View style={styles.headLeft}>
          <Ionicons name="trending-up" size={18} color="#059669" />
          <Text style={styles.title}>Top ventes ce mois</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.textMuted}
        />
      </Pressable>
      {expanded
        ? items.map((p, i) => (
            <View key={p.productId} style={styles.row}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <Text style={styles.nom} numberOfLines={1}>
                {p.nom}
              </Text>
              <Text style={styles.qte}>{p.qte}</Text>
            </View>
          ))
        : (
          <Pressable style={styles.preview} onPress={onToggle}>
            <Text style={styles.previewText} numberOfLines={1}>
              1. {items[0].nom} · {items[0].qte} vendus
              {items.length > 1 ? ` (+${items.length - 1})` : ''}
            </Text>
          </Pressable>
        )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: theme.text },
  preview: { paddingHorizontal: 14, paddingBottom: 14, marginTop: -6 },
  previewText: { fontSize: 12, color: theme.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11, fontWeight: '800', color: '#059669' },
  nom: { flex: 1, fontSize: 13, color: theme.text },
  qte: { fontSize: 13, fontWeight: '800', color: '#059669' },
})
