import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from './ui/CenteredBlurModal'
import { fetchVehicules } from '../lib/api'
import { fetchClients } from '../lib/clientApi'
import { getModalLayout } from '../lib/modalLayout'
import { theme } from '../theme/appTheme'
import type { Client } from '../types/client'
import type { Vehicule } from '../types/vehicule'

type Props = {
  visible: boolean
  accessToken: string
  onClose: () => void
  onOpenVehicule: (id: number) => void
  onOpenClients: () => void
}

export default function GlobalSearchModal({
  visible,
  accessToken,
  onClose,
  onOpenVehicule,
  onOpenClients,
}: Props) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loading, setLoading] = useState(false)
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const { cardMaxHeight, scrollMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 620,
    chrome: 120,
  })

  useEffect(() => {
    if (!visible) {
      setQ('')
      setDebounced('')
      setVehicules([])
      setClients([])
    }
  }, [visible])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!visible || debounced.length < 2) {
      setVehicules([])
      setClients([])
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all([
      fetchVehicules(accessToken, { q: debounced, page: 1, limit: 8 }).catch(() => ({
        data: [] as Vehicule[],
      })),
      fetchClients(accessToken, { q: debounced, page: 1, limit: 8 }).catch(() => ({
        data: [] as Client[],
      })),
    ])
      .then(([v, c]) => {
        if (cancelled) return
        setVehicules(Array.isArray(v.data) ? v.data : [])
        setClients(Array.isArray(c.data) ? c.data : [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, debounced, visible])

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={440}>
      <View style={[styles.card, { maxHeight: cardMaxHeight }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Recherche</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.textSubtle} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={setQ}
            placeholder="Immat, modèle, client…"
            placeholderTextColor={theme.textSubtle}
            autoFocus
            returnKeyType="search"
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={{ maxHeight: scrollMaxHeight }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
          ) : debounced.length < 2 ? (
            <Text style={styles.hint}>Tapez au moins 2 caractères</Text>
          ) : (
            <>
              <Text style={styles.section}>Véhicules ({vehicules.length})</Text>
              {vehicules.length === 0 ? (
                <Text style={styles.empty}>Aucun véhicule</Text>
              ) : (
                vehicules.map((v) => (
                  <Pressable
                    key={`v-${v.id}`}
                    style={styles.row}
                    onPress={() => {
                      onClose()
                      onOpenVehicule(v.id)
                    }}
                  >
                    <Ionicons name="car-outline" size={18} color={theme.primary} />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {v.modele}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {v.immatriculation || 'Sans immat.'} · {v.etat_actuel}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                  </Pressable>
                ))
              )}

              <Text style={[styles.section, { marginTop: 14 }]}>Clients ({clients.length})</Text>
              {clients.length === 0 ? (
                <Text style={styles.empty}>Aucun client</Text>
              ) : (
                clients.map((c) => (
                  <Pressable
                    key={`c-${c.id}`}
                    style={styles.row}
                    onPress={() => {
                      onClose()
                      onOpenClients()
                    }}
                  >
                    <Ionicons name="person-outline" size={18} color="#4f46e5" />
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {c.nom}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {[c.telephone, c.email].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                  </Pressable>
                ))
              )}
            </>
          )}
        </ScrollView>
        <View style={{ height: footerPaddingBottom }} />
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  input: { flex: 1, fontSize: 15, color: theme.text, padding: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 12 },
  hint: { textAlign: 'center', color: theme.textMuted, paddingVertical: 24, fontSize: 13 },
  section: { fontSize: 12, fontWeight: '800', color: theme.textMuted, marginBottom: 6 },
  empty: { fontSize: 13, color: theme.textSubtle, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
  rowSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
})
