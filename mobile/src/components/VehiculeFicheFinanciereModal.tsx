import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FullScreenBlurModal from './ui/FullScreenBlurModal'
import { getStatusBarInset } from '../lib/safeArea'
import {
  createDepense,
  createDepenseFromStock,
  deleteDepense,
  fetchFicheFinanciere,
  fetchStockProduits,
  patchFicheFinanciereAvance,
  updateDepense,
  type StockProduit,
} from '../lib/vehiculeApi'
import type { Vehicule, VehiculeDepenseLigne, VehiculeFicheFinanciere } from '../types/vehicule'

function parseMontant(raw: string): number {
  const n = parseFloat(raw.replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function formatDt(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`
}

type Props = {
  visible: boolean
  vehicule: Vehicule | null
  accessToken: string
  canEdit: boolean
  onClose: () => void
}

export default function VehiculeFicheFinanciereModal({
  visible,
  vehicule,
  accessToken,
  canEdit,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [fiche, setFiche] = useState<VehiculeFicheFinanciere | null>(null)
  const [avanceInput, setAvanceInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [savingAvance, setSavingAvance] = useState(false)
  const [newLibelle, setNewLibelle] = useState('')
  const [newMontant, setNewMontant] = useState('')
  const [adding, setAdding] = useState(false)
  const [produits, setProduits] = useState<StockProduit[]>([])
  const [stockProductId, setStockProductId] = useState<number | null>(null)
  const [stockQuantite, setStockQuantite] = useState('1')
  const [addingStock, setAddingStock] = useState(false)
  const [showStockPicker, setShowStockPicker] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLibelle, setEditLibelle] = useState('')
  const [editMontant, setEditMontant] = useState('')

  const load = useCallback(async () => {
    if (!vehicule) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFicheFinanciere(accessToken, vehicule.id)
      setFiche(data)
      setAvanceInput(String(data.avance_client ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible')
      setFiche(null)
    } finally {
      setLoading(false)
    }
  }, [vehicule, accessToken])

  useEffect(() => {
    if (visible && vehicule) {
      void load()
      if (canEdit) {
        void fetchStockProduits(accessToken)
          .then(setProduits)
          .catch(() => setProduits([]))
      }
    }
    if (!visible) {
      setFiche(null)
      setEditingId(null)
      setNewLibelle('')
      setNewMontant('')
      setError(null)
      setStockProductId(null)
      setShowStockPicker(false)
    }
  }, [visible, vehicule, load, canEdit, accessToken])

  const handleSaveAvance = async () => {
    if (!vehicule || !canEdit) return
    setSavingAvance(true)
    setError(null)
    try {
      const data = await patchFicheFinanciereAvance(
        accessToken,
        vehicule.id,
        parseMontant(avanceInput)
      )
      setFiche(data)
      setAvanceInput(String(data.avance_client ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSavingAvance(false)
    }
  }

  const handleAdd = async () => {
    if (!vehicule || !canEdit) return
    const lib = newLibelle.trim()
    const m = parseMontant(newMontant)
    if (!lib) {
      setError('Indiquez une description de dépense.')
      return
    }
    setAdding(true)
    setError(null)
    try {
      await createDepense(accessToken, vehicule.id, lib, m)
      setNewLibelle('')
      setNewMontant('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajout impossible')
    } finally {
      setAdding(false)
    }
  }

  const saveEdit = async () => {
    if (!vehicule || editingId == null || !canEdit) return
    const lib = editLibelle.trim()
    const m = parseMontant(editMontant)
    if (!lib) {
      setError('Description requise.')
      return
    }
    setError(null)
    try {
      await updateDepense(accessToken, vehicule.id, editingId, lib, m)
      setEditingId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible')
    }
  }

  const handleAddFromStock = async () => {
    if (!vehicule || !canEdit || stockProductId == null) return
    const q = Math.max(1, Math.floor(parseFloat(stockQuantite.replace(',', '.')) || 0))
    const p = produits.find((x) => x.id === stockProductId)
    if (p && p.quantite < q) {
      setError('Stock insuffisant.')
      return
    }
    setAddingStock(true)
    setError(null)
    try {
      await createDepenseFromStock(accessToken, vehicule.id, stockProductId, q)
      setStockProductId(null)
      setStockQuantite('1')
      const refreshed = await fetchStockProduits(accessToken)
      setProduits(refreshed)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sortie stock impossible')
    } finally {
      setAddingStock(false)
    }
  }

  const handleDelete = (l: VehiculeDepenseLigne) => {
    if (!vehicule || !canEdit) return
    const fromStock = l.product_id != null && l.product_id > 0
    Alert.alert(
      'Supprimer',
      fromStock
        ? 'Supprimer cette ligne ? La quantité sera réintégrée au stock.'
        : 'Supprimer cette ligne de dépense ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteDepense(accessToken, vehicule.id, l.id)
                if (fromStock) {
                  const refreshed = await fetchStockProduits(accessToken)
                  setProduits(refreshed)
                }
                await load()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Suppression impossible')
              }
            })()
          },
        },
      ]
    )
  }

  if (!vehicule) return null

  const total = fiche?.total ?? 0
  const reste = total - parseMontant(avanceInput)
  const inset = getStatusBarInset()

  return (
    <FullScreenBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.root, { paddingTop: inset }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Fiche financière</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {vehicule.modele}
              {vehicule.immatriculation ? ` · ${vehicule.immatriculation}` : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={26} color="#374151" />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading && !fiche ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#f97316" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total dépenses</Text>
                <Text style={styles.totalValue}>{formatDt(total)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Avance client</Text>
                {canEdit ? (
                  <View style={styles.avanceRow}>
                    <TextInput
                      style={styles.avanceInput}
                      value={avanceInput}
                      onChangeText={setAvanceInput}
                      keyboardType="decimal-pad"
                    />
                    <Pressable
                      style={[styles.saveAvanceBtn, savingAvance && styles.btnDisabled]}
                      disabled={savingAvance}
                      onPress={() => void handleSaveAvance()}
                    >
                      <Text style={styles.saveAvanceText}>OK</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.totalValue}>{formatDt(fiche?.avance_client ?? 0)}</Text>
                )}
              </View>
              <View style={[styles.totalRow, styles.resteRow]}>
                <Text style={styles.resteLabel}>Reste à payer</Text>
                <Text style={styles.resteValue}>{formatDt(reste)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Dépenses</Text>
            {(fiche?.lignes ?? []).map((l) => {
              const fromStock = l.product_id != null && l.product_id > 0
              const editing = editingId === l.id
              return (
                <View key={l.id} style={styles.ligneCard}>
                  {editing && canEdit && !fromStock ? (
                    <>
                      <TextInput
                        style={styles.input}
                        value={editLibelle}
                        onChangeText={setEditLibelle}
                        placeholder="Libellé"
                      />
                      <TextInput
                        style={styles.input}
                        value={editMontant}
                        onChangeText={setEditMontant}
                        keyboardType="decimal-pad"
                        placeholder="Montant"
                      />
                      <View style={styles.ligneActions}>
                        <Pressable style={styles.btnSm} onPress={() => void saveEdit()}>
                          <Text style={styles.btnSmTextPrimary}>Enregistrer</Text>
                        </Pressable>
                        <Pressable
                          style={styles.btnSm}
                          onPress={() => setEditingId(null)}
                        >
                          <Text style={styles.btnSmText}>Annuler</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.ligneLibelle}>{l.libelle}</Text>
                      <View style={styles.ligneBottom}>
                        <Text style={styles.ligneMontant}>{formatDt(l.montant)}</Text>
                        {canEdit ? (
                          <View style={styles.ligneIconRow}>
                            {!fromStock ? (
                              <Pressable
                                hitSlop={6}
                                onPress={() => {
                                  setEditingId(l.id)
                                  setEditLibelle(l.libelle)
                                  setEditMontant(String(l.montant))
                                }}
                              >
                                <Ionicons name="pencil" size={18} color="#6b7280" />
                              </Pressable>
                            ) : null}
                            <Pressable hitSlop={6} onPress={() => handleDelete(l)}>
                              <Ionicons name="trash-outline" size={18} color="#dc2626" />
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </>
                  )}
                </View>
              )
            })}

            {canEdit ? (
              <View style={styles.addBlock}>
                <Text style={styles.sectionTitle}>Ajouter une dépense</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  value={newLibelle}
                  onChangeText={setNewLibelle}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Montant (DT)"
                  value={newMontant}
                  onChangeText={setNewMontant}
                  keyboardType="decimal-pad"
                />
                <Pressable
                  style={[styles.addBtn, adding && styles.btnDisabled]}
                  disabled={adding}
                  onPress={() => void handleAdd()}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addBtnText}>Ajouter</Text>
                </Pressable>

                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Sortie stock</Text>
                <Pressable
                  style={styles.stockSelect}
                  onPress={() => setShowStockPicker(!showStockPicker)}
                >
                  <Text style={styles.stockSelectText} numberOfLines={1}>
                    {stockProductId
                      ? produits.find((p) => p.id === stockProductId)?.nom ?? 'Produit'
                      : 'Choisir un produit'}
                  </Text>
                  <Ionicons
                    name={showStockPicker ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#6b7280"
                  />
                </Pressable>
                {showStockPicker ? (
                  <View style={styles.stockList}>
                    {produits.slice(0, 40).map((p) => (
                      <Pressable
                        key={p.id}
                        style={[
                          styles.stockItem,
                          stockProductId === p.id && styles.stockItemActive,
                        ]}
                        onPress={() => {
                          setStockProductId(p.id)
                          setShowStockPicker(false)
                        }}
                      >
                        <Text style={styles.stockItemText} numberOfLines={1}>
                          {p.nom} (stock: {p.quantite})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  style={styles.input}
                  placeholder="Quantité"
                  value={stockQuantite}
                  onChangeText={setStockQuantite}
                  keyboardType="number-pad"
                />
                <Pressable
                  style={[styles.addBtnOutline, addingStock && styles.btnDisabled]}
                  disabled={addingStock || stockProductId == null}
                  onPress={() => void handleAddFromStock()}
                >
                  <Ionicons name="cube-outline" size={18} color="#059669" />
                  <Text style={styles.addBtnOutlineText}>Sortie stock</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>
    </FullScreenBlurModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4 },
  errorBox: {
    margin: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#b91c1c', fontSize: 13 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 12, paddingBottom: 32 },
  totalsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: { color: '#94a3b8', fontSize: 13 },
  totalValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
  avanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avanceInput: {
    minWidth: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#111827',
  },
  saveAvanceBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveAvanceText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  resteRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginBottom: 0,
  },
  resteLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  resteValue: { color: '#fbbf24', fontSize: 20, fontWeight: '800' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ligneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  ligneLibelle: { fontSize: 14, color: '#111827', fontWeight: '500' },
  ligneBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  ligneMontant: { fontSize: 15, fontWeight: '700', color: '#059669' },
  ligneIconRow: { flexDirection: 'row', gap: 12 },
  ligneActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  btnSm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  btnSmText: { fontSize: 13, color: '#374151' },
  btnSmTextPrimary: { fontSize: 13, color: '#ea580c', fontWeight: '700' },
  addBlock: { marginTop: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  addBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  addBtnOutlineText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  stockSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  stockSelectText: { flex: 1, fontSize: 14, color: '#374151' },
  stockList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    maxHeight: 160,
  },
  stockItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stockItemActive: { backgroundColor: '#fff7ed' },
  stockItemText: { fontSize: 13, color: '#374151' },
})
