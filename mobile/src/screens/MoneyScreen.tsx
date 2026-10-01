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
  addMoneyIn,
  addMoneyOut,
  fetchMoneyIn,
  fetchMoneyOut,
  loadInTypes,
  loadOutCategories,
  saveInTypes,
  saveOutCategories,
  updateMoneyIn,
  updateMoneyOut,
} from '../lib/moneyApi'
import { getModalLayout } from '../lib/modalLayout'
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
  const [inTypes, setInTypes] = useState<string[]>([...MONEY_IN_TYPES])
  const [outCategories, setOutCategories] = useState<string[]>([...MONEY_OUT_CATEGORIES])
  const [showTypes, setShowTypes] = useState(false)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [editingType, setEditingType] = useState<string | null>(null)
  const [editingTypeValue, setEditingTypeValue] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryValue, setEditingCategoryValue] = useState('')
  const [savingTypes, setSavingTypes] = useState(false)

  const showMsg = (msg: string, err = false) => { setToastError(err); setToast(msg) }
  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 560,
    chrome: 150,
  })

  const load = useCallback(async () => {
    setError(null)
    try {
      const [inData, outData] = await Promise.all([
        fetchMoneyIn(accessToken, period),
        fetchMoneyOut(accessToken, period),
      ])
      setIns(inData)
      setOuts(outData)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken, period])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  useEffect(() => {
    if (!canViewFinance) return
    void (async () => {
      try {
        const [types, categories] = await Promise.all([
          loadInTypes(accessToken),
          loadOutCategories(accessToken),
        ])
        setInTypes(types)
        setOutCategories(categories)
        setNewIn(prev => ({ ...prev, type: types.includes(prev.type) ? prev.type : (types[0] ?? prev.type) }))
        setNewOut(prev => ({ ...prev, category: categories.includes(prev.category) ? prev.category : (categories[0] ?? prev.category) }))
      } catch {
        /* garder la liste initiale */
      }
    })()
  }, [accessToken, canViewFinance])

  const defaultInType = inTypes.includes('MECA') ? 'MECA' : (inTypes[0] ?? 'MECA')
  const defaultOutCategory = outCategories.includes('GARAGE') ? 'GARAGE' : (outCategories[0] ?? 'GARAGE')

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
      setNewIn({ date: todayISO(), amount: 0, type: defaultInType, description: '', paymentMethod: 'ESPECE' })
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
      setNewOut({ date: todayISO(), amount: 0, category: defaultOutCategory, description: '', beneficiary: '' })
      showMsg('Sortie ajoutée')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur', true)
    } finally {
      setSaving(false)
    }
  }

  const addType = async () => {
    const label = newTypeLabel.trim()
    if (!label || savingTypes) return
    if (inTypes.some(t => t.toLowerCase() === label.toLowerCase())) {
      showMsg('Ce type existe déjà.', true)
      return
    }
    const previous = inTypes
    const next = [...inTypes, label]
    setSavingTypes(true)
    setInTypes(next)
    try {
      await saveInTypes(accessToken, next)
      setNewIn(prev => ({ ...prev, type: label }))
      setNewTypeLabel('')
      showMsg('Type enregistré. Il reste dans la liste.')
    } catch {
      setInTypes(previous)
      showMsg('Le type n’a pas pu être enregistré.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const renameType = async (previousLabel: string, draft: string) => {
    const label = draft.trim()
    if (!label || savingTypes) return
    if (label === previousLabel) {
      setEditingType(null)
      return
    }
    if (inTypes.some(t => t !== previousLabel && t.toLowerCase() === label.toLowerCase())) {
      showMsg('Ce type existe déjà.', true)
      return
    }
    const previous = inTypes
    const next = inTypes.map(t => (t === previousLabel ? label : t))
    setSavingTypes(true)
    setInTypes(next)
    try {
      await saveInTypes(accessToken, next)
      const all = await fetchMoneyIn(accessToken)
      await Promise.all(all.filter(row => row.type === previousLabel).map(row => updateMoneyIn(accessToken, row.id, { type: label })))
      setIns(rows => rows.map(row => (row.type === previousLabel ? { ...row, type: label } : row)))
      setNewIn(form => (form.type === previousLabel ? { ...form, type: label } : form))
      setEditingType(null)
      showMsg('Type modifié.')
    } catch {
      setInTypes(previous)
      showMsg('Le type n’a pas pu être modifié.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const removeType = async (label: string) => {
    const previous = inTypes
    const next = inTypes.filter(t => t !== label)
    setSavingTypes(true)
    setInTypes(next)
    try {
      await saveInTypes(accessToken, next)
      if (newIn.type === label) setNewIn(prev => ({ ...prev, type: next.includes('MECA') ? 'MECA' : (next[0] ?? '') }))
      showMsg('Type retiré de la liste.')
    } catch {
      setInTypes(previous)
      showMsg('Le type n’a pas pu être supprimé.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const addCategory = async () => {
    const label = newCategoryLabel.trim()
    if (!label || savingTypes) return
    if (outCategories.some(c => c.toLowerCase() === label.toLowerCase())) {
      showMsg('Cette catégorie existe déjà.', true)
      return
    }
    const previous = outCategories
    const next = [...outCategories, label]
    setSavingTypes(true)
    setOutCategories(next)
    try {
      await saveOutCategories(accessToken, next)
      setNewOut(prev => ({ ...prev, category: label }))
      setNewCategoryLabel('')
      showMsg('Catégorie enregistrée. Elle reste dans la liste.')
    } catch {
      setOutCategories(previous)
      showMsg('La catégorie n’a pas pu être enregistrée.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const renameCategory = async (previousLabel: string, draft: string) => {
    const label = draft.trim()
    if (!label || savingTypes) return
    if (label === previousLabel) {
      setEditingCategory(null)
      return
    }
    if (outCategories.some(c => c !== previousLabel && c.toLowerCase() === label.toLowerCase())) {
      showMsg('Cette catégorie existe déjà.', true)
      return
    }
    const previous = outCategories
    const next = outCategories.map(c => (c === previousLabel ? label : c))
    setSavingTypes(true)
    setOutCategories(next)
    try {
      await saveOutCategories(accessToken, next)
      const all = await fetchMoneyOut(accessToken)
      await Promise.all(all.filter(row => row.category === previousLabel).map(row => updateMoneyOut(accessToken, row.id, { category: label })))
      setOuts(rows => rows.map(row => (row.category === previousLabel ? { ...row, category: label } : row)))
      setNewOut(form => (form.category === previousLabel ? { ...form, category: label } : form))
      setEditingCategory(null)
      showMsg('Catégorie modifiée.')
    } catch {
      setOutCategories(previous)
      showMsg('La catégorie n’a pas pu être modifiée.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const removeCategory = async (label: string) => {
    const previous = outCategories
    const next = outCategories.filter(c => c !== label)
    setSavingTypes(true)
    setOutCategories(next)
    try {
      await saveOutCategories(accessToken, next)
      if (newOut.category === label) setNewOut(prev => ({ ...prev, category: next.includes('GARAGE') ? 'GARAGE' : (next[0] ?? '') }))
      showMsg('Catégorie retirée de la liste.')
    } catch {
      setOutCategories(previous)
      showMsg('La catégorie n’a pas pu être supprimée.', true)
    } finally {
      setSavingTypes(false)
    }
  }

  const confirmRemoveType = (label: string) => {
    Alert.alert('Retirer ce type', `${label} ne sera plus proposé pour les nouvelles entrées.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void removeType(label) },
    ])
  }

  const confirmRemoveCategory = (label: string) => {
    Alert.alert('Retirer cette catégorie', `${label} ne sera plus proposée pour les nouvelles sorties.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void removeCategory(label) },
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

      <Pressable style={styles.typesLink} onPress={() => setShowTypes(true)}>
        <Ionicons name="options-outline" size={16} color={theme.primaryDark} />
        <Text style={styles.typesLinkText}>Types et catégories</Text>
      </Pressable>

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
      <CenteredBlurModal visible={addingIn} onClose={() => setAddingIn(false)} maxWidth={440}>
        <View style={[styles.modalCard, { maxHeight: cardMaxHeight }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.success }]}>Nouvelle entrée (IN)</Text>
            <Pressable onPress={() => setAddingIn(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.formLabel}>Date</Text>
            <TextInput style={styles.formInput} value={newIn.date} onChangeText={v => setNewIn(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-JJ" placeholderTextColor={theme.textSubtle} keyboardType="numbers-and-punctuation" />

            <Text style={styles.formLabel}>Montant (DT) *</Text>
            <TextInput style={styles.formInput} value={newIn.amount > 0 ? String(newIn.amount) : ''}
              onChangeText={v => setNewIn(f => ({ ...f, amount: parseFloat(v.replace(',', '.')) || 0 }))}
              keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={theme.textSubtle} />

            <Text style={styles.formLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {inTypes.map(t => (
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
          <View style={[styles.formFooter, { paddingBottom: footerPaddingBottom }]}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setAddingIn(false)}>
              <Text style={styles.formBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.formBtn, { backgroundColor: theme.success }]} onPress={() => void handleAddIn()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.formBtnSaveText}>Ajouter</Text>}
            </Pressable>
          </View>
        </View>
      </CenteredBlurModal>

      {/* Modal ajouter OUT */}
      <CenteredBlurModal visible={addingOut} onClose={() => setAddingOut(false)} maxWidth={440}>
        <View style={[styles.modalCard, { maxHeight: cardMaxHeight }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.danger }]}>Nouvelle sortie (OUT)</Text>
            <Pressable onPress={() => setAddingOut(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.formLabel}>Date</Text>
            <TextInput style={styles.formInput} value={newOut.date} onChangeText={v => setNewOut(f => ({ ...f, date: v }))}
              placeholder="AAAA-MM-JJ" placeholderTextColor={theme.textSubtle} keyboardType="numbers-and-punctuation" />

            <Text style={styles.formLabel}>Montant (DT) *</Text>
            <TextInput style={styles.formInput} value={newOut.amount > 0 ? String(newOut.amount) : ''}
              onChangeText={v => setNewOut(f => ({ ...f, amount: parseFloat(v.replace(',', '.')) || 0 }))}
              keyboardType="decimal-pad" placeholder="0.000" placeholderTextColor={theme.textSubtle} />

            <Text style={styles.formLabel}>Catégorie</Text>
            <View style={styles.chipsRowFixed}>
              {outCategories.map(c => (
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
          <View style={[styles.formFooter, { paddingBottom: footerPaddingBottom }]}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setAddingOut(false)}>
              <Text style={styles.formBtnCancelText}>Annuler</Text>
            </Pressable>
            <Pressable style={[styles.formBtn, { backgroundColor: theme.danger }]} onPress={() => void handleAddOut()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.formBtnSaveText}>Ajouter</Text>}
            </Pressable>
          </View>
        </View>
      </CenteredBlurModal>

      <CenteredBlurModal visible={showTypes} onClose={() => setShowTypes(false)} maxWidth={440}>
        <View style={[styles.modalCard, { maxHeight: cardMaxHeight }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Types et catégories</Text>
            <Pressable onPress={() => setShowTypes(false)} style={styles.modalClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={{ maxHeight: scrollMaxHeight }}
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Types d'entrée (IN)</Text>
            <Text style={styles.sectionHint}>Tous les types peuvent être modifiés ou supprimés.</Text>
            {inTypes.map(label => (
              <View key={label} style={styles.labelRow}>
                {editingType === label ? (
                  <TextInput
                    style={styles.labelInput}
                    value={editingTypeValue}
                    onChangeText={setEditingTypeValue}
                    autoFocus
                    onSubmitEditing={() => void renameType(label, editingTypeValue)}
                  />
                ) : (
                  <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
                )}
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    if (editingType === label) void renameType(label, editingTypeValue)
                    else {
                      setEditingType(label)
                      setEditingTypeValue(label)
                    }
                  }}
                >
                  <Ionicons name={editingType === label ? 'checkmark' : 'pencil'} size={18} color={theme.primaryDark} />
                </Pressable>
                <Pressable hitSlop={6} onPress={() => confirmRemoveType(label)}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={[styles.formInput, styles.addInput]}
                value={newTypeLabel}
                onChangeText={setNewTypeLabel}
                placeholder="Nouveau type"
                placeholderTextColor={theme.textSubtle}
                onSubmitEditing={() => void addType()}
              />
              <Pressable style={styles.addBtn} onPress={() => void addType()} disabled={savingTypes || !newTypeLabel.trim()}>
                <Text style={styles.addBtnText}>Ajouter</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Catégories de sortie (OUT)</Text>
            <Text style={styles.sectionHint}>Toutes les catégories peuvent être modifiées ou supprimées.</Text>
            {outCategories.map(label => (
              <View key={label} style={styles.labelRow}>
                {editingCategory === label ? (
                  <TextInput
                    style={styles.labelInput}
                    value={editingCategoryValue}
                    onChangeText={setEditingCategoryValue}
                    autoFocus
                    onSubmitEditing={() => void renameCategory(label, editingCategoryValue)}
                  />
                ) : (
                  <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
                )}
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    if (editingCategory === label) void renameCategory(label, editingCategoryValue)
                    else {
                      setEditingCategory(label)
                      setEditingCategoryValue(label)
                    }
                  }}
                >
                  <Ionicons name={editingCategory === label ? 'checkmark' : 'pencil'} size={18} color={theme.primaryDark} />
                </Pressable>
                <Pressable hitSlop={6} onPress={() => confirmRemoveCategory(label)}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={[styles.formInput, styles.addInput]}
                value={newCategoryLabel}
                onChangeText={setNewCategoryLabel}
                placeholder="Nouvelle catégorie"
                placeholderTextColor={theme.textSubtle}
                onSubmitEditing={() => void addCategory()}
              />
              <Pressable style={styles.addBtn} onPress={() => void addCategory()} disabled={savingTypes || !newCategoryLabel.trim()}>
                <Text style={styles.addBtnText}>Ajouter</Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={[styles.formFooter, { paddingBottom: footerPaddingBottom }]}>
            <Pressable style={[styles.formBtn, styles.formBtnCancel]} onPress={() => setShowTypes(false)}>
              <Text style={styles.formBtnCancelText}>Fermer</Text>
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
  typesLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 8, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
  },
  typesLinkText: { fontSize: 13, fontWeight: '700', color: theme.primaryDark },
  searchRow: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 8 },
  sectionHint: { fontSize: 12, color: theme.textSubtle, marginTop: 4, marginBottom: 8 },
  labelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.surfaceMuted, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6,
  },
  labelText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.text },
  labelInput: {
    flex: 1, fontSize: 14, color: theme.text,
    backgroundColor: theme.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 16 },
  addInput: { flex: 1, marginTop: 0 },
  addBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  formBtnCancelText: { fontWeight: '600', color: theme.textSecondary, fontSize: 15 },
  formBtnSaveText: { fontWeight: '600', color: '#fff', fontSize: 15 },
})
