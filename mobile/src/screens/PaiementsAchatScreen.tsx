import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FactureAchatDetailSheet from '../components/facturesAchat/FactureAchatDetailSheet'
import FactureAchatListItem from '../components/facturesAchat/FactureAchatListItem'
import FactureAchatPaiementModal from '../components/facturesAchat/FactureAchatPaiementModal'
import FactureAchatSkeleton from '../components/facturesAchat/FactureAchatSkeleton'
import AppToast from '../components/ui/AppToast'
import { fetchFacturesAchat, updateFactureAchatStatut } from '../lib/factureAchatApi'
import { factureAchatResteTTC, factureAchatTotalTTC } from '../lib/factureAchatHelpers'
import { formatMontant } from '../lib/formatMoney'
import { theme } from '../theme/appTheme'
import type { FactureAchat } from '../types/factureAchat'

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function PaiementsAchatScreen({
  accessToken,
  canViewFinance,
  drawerOpen = false,
}: Props) {
  const [factures, setFactures] = useState<FactureAchat[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [detail, setDetail] = useState<FactureAchat | null>(null)
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
      const list = await fetchFacturesAchat(accessToken, {
        statut: 'partiellement_payee',
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

  const sorted = useMemo(
    () => [...factures].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [factures]
  )

  const stats = useMemo(() => {
    const resteTotal = factures.reduce((s, f) => s + factureAchatResteTTC(f), 0)
    const payeTotal = factures.reduce(
      (s, f) => s + factureAchatTotalTTC(f.lignes, f.timbre ?? 1) - factureAchatResteTTC(f),
      0
    )
    return { count: factures.length, resteTotal, payeTotal }
  }, [factures])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const patchLocal = (updated: FactureAchat) => {
    if (updated.statut !== 'partiellement_payee') {
      setFactures((prev) => prev.filter((f) => f.id !== updated.id))
      setDetail(null)
    } else {
      setFactures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
      setDetail(updated)
    }
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

  const handleMarquerPayee = () => {
    if (!detail) return
    confirmAction('Solder', `Enregistrer le solde de « ${detail.numero} » ?`, async () => {
      const updated = await updateFactureAchatStatut(accessToken, detail.id, 'payee')
      patchLocal(updated)
      showMsg('Facture soldée')
    })
  }

  const overlayOpen = !!detail || showPaiement || drawerOpen

  if (!canViewFinance) {
    return (
      <View style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas accès à la facturation.</Text>
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
          placeholder="Rechercher fournisseur ou n° facture…"
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
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiValue}>{stats.count}</Text>
            <Text style={styles.kpiLabel}>factures</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiTile}>
            <Text style={styles.kpiValue}>{formatMontant(stats.payeTotal)}</Text>
            <Text style={styles.kpiLabel}>payé</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiTile}>
            <Text style={[styles.kpiValue, styles.kpiValueWarn]}>{formatMontant(stats.resteTotal)}</Text>
            <Text style={styles.kpiLabel}>reste</Text>
          </View>
        </View>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <Text style={styles.resultsLabel}>
          {sorted.length} facture{sorted.length !== 1 ? 's' : ''} partiellement payée{sorted.length !== 1 ? 's' : ''}
        </Text>
      ) : null}
    </View>
  )

  return (
    <View style={styles.root}>
      <FlatList
        data={loading ? [] : sorted}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FactureAchatListItem facture={item} onPress={() => setDetail(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <FactureAchatSkeleton />
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
              <Ionicons name="checkmark-circle-outline" size={48} color={theme.success} />
              <Text style={styles.emptyTitle}>Tout est soldé</Text>
              <Text style={styles.emptySub}>
                {searchDebounced
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Aucune facture achat partiellement payée en cours.'}
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

      <FactureAchatDetailSheet
        visible={!!detail}
        facture={detail}
        onClose={() => setDetail(null)}
        onPayer={() => setShowPaiement(true)}
        onValidateValidee={() => {}}
        onValidatePayee={() => {}}
        onMarquerPayee={handleMarquerPayee}
        onPdfDone={(msg) => showMsg(msg)}
        onPdfError={(msg) => showMsg(msg, true)}
        busy={actionBusy}
      />

      <FactureAchatPaiementModal
        visible={showPaiement}
        facture={detail}
        accessToken={accessToken}
        onClose={() => setShowPaiement(false)}
        onSaved={(f) => {
          patchLocal(f)
          showMsg('Paiement enregistré')
        }}
        onError={(msg) => showMsg(msg, true)}
      />

      <AppToast
        message={toast}
        type={toastError ? 'error' : 'success'}
        onDismiss={() => setToast(null)}
      />
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
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: theme.primarySoft,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  kpiTile: { flex: 1, alignItems: 'center', gap: 3 },
  kpiDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#fed7aa' },
  kpiValue: { fontSize: 16, fontWeight: '700', color: theme.primaryDark },
  kpiValueWarn: { color: theme.danger },
  kpiLabel: { fontSize: 11, color: theme.textMuted },
  resultsLabel: { fontSize: 12, color: theme.textSubtle, marginTop: -4 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 10, paddingHorizontal: 32 },
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
