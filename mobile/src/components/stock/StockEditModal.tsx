import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { updateProduit } from '../../lib/produitApi'
import { theme } from '../../theme/appTheme'
import { PRODUIT_CATEGORIES_PRESET, type ProduitStock } from '../../types/produitStock'

type Props = {
  visible: boolean
  produit: ProduitStock | null
  accessToken: string
  onClose: () => void
  onSaved: (p: ProduitStock) => void
  onDelete?: () => void
}

export default function StockEditModal({
  visible,
  produit,
  accessToken,
  onClose,
  onSaved,
  onDelete,
}: Props) {
  const [nom, setNom] = useState('')
  const [categorie, setCategorie] = useState('')
  const [quantite, setQuantite] = useState('0')
  const [valeur, setValeur] = useState('0')
  const [saving, setSaving] = useState(false)
  const lastUnitRef = useRef(0)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.72, 480)

  useEffect(() => {
    if (!visible || !produit) return
    const q = produit.quantite ?? 0
    const v = produit.valeurAchatTTC ?? 0
    if (q > 0 && v > 0) lastUnitRef.current = v / q
    else lastUnitRef.current = produit.dernierPrixUnitaireTTC ?? 0
    setNom(produit.nom)
    setCategorie(produit.categorie ?? '')
    setQuantite(String(q))
    setValeur(String(v))
  }, [visible, produit])

  const setQty = (raw: string) => {
    const newQty = Math.max(0, parseInt(raw, 10) || 0)
    setQuantite(String(newQty))
    const oldQty = parseInt(quantite, 10) || 0
    const oldVal = parseFloat(valeur.replace(',', '.')) || 0
    if (newQty === 0) {
      if (oldQty > 0 && oldVal > 0) lastUnitRef.current = oldVal / oldQty
      setValeur('0')
      return
    }
    let unit = 0
    if (oldQty > 0 && oldVal > 0) {
      unit = oldVal / oldQty
      lastUnitRef.current = unit
    } else {
      unit = lastUnitRef.current
    }
    const newTotal = unit > 0 ? Math.round(unit * newQty * 100) / 100 : 0
    setValeur(String(newTotal))
  }

  const submit = async () => {
    if (!produit || !nom.trim()) return
    setSaving(true)
    try {
      const updated = await updateProduit(accessToken, produit.id, {
        nom: nom.trim(),
        categorie: categorie.trim() || undefined,
        quantite: parseInt(quantite, 10) || 0,
        valeurAchatTTC: parseFloat(valeur.replace(',', '.')) || 0,
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  if (!produit) return null

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { height: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <Text style={styles.title}>Modifier le produit</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Nom</Text>
          <TextInput style={styles.input} value={nom} onChangeText={setNom} />
          <Text style={styles.label}>Catégorie</Text>
          <TextInput
            style={styles.input}
            value={categorie}
            onChangeText={setCategorie}
            placeholder="Huiles, Pièces…"
          />
          <View style={styles.chips}>
            {PRODUIT_CATEGORIES_PRESET.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, categorie === c && styles.chipActive]}
                onPress={() => setCategorie(c)}
              >
                <Text style={[styles.chipText, categorie === c && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row2}>
            <View style={styles.half}>
              <Text style={styles.label}>Quantité</Text>
              <TextInput
                style={styles.input}
                value={quantite}
                onChangeText={setQty}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Valeur totale (DT)</Text>
              <TextInput
                style={styles.input}
                value={valeur}
                onChangeText={setValeur}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          {onDelete ? (
            <Pressable style={styles.deleteBtn} onPress={onDelete} disabled={saving}>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </Pressable>
          ) : null}
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={() => void submit()} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  scroll: { padding: 16, paddingBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  chipActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: theme.primaryDark, fontWeight: '800' },
  row2: { flexDirection: 'row', gap: 12, marginTop: 4 },
  half: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.danger + '44',
    backgroundColor: theme.dangerSoft,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: { fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  saveText: { color: '#fff', fontWeight: '800' },
})
