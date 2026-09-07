import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import CenteredBlurModal from '../components/ui/CenteredBlurModal'
import {
  createMarque,
  deactivateMarque,
  fetchMarques,
  marqueLogoUri,
  updateMarque,
  type Marque,
} from '../lib/marquesApi'
import { getModalLayout } from '../lib/modalLayout'
import { theme } from '../theme/appTheme'

const PAGE_SIZE = 12

type Props = {
  accessToken: string
  canManage?: boolean
  refreshKey?: number
}

export default function MarquesScreen({ accessToken, canManage = false, refreshKey = 0 }: Props) {
  const [marques, setMarques] = useState<Marque[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Marque | null>(null)
  const [nom, setNom] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [saving, setSaving] = useState(false)

  const { cardMaxHeight, footerPaddingBottom } = getModalLayout({
    maxCard: 520,
    chrome: 140,
  })

  const load = useCallback(async () => {
    const list = await fetchMarques(accessToken, { all: true })
    setMarques(list)
  }, [accessToken])

  useEffect(() => {
    setLoading(true)
    void load()
      .catch(() => setMarques([]))
      .finally(() => setLoading(false))
  }, [load, refreshKey])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return marques
    return marques.filter((m) => m.nom.toLowerCase().includes(q))
  }, [marques, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openAdd = () => {
    setEditing(null)
    setNom('')
    setLogoDataUrl(null)
    setPreviewUri(null)
    setRemoveLogo(false)
    setShowForm(true)
  }

  const openEdit = (m: Marque) => {
    setEditing(m)
    setNom(m.nom)
    setLogoDataUrl(null)
    setPreviewUri(marqueLogoUri(m.logoUrl))
    setRemoveLogo(false)
    setShowForm(true)
  }

  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    })
    if (res.canceled || !res.assets[0]) return
    const asset = res.assets[0]
    let dataUrl = asset.base64
      ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
      : null
    if (!dataUrl && asset.uri) {
      const b64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      dataUrl = `data:image/jpeg;base64,${b64}`
    }
    if (!dataUrl) return
    setLogoDataUrl(dataUrl)
    setPreviewUri(asset.uri)
    setRemoveLogo(false)
  }

  const save = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Nom de marque requis')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateMarque(accessToken, editing.id, {
          nom: nom.trim(),
          logoDataUrl: logoDataUrl ?? undefined,
          removeLogo: removeLogo || undefined,
        })
      } else {
        await createMarque(accessToken, {
          nom: nom.trim(),
          logoDataUrl: logoDataUrl ?? undefined,
        })
      }
      setShowForm(false)
      await load()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Marques</Text>
          <Text style={styles.sub}>
            {marques.filter((m) => m.actif).length} active(s)
          </Text>
        </View>
        {canManage ? (
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Ajouter</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.textSubtle} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor={theme.textSubtle}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pageItems}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load().finally(() => setRefreshing(false))
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune marque</Text>
          }
          ListFooterComponent={
            filtered.length > 0 && totalPages > 1 ? (
              <View style={styles.pagination}>
                <Text style={styles.paginationLabel}>
                  Page {page} / {totalPages} ({filtered.length})
                </Text>
                <View style={styles.paginationBtns}>
                  <Pressable
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Ionicons name="chevron-back" size={20} color="#374151" />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.pageBtn,
                      page >= totalPages && styles.pageBtnDisabled,
                    ]}
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#374151" />
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, !item.actif && styles.cardInactive]}
              onPress={() => (canManage ? openEdit(item) : undefined)}
            >
              <View style={styles.logoBox}>
                {item.logoUrl ? (
                  <Image
                    source={{ uri: marqueLogoUri(item.logoUrl)! }}
                    style={styles.logoImg}
                  />
                ) : (
                  <Ionicons name="pricetag-outline" size={28} color="#fdba74" />
                )}
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.nom}
              </Text>
              {!item.actif ? (
                <Text style={styles.inactive}>Inactive</Text>
              ) : null}
              {canManage ? (
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => openEdit(item)}
                    style={styles.miniBtn}
                  >
                    <Ionicons name="pencil" size={14} color={theme.textSecondary} />
                  </Pressable>
                  {item.actif ? (
                    <Pressable
                      onPress={() => {
                        Alert.alert('Désactiver', `Désactiver « ${item.nom} » ?`, [
                          { text: 'Annuler', style: 'cancel' },
                          {
                            text: 'Désactiver',
                            style: 'destructive',
                            onPress: () => {
                              void deactivateMarque(accessToken, item.id)
                                .then(load)
                                .catch((e) =>
                                  Alert.alert(
                                    'Erreur',
                                    e instanceof Error ? e.message : 'Erreur'
                                  )
                                )
                            },
                          },
                        ])
                      }}
                      style={styles.miniBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        void updateMarque(accessToken, item.id, { actif: true })
                          .then(load)
                          .catch((e) =>
                            Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur')
                          )
                      }}
                      style={styles.miniBtn}
                    >
                      <Ionicons name="refresh" size={14} color={theme.success} />
                    </Pressable>
                  )}
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <CenteredBlurModal visible={showForm} onClose={() => setShowForm(false)} maxWidth={420}>
        <View style={[styles.modalCard, { maxHeight: cardMaxHeight }]}>
          <Text style={styles.modalTitle}>
            {editing ? 'Modifier la marque' : 'Ajouter une marque'}
          </Text>
          <Pressable style={styles.logoPick} onPress={() => void pickLogo()}>
            {previewUri && !removeLogo ? (
              <Image source={{ uri: previewUri }} style={styles.logoPickImg} />
            ) : (
              <Ionicons name="image-outline" size={32} color={theme.textMuted} />
            )}
            <Text style={styles.logoPickText}>Choisir un logo</Text>
          </Pressable>
          {(previewUri || editing?.logoUrl) && !removeLogo ? (
            <Pressable
              onPress={() => {
                setLogoDataUrl(null)
                setPreviewUri(null)
                setRemoveLogo(true)
              }}
            >
              <Text style={styles.removeLogo}>Retirer le logo</Text>
            </Pressable>
          ) : null}
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Nom de la marque"
            placeholderTextColor={theme.textSubtle}
          />
          <View style={[styles.modalFooter, { paddingBottom: footerPaddingBottom }]}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Enregistrer</Text>
              )}
            </Pressable>
          </View>
        </View>
      </CenteredBlurModal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, padding: 0 },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 40 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 8,
    gap: 12,
  },
  paginationLabel: { flex: 1, fontSize: 12, color: theme.textMuted },
  paginationBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.35 },
  card: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    minWidth: '45%',
  },
  cardInactive: { opacity: 0.55 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  logoImg: { width: 56, height: 56, resizeMode: 'contain' },
  cardName: { fontSize: 15, fontWeight: '800', color: theme.text },
  inactive: { fontSize: 10, color: theme.textMuted, marginTop: 4, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 18,
    width: '100%',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 14 },
  logoPick: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    marginBottom: 8,
    gap: 6,
  },
  logoPickImg: { width: 72, height: 72, resizeMode: 'contain' },
  logoPickText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  removeLogo: {
    textAlign: 'center',
    color: theme.danger,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.bg,
    marginBottom: 14,
  },
  modalFooter: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },
})
