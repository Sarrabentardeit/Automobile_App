import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { createProduit, updateProduit } from '../lib/produitApi'
import { getStatusBarInset } from '../lib/safeArea'
import { theme } from '../theme/appTheme'
import {
  HUILE_TYPE_STYLES,
  buildProduitPayload,
  calcPrixVenteDepuisMarge,
  emptyProduitForm,
  fluideTypesForCategorieProduit,
  formatTnd,
  isHuilesCategorieStock,
  modalCategoryOptions,
  produitToForm,
  type HuileType,
  type ProduitFormState,
  type ProduitStock,
} from '../types/produitStock'

type Props = {
  visible: boolean
  produit: ProduitStock | null
  categoriesFromData: string[]
  accessToken: string
  onClose: () => void
  onSaved: () => void
}

function parseNum(text: string): number | undefined {
  if (text.trim() === '') return undefined
  const n = Number(text.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function NumInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string
  value: number | undefined
  onChangeText: (v: number | undefined) => void
  placeholder?: string
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value === undefined ? '' : String(value)}
        onChangeText={(t) => onChangeText(parseNum(t))}
        placeholder={placeholder}
        placeholderTextColor={theme.textSubtle}
        keyboardType="decimal-pad"
      />
    </View>
  )
}

export default function ProduitFormModal({
  visible,
  produit,
  categoriesFromData,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!produit
  const [form, setForm] = useState<ProduitFormState>(emptyProduitForm())
  const [useCustomCat, setUseCustomCat] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const topInset = getStatusBarInset()
  const bottomInset = Platform.OS === 'ios' ? 28 : 16

  const catOptions = useMemo(
    () => modalCategoryOptions(categoriesFromData),
    [categoriesFromData]
  )

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (produit) {
      const f = produitToForm(produit)
      setForm(f)
      const trim = f.categorie.trim()
      setUseCustomCat(trim.length > 0 && !catOptions.includes(trim))
    } else {
      setForm(emptyProduitForm())
      setUseCustomCat(false)
    }
  }, [visible, produit, catOptions])

  const huileForm = isHuilesCategorieStock(form.categorie)
  const fluideTypeKeys = useMemo(
    () => fluideTypesForCategorieProduit(form.categorie),
    [form.categorie]
  )

  useEffect(() => {
    if (!huileForm || !visible) return
    const allowed = fluideTypesForCategorieProduit(form.categorie)
    setForm((f) => {
      if (allowed.includes(f.fluideType)) return f
      return { ...f, fluideType: allowed[0] ?? 'moteur' }
    })
  }, [form.categorie, huileForm, visible])

  const paNum = form.prixAchatUnitaire ?? 0
  const margeNum = form.margeVentePct ?? 0
  const prixVenteCalcule = paNum > 0 ? calcPrixVenteDepuisMarge(paNum, margeNum) : null
  const valeurStockDepuisPa =
    paNum > 0 && form.quantite > 0 ? Math.round(paNum * form.quantite * 100) / 100 : null

  const set = <K extends keyof ProduitFormState>(k: K, v: ProduitFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const selectCategory = (cat: string) => {
    setUseCustomCat(false)
    setForm((f) => {
      const next = { ...f, categorie: cat }
      if (isHuilesCategorieStock(cat)) {
        const allowed = fluideTypesForCategorieProduit(cat)
        if (!allowed.includes(f.fluideType)) next.fluideType = allowed[0] ?? 'moteur'
      }
      return next
    })
  }

  const submit = async () => {
    if (!form.nom.trim()) {
      setError('Le nom du produit est requis.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const payload = buildProduitPayload(form)
      if (isEdit && produit) {
        await updateProduit(accessToken, produit.id, payload)
      } else {
        await createProduit(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: topInset }}>
          <View style={styles.screenAccent} />
          <View style={styles.header}>
            <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.headerBanner}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name={isEdit ? 'create' : 'cube'}
                  size={22}
                  color={theme.primary}
                />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
                </Text>
                <Text style={styles.sub}>
                  {huileForm
                    ? 'Huiles ou liquides — champs adaptés'
                    : 'Catalogue — même inventaire que le stock général'}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </LinearGradient>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHead}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipsRow}>
                {catOptions.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.chip,
                      !useCustomCat && form.categorie === c && styles.chipActive,
                    ]}
                    onPress={() => selectCategory(c)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !useCustomCat && form.categorie === c && styles.chipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[styles.chip, useCustomCat && styles.chipActive]}
                  onPress={() => {
                    setUseCustomCat(true)
                    setForm((f) => ({ ...f, categorie: '' }))
                  }}
                >
                  <Text style={[styles.chipText, useCustomCat && styles.chipTextActive]}>
                    Autre
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
            {useCustomCat ? (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={form.categorie}
                onChangeText={(v) => set('categorie', v)}
                placeholder="Nom de la catégorie"
                placeholderTextColor={theme.textSubtle}
              />
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHead}>Identité</Text>
            <View style={styles.field}>
              <Text style={styles.label}>
                Nom du produit <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.nom}
                onChangeText={(v) => set('nom', v)}
                placeholder="Ex. Rotule AV, 5W30…"
                placeholderTextColor={theme.textSubtle}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Référence</Text>
              <TextInput
                style={styles.input}
                value={form.reference}
                onChangeText={(v) => set('reference', v)}
                placeholder="Réf. fournisseur ou interne"
                placeholderTextColor={theme.textSubtle}
              />
            </View>
            <View style={styles.row2}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Quantité en stock</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.quantite)}
                  onChangeText={(t) => set('quantite', Math.max(0, parseNum(t) ?? 0))}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Unité</Text>
                <TextInput
                  style={styles.input}
                  value={form.unite}
                  onChangeText={(v) => set('unite', v)}
                  placeholder="L, pièce…"
                  placeholderTextColor={theme.textSubtle}
                />
              </View>
            </View>
          </View>

          {huileForm ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHead}>Type de fluide</Text>
              <View style={styles.chipsWrap}>
                {fluideTypeKeys.map((t) => (
                  <Pressable
                    key={t}
                    style={[styles.chip, form.fluideType === t && styles.chipActive]}
                    onPress={() => set('fluideType', t as HuileType)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.fluideType === t && styles.chipTextActive,
                      ]}
                    >
                      {HUILE_TYPE_STYLES[t].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionHead}>Tarification</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <NumInput
                  label="Prix d'achat unitaire (TND)"
                  value={form.prixAchatUnitaire}
                  onChangeText={(v) => set('prixAchatUnitaire', v)}
                  placeholder="Manuel"
                />
              </View>
              <View style={{ flex: 1 }}>
                <NumInput
                  label="Marge (%)"
                  value={form.margeVentePct}
                  onChangeText={(v) => set('margeVentePct', v)}
                  placeholder="Manuel"
                />
              </View>
            </View>

            {prixVenteCalcule != null ? (
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Prix de vente (calculé)</Text>
                <Text style={styles.calcValue}>
                  {formatTnd(prixVenteCalcule)} DT / {form.unite?.trim() || 'unité'}
                </Text>
                <Text style={styles.calcHint}>Prix d'achat × (1 + marge ÷ 100)</Text>
              </View>
            ) : null}

            {paNum <= 0 ? (
              huileForm ? (
                <>
                  <NumInput
                    label="Prix unitaire de vente (DT)"
                    value={form.prixVente}
                    onChangeText={(v) => set('prixVente', v)}
                  />
                  <Text style={styles.hint}>
                    Valeur stock estimée :{' '}
                    {formatTnd((form.prixVente ?? 0) * form.quantite)} TND (qté × prix vente)
                  </Text>
                </>
              ) : (
                <>
                  <NumInput
                    label="Valeur totale du stock (TND)"
                    value={form.valeurAchatTTC}
                    onChangeText={(v) => set('valeurAchatTTC', v ?? 0)}
                  />
                  <NumInput
                    label="Prix de vente conseillé (DT)"
                    value={form.prixVente}
                    onChangeText={(v) => set('prixVente', v)}
                    placeholder="Optionnel"
                  />
                </>
              )
            ) : (
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Valeur totale du stock (TND)</Text>
                <Text style={styles.infoValue}>
                  {valeurStockDepuisPa != null ? formatTnd(valeurStockDepuisPa) : '—'}
                </Text>
                <Text style={styles.hint}>(quantité × prix d'achat)</Text>
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <NumInput
              label="Seuil d'alerte stock bas (optionnel)"
              value={form.seuilAlerte}
              onChangeText={(v) => set('seuilAlerte', v)}
            />
          </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: bottomInset }]}>
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveDisabled,
              pressed && !saving && styles.pressed,
            ]}
            disabled={saving || !form.nom.trim()}
            onPress={() => void submit()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#fff" />
            )}
            <Text style={styles.saveText}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.surface },
  screenAccent: { height: 3, backgroundColor: theme.primary },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.primary + '28',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  sectionHead: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
  required: { color: theme.primary, fontWeight: '800' },
  input: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  row2: { flexDirection: 'row', gap: 10 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  chipTextActive: { color: theme.primaryDark, fontWeight: '800' },
  calcBox: {
    backgroundColor: '#fff7ed',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#fed7aa',
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  calcLabel: { fontSize: 11, fontWeight: '700', color: '#9a3412' },
  calcValue: { fontSize: 18, fontWeight: '800', color: '#7c2d12', marginTop: 4 },
  calcHint: { fontSize: 11, color: '#9a3412', marginTop: 4 },
  infoBox: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginTop: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted },
  infoValue: { fontSize: 17, fontWeight: '800', color: theme.text, marginTop: 4 },
  hint: { fontSize: 11, color: theme.textMuted, marginTop: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.dangerSoft,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.danger + '25',
  },
  errorText: { flex: 1, color: theme.danger, fontSize: 13, fontWeight: '600' },
  footerBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  saveDisabled: { opacity: 0.65 },
  pressed: { opacity: 0.9 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
