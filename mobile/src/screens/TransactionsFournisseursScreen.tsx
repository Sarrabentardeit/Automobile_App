import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AppToast from '../components/ui/AppToast'
import CenteredBlurModal from '../components/ui/CenteredBlurModal'
import {
  addTransactionFournisseur,
  deleteTransactionFournisseur,
  fetchTransactionsFournisseurs,
} from '../lib/moneyApi'
import { getModalLayout } from '../lib/modalLayout'
import { theme } from '../theme/appTheme'
import type { TransactionFournisseur, TransactionFournisseurType } from '../types/money'

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

type TabType = TransactionFournisseurType | 'all'

const TAB_CONFIG: Record<Exclude<TabType, 'all'>, { label: string; icon: string; color: string }> = {
  achat:    { label: 'Achats',      icon: 'cube-outline',           color: '#d97706' },
  revenue:  { label: 'Revenus',     icon: 'arrow-down-circle-outline', color: '#059669' },
  paiement: { label: 'Paiements',   icon: 'card-outline',           color: '#dc2626' },
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT'
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function inPeriod(date: string, year: number, month: number) {
  const [y, m] = date.split('-').map(Number)
  return y === year && m === month
}

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function TransactionsFournisseursScreen({ accessToken, canViewFinance, drawerOpen = false }: Props) {
  const [transactions, setTransactions] = useState<TransactionFournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)
  const [tab, setTab] = useState<TabType>('achat')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Omit<TransactionFournisseur, 'id'>>({
    type: 'achat', date: todayISO(), montant: 0, fournisseur: '', vehicule: '', pieces: '', numFacture: '',
  })

  const showMsg = (msg: string, err = false) => { setToastError(err); setToast(msg) }
  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 560,
    chrome: 150,
  })

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await fetchTransactionsFournisseurs(accessToken, period)
      setTransactions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken, period])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const prevMonth = () => setPeriod(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })
  const nextMonth = () => setPeriod(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions.filter(t => {
      if (!inPeriod(t.date, period.year, period.month)) return false
      if (tab !== 'all' && t.type !== tab) return false
      if (q && !t.fournisseur.toLowerCase().includes(q) && !t.vehicule?.toLowerCase().includes(q)) return false
      return true
    })
  }, [transactions, period, tab, search])

  const kpi = useMemo(() => {
    const periodTx = transactions.filter(t => inPeriod(t.date, period.year, period.month))
    return {
      achats: periodTx.filter(t => t.type === 'achat').reduce((s, t) => s + t.montant, 0),
      revenus: periodTx.filter(t => t.type === 'revenue').reduce((s, t) => s + t.montant, 0),
      paiements: periodTx.filter(t => t.type === 'paiement').reduce((s, t) => s + t.montant, 0),
    }
  }, [transactions, period])

  const handleAdd = async () => {
    if (!form.fournisseur.trim()) { showMsg('Fournisseur requis', true); return }
    if (!form.montant || form.montant <= 0) { showMsg('Montant invalide', true); return }
    setSaving(true)
    try {
      const newTx = await addTransactionFournisseur(accessToken, form)
      setTransactions(prev => [newTx, ...prev])
      setShowForm(false)
      setForm({ type: 'achat', date: todayISO(), montant: 0, fournisseur: '', vehicule: '', pieces: '', numFacture: '' })
      showMsg('Transaction ajoutée')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (tx: TransactionFournisseur) => {
    Alert.alert('Supprimer', `Supprimer cette transaction de ${fmt(tx.montant)} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteTransactionFournisseur(accessToken, tx.id)
            setTransactions(prev => prev.filter(t => t.id !== tx.id))
            showMsg('Supprimé')
          } catch (e) {
            showMsg(e instanceof Error ? e.message : 'Erreur', true)
          }
        }
      }
    ])
  }

  if (!canViewFinance) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.textSubtle} />
        <Text style={styles.emptyTitle}>Accès refusé</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.textSubtle} />
        <Text style={styles.emptyTitle}>Impossible de charger</Text>
        <Text style={styles.emptySub}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Navigation mois */}
      <View style={styles.navBar}>
        <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.primaryDark} />
        </Pressable>
        <Text style={styles.navTitle}>{MONTHS[period.month - 1]} {period.year}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={theme.primaryDark} />
        </Pressable>
      </View>

      {/* KPI */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: '#d97706' }]}>{fmt(kpi.achats)}</Text>
          <Text style={styles.kpiLabel}>Achats</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{fmt(kpi.revenus)}</Text>
          <Text style={styles.kpiLabel}>Revenus IN</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{fmt(kpi.paiements)}</Text>
          <Text style={styles.kpiLabel}>Paiements OUT</Text>
        </View>
      </View>

      {/* Onglets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {([['all', 'Tous', 'list-outline', theme.textMuted], ...Object.entries(TAB_CONFIG).map(([k, v]) => [k, v.label, v.icon, v.color])] as [string, string, string, string][]).map(([key, label, icon, color]) => {
          const active = tab === key
          return (
            <Pressable
              key={key}
              style={[styles.tabChip, active && { backgroundColor: color + '20', borderColor: color }]}
              onPress={() => setTab(key as TabType)}
            >
              <Ionicons name={icon as any} size={14} color={active ? color : theme.textMuted} />
              <Text style={[styles.tabText, active && { color, fontWeight: '700' }]}>{label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Recherche + bouton ajouter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.textSubtle} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Fournisseur, véhicule…"
            placeholderTextColor={theme.textSubtle}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!drawerOpen}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={40} color={theme.textSubtle} />
            <Text style={styles.emptyTitle}>Aucune transaction</Text>
            <Text style={styles.emptySub}>Aucune transaction ce mois.</Text>
          </View>
        }
        renderItem={({ item: tx }) => {
          const cfg = TAB_CONFIG[tx.type]
          return (
            <View style={styles.txCard}>
              <View style={styles.txLeft}>
                <View style={[styles.txIcon, { backgroundColor: cfg.color + '20' }]}>
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txFournisseur} numberOfLines={1}>{tx.fournisseur}</Text>
                  {tx.vehicule ? <Text style={styles.txMeta} numberOfLines={1}>{tx.vehicule}</Text> : null}
                  {tx.pieces ? <Text style={styles.txMeta} numberOfLines={1}>{tx.pieces}</Text> : null}
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txMontant, { color: cfg.color }]}>{fmt(tx.montant)}</Text>
                <View style={[styles.txTypeBadge, { borderColor: cfg.color }]}>
                  <Text style={[styles.txTypeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Pressable onPress={() => handleDelete(tx)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={16} color={theme.textSubtle} />
                </Pressable>
              </View>
            </View>
          )
        }}
      />

      {/* Modal ajout */}
      <CenteredBlurModal visible={showForm} onClose={() => setShowForm(false)} maxWidth={440}>
        <View style={[styles.modalCard, { maxHeight: cardMaxHeight }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle transaction</Text>
            <Pressable onPress={() => setShowForm(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Type */}
            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['achat', 'revenue', 'paiement'] as TransactionFournisseurType[]).map(t => {
                const cfg = TAB_CONFIG[t]
                const active = form.type === t
                return (
                  <Pressable
                    key={t}
                    style={[styles.typeChip, active && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}
                    onPress={() => setForm(f => ({ ...f, type: t }))}
                  >
                    <Text style={[styles.typeChipText, active && { color: cfg.color, fontWeight: '700' }]}>
                      {cfg.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={styles.formLabel}>Date</Text>
            <TextInput
              style={styles.formInput}
              value={form.date}
              onChangeText={v => setForm(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor={theme.textSubtle}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.formLabel}>Fournisseur *</Text>
            <TextInput
              style={styles.formInput}
              value={form.fournisseur}
              onChangeText={v => setForm(f => ({ ...f, fournisseur: v }))}
              placeholder="Nom du fournisseur"
              placeholderTextColor={theme.textSubtle}
            />

            <Text style={styles.formLabel}>Montant (DT) *</Text>
            <TextInput
              style={styles.formInput}
              value={form.montant > 0 ? String(form.montant) : ''}
              onChangeText={v => setForm(f => ({ ...f, montant: parseFloat(v.replace(',', '.')) || 0 }))}
              keyboardType="decimal-pad"
              placeholder="0.000"
              placeholderTextColor={theme.textSubtle}
            />

            <Text style={styles.formLabel}>Véhicule</Text>
            <TextInput
              style={styles.formInput}
              value={form.vehicule ?? ''}
              onChangeText={v => setForm(f => ({ ...f, vehicule: v }))}
              placeholder="Marque modèle…"
              placeholderTextColor={theme.textSubtle}
            />

            {form.type === 'achat' && (
              <>
                <Text style={styles.formLabel}>Pièces</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.pieces ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, pieces: v }))}
                  placeholder="Description des pièces"
                  placeholderTextColor={theme.textSubtle}
                />
                <Text style={styles.formLabel}>N° Facture</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.numFacture ?? ''}
                  onChangeText={v => setForm(f => ({ ...f, numFacture: v }))}
                  placeholder="Numéro de facture"
                  placeholderTextColor={theme.textSubtle}
                />
              </>
            )}
          </ScrollView>

          <View style={[styles.formFooter, { paddingBottom: footerPaddingBottom }]}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setShowForm(false)}>
              <Text style={styles.formBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.formBtn, styles.formBtnSave]} onPress={() => void handleAdd()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.formBtnSaveText}>Ajouter</Text>}
            </Pressable>
          </View>
        </View>
      </CenteredBlurModal>

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight,
  },
  navBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.primarySoft },
  navTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  kpiRow: {
    flexDirection: 'row', backgroundColor: theme.surface, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight,
  },
  kpiTile: { flex: 1, alignItems: 'center', gap: 2 },
  kpiDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.borderLight },
  kpiValue: { fontSize: 13, fontWeight: '700' },
  kpiLabel: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase' },
  tabsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted,
  },
  tabText: { fontSize: 13, color: theme.textMuted },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text },
  addBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  txCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
  },
  txLeft: { flexDirection: 'row', gap: 12, flex: 1, alignItems: 'flex-start' },
  txIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txFournisseur: { fontSize: 14, fontWeight: '600', color: theme.text },
  txMeta: { fontSize: 12, color: theme.textSubtle },
  txDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txMontant: { fontSize: 15, fontWeight: '700' },
  txTypeBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  txTypeText: { fontSize: 10, fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  formScroll: { padding: 18, gap: 4 },
  formLabel: { fontSize: 12, fontWeight: '600', color: theme.textSubtle, marginTop: 14 },
  formInput: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: theme.text,
    backgroundColor: theme.surfaceMuted, marginTop: 6,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  typeChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted,
  },
  typeChipText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  formFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: theme.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.borderLight,
  },
  formBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  formBtnCancel: { backgroundColor: theme.surfaceMuted },
  formBtnSave: { backgroundColor: theme.primary },
  formBtnCancelText: { fontWeight: '600', color: theme.textSecondary, fontSize: 15 },
  formBtnSaveText: { fontWeight: '600', color: '#fff', fontSize: 15 },
})
