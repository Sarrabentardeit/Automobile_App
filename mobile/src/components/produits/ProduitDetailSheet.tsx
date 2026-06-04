import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from '../ui/ModalBlurBackdrop'
import { getStatusBarInset } from '../../lib/safeArea'
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
  visible: boolean
  produit: ProduitStock | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && styles.rowAccent]}>{value}</Text>
    </View>
  )
}

export default function ProduitDetailSheet({
  visible,
  produit,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!produit) return null

  const huile = isHuilesCategorieStock(produit.categorie) || !!produit.fluideType
  const ft = normalizeFluideTypeForCategorie(produit.categorie, produit.fluideType)
  const fs = HUILE_TYPE_STYLES[ft]
  const alert = isProduitAlert(produit)
  const bottomPad = Math.max(20, getStatusBarInset() > 40 ? 12 : 20)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ModalBlurBackdrop onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
        <View style={styles.handle} />
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeFab}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.profile}>
            <View style={styles.iconLg}>
              <Ionicons name="cube" size={32} color={theme.primary} />
            </View>
            <Text style={styles.profileName}>{produit.nom}</Text>
            <View style={styles.badges}>
              <Text style={styles.catPill}>{produit.categorie?.trim() || '—'}</Text>
              {huile ? (
                <Text style={[styles.fluidePill, { color: fs.text }]}>{fs.label}</Text>
              ) : null}
              {alert ? (
                <View style={styles.alertPill}>
                  <Ionicons name="warning" size={12} color="#92400e" />
                  <Text style={styles.alertPillText}>Stock bas</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.qtyHero}>
            <Text style={styles.qtyValue}>{produit.quantite}</Text>
            <Text style={styles.qtyUnit}>{produit.unite ?? 'unité'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catalogue</Text>
            <View style={styles.sectionCard}>
              <Row label="Référence" value={produit.reference || '—'} />
              <View style={styles.divider} />
              <Row
                label="Prix de vente"
                value={
                  produit.prixVente != null
                    ? `${formatTnd(produit.prixVente)} DT / ${produit.unite ?? 'u.'}`
                    : '—'
                }
                accent={produit.prixVente != null}
              />
              {produit.prixAchatUnitaire != null ? (
                <>
                  <View style={styles.divider} />
                  <Row
                    label="Prix d'achat unitaire"
                    value={`${formatTnd(produit.prixAchatUnitaire)} DT`}
                  />
                </>
              ) : null}
              {produit.margeVentePct != null ? (
                <>
                  <View style={styles.divider} />
                  <Row label="Marge" value={`${formatTnd(produit.margeVentePct, 1)} %`} />
                </>
              ) : null}
              <View style={styles.divider} />
              <Row
                label="Valeur stock (TND)"
                value={formatTnd(produit.valeurAchatTTC)}
              />
              {produit.seuilAlerte != null ? (
                <>
                  <View style={styles.divider} />
                  <Row label="Seuil d'alerte" value={String(produit.seuilAlerte)} />
                </>
              ) : null}
            </View>
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
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 1,
    ...theme.shadow.sm,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginTop: 10,
  },
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 8 },
  profile: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  iconLg: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  catPill: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    backgroundColor: theme.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fluidePill: { fontSize: 12, fontWeight: '700' },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  alertPillText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  qtyHero: {
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  qtyValue: { fontSize: 40, fontWeight: '800', color: theme.text },
  qtyUnit: { fontSize: 14, color: theme.textMuted, marginTop: 2 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  rowLabel: { fontSize: 13, color: theme.textMuted, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'right' },
  rowAccent: { color: theme.primary },
  divider: { height: 1, backgroundColor: theme.borderLight, marginHorizontal: 14 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  footerEdit: {
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: theme.primary + '40',
  },
  footerEditText: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
  footerDelete: {
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: theme.danger + '30',
  },
  footerDeleteText: { fontSize: 15, fontWeight: '700', color: theme.danger },
  pressed: { opacity: 0.9 },
})
