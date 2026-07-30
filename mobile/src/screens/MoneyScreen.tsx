import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AppToast from '../components/ui/AppToast'
import { addMoneyIn, addMoneyOut, fetchMoneyIn, fetchMoneyOut } from '../lib/moneyApi'
import { theme } from '../theme/appTheme'
import type { MoneyIn, MoneyOut } from '../types/money'
import { MONEY_IN_TYPES, MONEY_OUT_CATEGORIES, MONEY_PAYMENT_METHODS } from '../types/money'

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

type Tab = 'all' | 'in' | 'out'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function inPeriod(date: string, year: number, month: number) {
  const [y, m] = date.split('-').map(Number)
  return y === year && m === month
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

type MovementItem =
  | { kind: 'in'; data: MoneyIn }
  | { kind: 'out'; data: MoneyOut }

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function MoneyScreen({ accessToken, canViewFinance, drawerOpen = false }: Props) {
  const [ins, setIns] = useState<MoneyIn[]>([])
  const [outs, setOuts] = useState<MoneyOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [addingIn, setAddingIn] = useState(false)
  const [addingOut, setAddingOut] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newIn, setNewIn] = useState<Omit<MoneyIn, 'id'>>({ date: todayISO(), amount: 0, type: 'MECA', description: '', paymentMethod: 'ESPECE' })
  const [newOut, setNewOut] = useState<Omit<MoneyOut, 'id' | 'sourceRef'>>({ date: todayISO(), amount: 0, category: 'GARAGE', description: '', beneficiary: '' })

  const showMsg = (msg: string, err = false) => { setToastError(err); setToast(msg) }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [inData, outData] = await Promise.all([fetchMoneyIn(accessToken), fetchMoneyOut(accessToken)])
      setIns(inData)
      setOuts(outData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const prevMonth = () => setPeriod(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })
  const nextMonth = () => setPeriod(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })

  const kpi = useMemo(() => {
    const periodIns = ins.filter(i => inPeriod(i.date, period.year, period.month))
    const periodOuts = outs.filter(o => inPeriod(o.date, period.year, period.month))
    const totalIn = periodIns.reduce((s, i) => s + i.amount, 0)
    const totalOut = periodOuts.reduce((s, o) => s + o.amount, 0)
    return { totalIn, totalOut, balance: totalIn - totalOut, countIn: periodIns.length, countOut: periodOuts.length }
  }, [ins, outs, period])

  const items = useMemo((): MovementItem[] => {
    const q = search.trim().toLowerCase()
    const result: MovementItem[] = []
    if (tab !== 'out') {
      for (const i of ins) {
        if (!inPeriod(i.date, period.year, period.month)) continue
        if (q && !i.description.toLowerCase().includes(q) && !i.type.toLowerCase().includes(q)) continue
        result.push({ kind: 'in', data: i })
      }
    }
    if (tab !== 'in') {
      for (const o of outs) {
        if (!inPeriod(o.date, period.year, period.month)) continue
        if (q && !o.description.toLowerCase().includes(q) && !o.category.toLowerCase().includes(q)) continue
        result.push({ kind: 'out', data: o })
      }
    }
    return result.sort((a, b) => {
      const da = a.kind === 'in' ? a.data.date : a.data.date
      const db = b.kind === 'in' ? b.data.date : b.data.date
      return db.localeCompare(da)
    })
  }, [ins, outs, period, tab, search])

  const handleAddIn = async () => {
    if (!newIn.amount || newIn.amount <= 0) { showMsg('Montant invalide', true); return }
    setSaving(true)
    try {
      const created = await addMoneyIn(accessToken, newIn)
      setIns(prev => [created, ...prev])
      setAddingIn(false)
      setNewIn({ date: todayISO(), amount: 0, type: 'MECA', description: '', paymentMethod: 'ESPECE' })
      showMsg('Entrée ajoutée')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur', true)
    } finally {
      setSaving(false)
    }
  }

  const handleAddOut = async () => {
    if (!newOut.amount || newOut.amount <= 0) { showMsg('Montant invalide', true); return }
    setSaving(true)
    try {
      const created = await addMoneyOut(accessToken, newOut)
      setOuts(prev => [created, ...prev])
      setAddingOut(false)
      setNewOut({ date: todayISO(), amount: 0, category: 'GARAGE', description: '', beneficiary: '' })
      showMsg('Sortie ajoutée')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur', true)
    } finally {
      setSaving(false)
    }
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
    return <View style={styles.center}><ActivityIndicator color={theme.primary} size="large" /></View>
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
          <Text style={[styles.kpiValue, { color: theme.success }]}>+{fmt(kpi.totalIn)}</Text>
          <Text style={styles.kpiLabel}>IN ({kpi.countIn})</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: theme.danger }]}>-{fmt(kpi.totalOut)}</Text>
          <Text style={styles.kpiLabel}>OUT ({kpi.countOut})</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: kpi.balance >= 0 ? theme.primaryDark : theme.danger }]}>
            {kpi.balance >= 0 ? '+' : ''}{fmt(kpi.balance)}
          </Text>
          <Text style={styles.kpiLabel}>Balance</Text>
        </View>
      </View>

      {/* Onglets + boutons */}
      <View style={styles.controlsRow}>
        <View style={styles.tabs}>
          {(['all', 'in', 'out'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = { all: 'Tous', in: 'IN', out: 'OUT' }
            const active = tab === t
            return (
              <Pressable key={t} style={[styles.tabChip, active && styles.tabChipActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{labels[t]}</Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.actionBtns}>
          <Pressable style={[styles.actionBtn, { backgroundColor: theme.success + '20' }]} onPress={() => setAddingIn(true)}>
            <Ionicons name="arrow-down-circle-outline" size={16} color={theme.success} />
            <Text style={[styles.actionBtnText, { color: theme.success }]}>IN</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: theme.danger + '20' }]} onPress={() => setAddingOut(true)}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={theme.danger} />
            <Text style={[styles.actionBtnText, { color: theme.danger }]}>OUT</Text>
          </Pressable>
        </View>
      </View>

      {/* Recherche */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.textSubtle} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Description, catégorie…"
            placeholderTextColor={theme.textSubtle}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Liste */}
      <FlatList
        data={items}
        keyExtractor={item => `${item.kind}-${item.kind === 'in' ? item.data.id : item.data.id}`}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!drawerOpen}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="wallet-outline" size={40} color={theme.textSubtle} />
            <Text style={styles.emptyTitle}>Aucun mouvement</Text>
            <Text style={styles.emptySub}>Aucun enregistrement ce mois.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isIn = item.kind === 'in'
          const data = item.data as any
          const color = isIn ? theme.success : theme.danger
          const iconName = isIn ? 'arrow-down-circle' : 'arrow-up-circle'
          const label = isIn ? data.type : data.category
          const desc = data.description || (isIn ? '' : data.beneficiary || '')

          return (
            <View style={styles.movCard}>
              <View style={[styles.movIconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={iconName} size={22} color={color} />
              </View>
              <View style={styles.movInfo}>
                <Text style={styles.movLabel}>{label}</Text>
                {desc ? <Text style={styles.movDesc} numberOfLines={1}>{desc}</Text> : null}
                <Text style={styles.movDate}>{data.date}</Text>
              </View>
              <Text style={[styles.movAmount, { color }]}>
                {isIn ? '+' : '-'}{fmt(data.amount)}
              </Text>
            </View>
          )
        }}
      />

      {/* Modal ajouter IN */}
      <Modal visible={addingIn} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddingIn(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.success }]}>Nouvelle entrée (IN)</Text>
            <Pressable onPress={() => setAddingIn(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Date</Text>
            <TextInput style={styles.formInput} value={newIn.date} onChangeText={v => setNewIn(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-JJ" placeholderTextColor={theme.textSubtle} keyboardType="numbers-and-punctuation" />

            <Text style={styles.formLabel}>Montant (DT) *</Text>
            <TextInput style={styles.formInput} value={newIn.amount > 0 ? String(newIn.amount) : ''}
              onChangeText={v => setNewIn(f => ({ ...f, amount: parseFloat(v.replace(',', '.')) || 0 }))}
              keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={theme.textSubtle} />

            <Text style={styles.formLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {MONEY_IN_TYPES.map(t => (
                <Pressable key={t}
                  style={[styles.selectChip, newIn.type === t && styles.selectChipActive]}
                  onPress={() => setNewIn(f => ({ ...f, type: t }))}>
                  <Text style={[styles.selectChipText, newIn.type === t && styles.selectChipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>Moyen de paiement</Text>
            <View style={styles.chipsRowFixed}>
              {MONEY_PAYMENT_METHODS.map(m => (
                <Pressable key={m}
                  style={[styles.selectChip, newIn.paymentMethod === m && styles.selectChipActive]}
                  onPress={() => setNewIn(f => ({ ...f, paymentMethod: m }))}>
                  <Text style={[styles.selectChipText, newIn.paymentMethod === m && styles.selectChipTextActive]}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Description</Text>
            <TextInput style={[styles.formInput, styles.formTextArea]}
              value={newIn.description} onChangeText={v => setNewIn(f => ({ ...f, description: v }))}
              multiline placeholder="Optionnel…" placeholderTextColor={theme.textSubtle} />
          </ScrollView>
          <View style={styles.formFooter}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setAddingIn(false)}>
              <Text style={styles.formBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.formBtn, { backgroundColor: theme.success }]} onPress={() => void handleAddIn()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.formBtnSaveText}>Ajouter</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal ajouter OUT */}
      <Modal visible={addingOut} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddingOut(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.danger }]}>Nouvelle sortie (OUT)</Text>
            <Pressable onPress={() => setAddingOut(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Date</Text>
            <TextInput style={styles.formInput} value={newOut.date} onChangeText={v => setNewOut(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-JJ" placeholderTextColor={theme.textSubtle} keyboardType="numbers-and-punctuation" />

            <Text style={styles.formLabel}>Montant (DT) *</Text>
            <TextInput style={styles.formInput} value={newOut.amount > 0 ? String(newOut.amount) : ''}
              onChangeText={v => setNewOut(f => ({ ...f, amount: parseFloat(v.replace(',', '.')) || 0 }))}
              keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={theme.textSubtle} />

            <Text style={styles.formLabel}>Catégorie</Text>
            <View style={styles.chipsRowFixed}>
              {MONEY_OUT_CATEGORIES.map(c => (
                <Pressable key={c}
                  style={[styles.selectChip, newOut.category === c && styles.selectChipActiveDanger]}
                  onPress={() => setNewOut(f => ({ ...f, category: c }))}>
                  <Text style={[styles.selectChipText, newOut.category === c && { color: theme.danger, fontWeight: '700' }]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Description</Text>
            <TextInput style={[styles.formInput, styles.formTextArea]}
              value={newOut.description} onChangeText={v => setNewOut(f => ({ ...f, description: v }))}
              multiline placeholder="Optionnel…" placeholderTextColor={theme.textSubtle} />

            <Text style={styles.formLabel}>Bénéficiaire</Text>
            <TextInput style={styles.formInput} value={newOut.beneficiary ?? ''}
              onChangeText={v => setNewOut(f => ({ ...f, beneficiary: v }))}
              placeholder="Nom du bénéficiaire" placeholderTextColor={theme.textSubtle} />
          </ScrollView>
          <View style={styles.formFooter}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setAddingOut(false)}>
              <Text style={styles.formBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.formBtn, { backgroundColor: theme.danger }]} onPress={() => void handleAddOut()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.formBtnSaveText}>Ajouter</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

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
  controlsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  tabs: { flexDirection: 'row', gap: 6 },
  tabChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted,
  },
  tabChipActive: { backgroundColor: theme.primarySoft, borderColor: '#fed7aa' },
  tabText: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.primaryDark },
  actionBtns: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  movCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
  },
  movIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  movInfo: { flex: 1, gap: 2 },
  movLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
  movDesc: { fontSize: 12, color: theme.textSubtle },
  movDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  movAmount: { fontSize: 15, fontWeight: '700' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalRoot: { flex: 1, backgroundColor: theme.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 14,
    backgroundColor: theme.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  formScroll: { padding: 18, gap: 2 },
  formLabel: { fontSize: 12, fontWeight: '600', color: theme.textSubtle, marginTop: 14 },
  formInput: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: theme.text,
    backgroundColor: theme.surfaceMuted, marginTop: 6,
  },
  formTextArea: { minHeight: 72, textAlignVertical: 'top' },
  chipsRow: { gap: 8, paddingVertical: 6 },
  chipsRowFixed: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  selectChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted,
  },
  selectChipActive: { backgroundColor: theme.primarySoft, borderColor: '#fed7aa' },
  selectChipActiveDanger: { backgroundColor: theme.danger + '15', borderColor: theme.danger },
  selectChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  selectChipTextActive: { color: theme.primaryDark, fontWeight: '700' },
  formFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight,
  },
  formBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  formBtnCancel: { backgroundColor: theme.surfaceMuted },
  formBtnCancelText: { fontWeight: '600', color: theme.textSecondary, fontSize: 15 },
  formBtnSaveText: { fontWeight: '600', color: '#fff', fontSize: 15 },
})
