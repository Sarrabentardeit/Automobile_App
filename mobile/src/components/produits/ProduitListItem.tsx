import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import {
  HUILE_TYPE_STYLES,
  formatTnd,
  isHuilesCategorieStock,
  isProduitAlert,
  normalizeFluideTypeForCategorie,
  type ProduitStock,
} from '../../types/produitStock'

type Props = {
  produit: ProduitStock
  onPress: () => void
}

export default function ProduitListItem({ produit, onPress }: Props) {
  const huile = isHuilesCategorieStock(produit.categorie) || !!produit.fluideType
  const ft = normalizeFluideTypeForCategorie(produit.categorie, produit.fluideType)
  const fluideStyle = HUILE_TYPE_STYLES[ft]
  const alert = isProduitAlert(produit)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        theme.shadow.sm,
        alert && styles.cardAlert,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.accent, alert && styles.accentAlert]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.badges}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{produit.categorie?.trim() || '—'}</Text>
            </View>
            {huile ? (
              <View
                style={[
                  styles.fluideBadge,
                  { backgroundColor: fluideStyle.bg, borderColor: fluideStyle.border },
                ]}
              >
                <Text style={[styles.fluideText, { color: fluideStyle.text }]}>
                  {fluideStyle.label}
                </Text>
              </View>
            ) : null}
            {alert ? (
              <View style={styles.alertBadge}>
                <Ionicons name="warning" size={12} color="#92400e" />
                <Text style={styles.alertText}>Stock bas</Text>
              </View>
            ) : null}
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {produit.nom}
        </Text>
        <Text style={styles.ref}>Réf. {produit.reference || '—'}</Text>

        <View style={styles.bottomRow}>
          <View style={styles.qtyBlock}>
            <Text style={styles.qty}>{produit.quantite}</Text>
            <Text style={styles.unite}>{produit.unite ?? 'unité'}</Text>
            {produit.seuilAlerte != null ? (
              <Text style={styles.seuil}>Seuil {produit.seuilAlerte}</Text>
            ) : null}
          </View>
          <View style={styles.priceBlock}>
            {produit.prixVente != null ? (
              <Text style={styles.prixVente}>
                {formatTnd(produit.prixVente)} DT / {produit.unite ?? 'u.'}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
          </View>
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
  cardAlert: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  cardPressed: { opacity: 0.92 },
  accent: { width: 4, backgroundColor: theme.primary },
  accentAlert: { backgroundColor: '#f59e0b' },
  body: { flex: 1, padding: 14 },
  topRow: { marginBottom: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catBadge: {
    backgroundColor: theme.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  catText: { fontSize: 10, fontWeight: '700', color: theme.textSecondary },
  fluideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  fluideText: { fontSize: 10, fontWeight: '700' },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertText: { fontSize: 10, fontWeight: '700', color: '#92400e' },
  name: { fontSize: 16, fontWeight: '700', color: theme.text },
  ref: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  qtyBlock: { alignItems: 'flex-start' },
  qty: { fontSize: 26, fontWeight: '800', color: theme.text, lineHeight: 28 },
  unite: { fontSize: 12, color: theme.textMuted },
  seuil: { fontSize: 11, color: theme.textSubtle, marginTop: 2 },
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prixVente: { fontSize: 12, fontWeight: '600', color: theme.primary, textAlign: 'right' },
})
