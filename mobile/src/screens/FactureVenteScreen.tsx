import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FactureVenteDetailSheet from '../components/facturesVente/FactureVenteDetailSheet'
import FactureVenteListItem from '../components/facturesVente/FactureVenteListItem'
import FactureVentePaiementModal from '../components/facturesVente/FactureVentePaiementModal'
import FactureVenteSkeleton from '../components/facturesVente/FactureVenteSkeleton'
import AppToast from '../components/ui/AppToast'
import {
  fetchFacturesVente,
  updateFactureStatut,
  validateFactureFromBrouillon,
} from '../lib/factureVenteApi'
import { factureResteTTC } from '../lib/factureVenteHelpers'
import { formatMontant } from '../lib/formatMoney'
import { theme } from '../theme/appTheme'
import type { FactureStatut, FactureVente } from '../types/factureVente'

type FilterStatut = FactureStatut | 'toutes' | 'a_encaisser'

const FILTERS: { id: FilterStatut; label: string }[] = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'a_encaisser', label: 'À encaisser' },
  { id: 'envoyee', label: 'Non payées' },
  { id: 'partiellement_payee', label: 'Partielles' },
  { id: 'payee', label: 'Payées' },
  { id: 'brouillon', label: 'Brouillons' },
  { id: 'annulee', label: 'Annulées' },
]

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function FactureVenteScreen({
  accessToken,
  canViewFinance,
  drawerOpen = false,
}: Props) {
  const [factures, setFactures] = useState<FactureVente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('toutes')
  const [detail, setDetail] = useState<FactureVente | null>(null)
  const [showPaiement, setShowPaiement] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchFacturesVente(accessToken, {
        q: searchDebounced || undefined,
      })
      setFactures(list)
    } catch (e) {
      setFactures([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken, searchDebounced])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const filtered = useMemo(() => {
    let list = factures
    if (filterStatut === 'a_encaisser') {
      list = list.filter((f) => {
        if (f.statut !== 'envoyee' && f.statut !== 'partiellement_payee') return false
        return factureResteTTC(f) > 0.01
      })
    } else if (filterStatut !== 'toutes') {
      list = list.filter((f) => f.statut === filterStatut)
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }, [factures, filterStatut])

  const stats = useMemo(() => {
    const aEncaisserList = factures.filter(
      (f) =>
        (f.statut === 'envoyee' || f.statut === 'partiellement_payee') &&
        factureResteTTC(f) > 0.01
    )
    const resteTotal = aEncaisserList.reduce((s, f) => s + factureResteTTC(f), 0)
    return { count: aEncaisserList.length, resteTotal }
  }, [factures])

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<FilterStatut, number>> = { toutes: factures.length }
    counts.a_encaisser = stats.count
    for (const s of ['envoyee', 'partiellement_payee', 'payee', 'brouillon', 'annulee'] as const) {
      counts[s] = factures.filter((f) => f.statut === s).length
    }
    return counts
  }, [factures, stats.count])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const patchLocal = (updated: FactureVente) => {
    setFactures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
    setDetail(updated)
  }

  const confirmAction = (title: string, message: string, onConfirm: () => Promise<void>) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: () => {
          setActionBusy(true)
          void onConfirm()
            .catch((e) => showMsg(e instanceof Error ? e.message : 'Action impossible', true))
            .finally(() => setActionBusy(false))
        },
      },
    ])
  }

  const handleValidateEnvoyee = () => {
    if (!detail) return
    confirmAction(
      'Envoyer la facture',
      `Valider « ${detail.numero} » comme non payée ?`,
      async () => {
        const updated = await validateFactureFromBrouillon(accessToken, detail, 'envoyee')
        patchLocal(updated)
        showMsg('Facture envoyée')
      }
    )
  }

  const handleValidatePayee = () => {
    if (!detail) return
    confirmAction(
      'Marquer payée',
      `Encaisser l'intégralité de « ${detail.numero} » ?`,
      async () => {
        const updated = await validateFactureFromBrouillon(accessToken, detail, 'payee')
        patchLocal(updated)
        showMsg('Facture marquée payée')
      }
    )
  }

  const handleMarquerPayee = () => {
    if (!detail) return
    confirmAction('Solder', `Enregistrer le solde de « ${detail.numero} » ?`, async () => {
      const updated = await updateFactureStatut(accessToken, detail.id, 'payee')
      patchLocal(updated)
      showMsg('Facture soldée')
    })
  }

  const handleAnnuler = () => {
    if (!detail) return
    confirmAction('Annuler', `Annuler « ${detail.numero} » ?`, async () => {
      const updated = await updateFactureStatut(accessToken, detail.id, 'annulee')
      patchLocal(updated)
      showMsg('Facture annulée')
    })
  }

  const overlayOpen = !!detail || showPaiement || drawerOpen

  if (!canViewFinance) {
    return (
      <View style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas accès à la facturation vente.</Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={theme.textSubtle} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher client ou n° facture…"
            placeholderTextColor={theme.textSubtle}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#cbd5e1" />
          </Pressable>
        ) : null}
      </View>

      {stats.count > 0 ? (
        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{stats.count}</Text>
            <Text style={styles.statLabel}>à encaisser</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{formatMontant(stats.resteTotal)}</Text>
            <Text style={styles.statLabel}>reste total</Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
      >
        {FILTERS.map((f) => {
          const active = filterStatut === f.id
          const count = filterCounts[f.id] ?? 0
          if (f.id !== 'toutes' && f.id !== 'a_encaisser' && count === 0) return null
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilterStatut(f.id)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
                {count > 0 ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {!loading && filtered.length > 0 ? (
        <Text style={styles.resultsLabel}>
          {filtered.length} facture{filtered.length !== 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  )

  return (
    <View style={styles.root}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FactureVenteListItem facture={item} onPress={() => setDetail(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <FactureVenteSkeleton />
          ) : error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={36} color={theme.textSubtle} />
              <Text style={styles.emptyTitle}>Impossible de charger</Text>
              <Text style={styles.emptySub}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void load()}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={36} color={theme.textSubtle} />
              <Text style={styles.emptyTitle}>Aucune facture</Text>
              <Text style={styles.emptySub}>
                {searchDebounced || filterStatut !== 'toutes'
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Les factures créées sur le web apparaîtront ici.'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load().finally(() => setRefreshing(false))
            }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        scrollEnabled={!overlayOpen}
      />

      <FactureVenteDetailSheet
        visible={!!detail}
        facture={detail}
        onClose={() => setDetail(null)}
        onEncaisser={() => setShowPaiement(true)}
        onValidateEnvoyee={handleValidateEnvoyee}
        onValidatePayee={handleValidatePayee}
        onMarquerPayee={handleMarquerPayee}
        onAnnuler={handleAnnuler}
        onPdfDone={(msg) => showMsg(msg)}
        onPdfError={(msg) => showMsg(msg, true)}
        busy={actionBusy}
      />

      <FactureVentePaiementModal
        visible={showPaiement}
        facture={detail}
        accessToken={accessToken}
        onClose={() => setShowPaiement(false)}
        onSaved={(f) => {
          patchLocal(f)
          showMsg('Encaissement enregistré')
        }}
        onError={(msg) => showMsg(msg, true)}
      />

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  headerWrap: { paddingTop: 4, paddingBottom: 8, gap: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, padding: 0 },
  statRow: {
    flexDirection: 'row',
    backgroundColor: theme.primarySoft,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  statTile: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#fed7aa' },
  statValue: { fontSize: 18, fontWeight: '600', color: theme.primaryDark },
  statLabel: { fontSize: 12, color: theme.textMuted },
  filtersScroll: { gap: 8, paddingRight: 4 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  filterPillActive: {
    backgroundColor: theme.primarySoft,
    borderColor: '#fed7aa',
  },
  filterText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  filterTextActive: { color: theme.primaryDark, fontWeight: '600' },
  resultsLabel: { fontSize: 12, color: theme.textSubtle, marginTop: -4 },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: theme.primary,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  deniedTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  deniedSub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center' },
})
