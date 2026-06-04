import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import { formatTnd, type ProduitStock } from '../../types/produitStock'
import { isStockEpuise, isStockFaible, prixUnitaireStockAffiche } from '../../lib/stockUtils'

type Props = {
  produit: ProduitStock
  onPress: () => void
}

const QTY_W = 56

export default function StockListItem({ produit, onPress }: Props) {
  const epuise = isStockEpuise(produit)
  const faible = isStockFaible(produit)
  const qte = produit.quantite ?? 0
  const unite = (produit.unite ?? 'unité').trim()
  const prixUnit = prixUnitaireStockAffiche(produit)
  const valeur = produit.valeurAchatTTC ?? 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, epuise && styles.cardEpuise, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text style={[styles.name, epuise && styles.nameEpuise]} numberOfLines={1}>
          {produit.nom}
        </Text>
        {produit.categorie?.trim() ? (
          <Text style={styles.cat} numberOfLines={1}>
            {produit.categorie}
          </Text>
        ) : null}
        <View style={styles.prices}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Prix/u</Text>
            <Text style={styles.priceVal}>{formatTnd(prixUnit)}</Text>
          </View>
          <View style={styles.priceSep} />
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Valeur</Text>
            <Text style={[styles.priceVal, styles.priceAccent]}>{formatTnd(valeur)}</Text>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.qtyPill,
          epuise && styles.qtyEpuise,
          faible && !epuise && styles.qtyFaible,
        ]}
      >
        {epuise ? (
          <Ionicons name="alert-circle" size={13} color="#dc2626" />
        ) : faible ? (
          <Ionicons name="warning" size={13} color="#b45309" />
        ) : null}
        <Text style={[styles.qtyText, epuise && styles.qtyTextEpuise, faible && !epuise && styles.qtyTextFaible]}>
          {qte}
        </Text>
        <Text style={styles.qtyUnit} numberOfLines={1}>
          {unite}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  cardEpuise: {
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    backgroundColor: '#fffbfb',
  },
  pressed: { opacity: 0.92 },
  left: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: theme.text },
  nameEpuise: { color: '#991b1b' },
  cat: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginTop: 2 },
  prices: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  priceCol: { minWidth: 0 },
  priceSep: { width: 1, height: 22, backgroundColor: theme.borderLight },
  priceLabel: { fontSize: 9, fontWeight: '700', color: theme.textSubtle, letterSpacing: 0.3 },
  priceVal: { fontSize: 12, fontWeight: '700', color: theme.text, marginTop: 2 },
  priceAccent: { color: theme.primaryDark },
  qtyPill: {
    width: QTY_W,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  qtyEpuise: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  qtyFaible: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  qtyText: { fontSize: 17, fontWeight: '800', color: theme.text, fontVariant: ['tabular-nums'] },
  qtyTextEpuise: { color: '#dc2626' },
  qtyTextFaible: { color: '#b45309' },
  qtyUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textMuted,
    textAlign: 'center',
    width: QTY_W - 8,
  },
})
