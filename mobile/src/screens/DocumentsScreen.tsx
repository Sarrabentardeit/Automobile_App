import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import AppToast from '../components/ui/AppToast'
import { apiFetch } from '../lib/api'
import { apiUrl } from '../lib/config'
import { theme } from '../theme/appTheme'

type DocItem = { id: string; title: string; fileName: string; usage: string }
type DocMeta = { fileName: string; exists: boolean; size: number; updatedAt: string | null }

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function docIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'document-text-outline'
  if (ext === 'docx' || ext === 'doc') return 'document-outline'
  if (ext === 'xlsx' || ext === 'xls') return 'grid-outline'
  return 'document-attach-outline'
}

type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

type Props = {
  accessToken: string
  drawerOpen?: boolean
}

export default function DocumentsScreen({ accessToken, drawerOpen = false }: Props) {
  const [docs, setDocs] = useState<DocItem[]>([])
  const [meta, setMeta] = useState<Record<string, DocMeta>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)
  const [dlState, setDlState] = useState<Record<string, DownloadState>>({})

  const showMsg = (msg: string, err = false) => { setToastError(err); setToast(msg) }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [cards, templates] = await Promise.all([
        apiFetch<DocItem[]>('/documents/cards', { token: accessToken }),
        apiFetch<DocMeta[]>('/documents/templates', { token: accessToken }),
      ])
      setDocs(Array.isArray(cards) ? cards : [])
      const map: Record<string, DocMeta> = {}
      if (Array.isArray(templates)) {
        for (const t of templates) map[t.fileName] = t
      }
      setMeta(map)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return docs
    return docs.filter(d =>
      d.title.toLowerCase().includes(q) || d.usage.toLowerCase().includes(q)
    )
  }, [docs, search])

  const handleDownload = async (doc: DocItem) => {
    const fileMeta = meta[doc.fileName]
    if (!fileMeta?.exists) {
      showMsg('Fichier non disponible sur le serveur', true)
      return
    }

    setDlState(s => ({ ...s, [doc.id]: 'downloading' }))
    try {
      const url = apiUrl(`/documents/templates/${encodeURIComponent(doc.fileName)}`)
      const fileUri = FileSystem.cacheDirectory + doc.fileName

      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (result.status !== 200) {
        throw new Error('Téléchargement échoué')
      }

      setDlState(s => ({ ...s, [doc.id]: 'done' }))

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(result.uri)
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
        })
      } else {
        const canShare = await Sharing.isAvailableAsync()
        if (canShare) {
          await Sharing.shareAsync(result.uri, { dialogTitle: doc.title })
        } else {
          Alert.alert('Téléchargé', `Fichier sauvegardé dans le cache.`)
        }
      }

      setTimeout(() => setDlState(s => ({ ...s, [doc.id]: 'idle' })), 3000)
    } catch (e) {
      setDlState(s => ({ ...s, [doc.id]: 'error' }))
      showMsg(e instanceof Error ? e.message : 'Erreur téléchargement', true)
      setTimeout(() => setDlState(s => ({ ...s, [doc.id]: 'idle' })), 3000)
    }
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
      {/* Recherche */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.textSubtle} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Titre, usage…"
            placeholderTextColor={theme.textSubtle}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Compteur */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Liste */}
      <ScrollView contentContainerStyle={styles.listContent} scrollEnabled={!drawerOpen}>
        {filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="folder-open-outline" size={48} color={theme.textSubtle} />
            <Text style={styles.emptyTitle}>Aucun document</Text>
            <Text style={styles.emptySub}>Aucun document correspondant.</Text>
          </View>
        ) : (
          filtered.map(doc => {
            const fileMeta = meta[doc.fileName]
            const exists = !!fileMeta?.exists
            const dlS = dlState[doc.id] ?? 'idle'
            const iconName = docIcon(doc.fileName)

            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docLeft}>
                  <View style={[styles.docIconWrap, !exists && styles.docIconWrapDisabled]}>
                    <Ionicons name={iconName as any} size={22} color={exists ? theme.primaryDark : theme.textSubtle} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={2}>{doc.title}</Text>
                    {doc.usage ? (
                      <Text style={styles.docUsage} numberOfLines={1}>{doc.usage}</Text>
                    ) : null}
                    <View style={styles.docMetaRow}>
                      {exists ? (
                        <>
                          <View style={styles.availBadge}>
                            <View style={styles.availDot} />
                            <Text style={styles.availText}>Disponible</Text>
                          </View>
                          {fileMeta.size ? (
                            <Text style={styles.docSize}>{formatSize(fileMeta.size)}</Text>
                          ) : null}
                          {fileMeta.updatedAt ? (
                            <Text style={styles.docDate}>{formatDate(fileMeta.updatedAt)}</Text>
                          ) : null}
                        </>
                      ) : (
                        <View style={styles.unavailBadge}>
                          <Text style={styles.unavailText}>Non disponible</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.dlBtn,
                    !exists && styles.dlBtnDisabled,
                    dlS === 'downloading' && styles.dlBtnLoading,
                    dlS === 'done' && styles.dlBtnDone,
                    dlS === 'error' && styles.dlBtnError,
                  ]}
                  onPress={() => void handleDownload(doc)}
                  disabled={!exists || dlS === 'downloading'}
                >
                  {dlS === 'downloading' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : dlS === 'done' ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                  ) : dlS === 'error' ? (
                    <Ionicons name="close-circle" size={22} color={theme.danger} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={22} color={exists ? theme.primary : theme.textSubtle} />
                  )}
                </Pressable>
              </View>
            )
          })
        )}
      </ScrollView>

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.borderLight },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text },
  countRow: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 13, color: theme.textMuted, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  docCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 14, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border,
  },
  docLeft: { flexDirection: 'row', gap: 12, flex: 1, alignItems: 'flex-start' },
  docIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  docIconWrapDisabled: { backgroundColor: theme.surfaceMuted },
  docInfo: { flex: 1, gap: 3 },
  docTitle: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 20 },
  docUsage: { fontSize: 12, color: theme.textSubtle },
  docMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  availBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success },
  availText: { fontSize: 11, color: theme.success, fontWeight: '600' },
  unavailBadge: { backgroundColor: theme.danger + '18', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  unavailText: { fontSize: 11, color: theme.danger, fontWeight: '600' },
  docSize: { fontSize: 11, color: theme.textMuted },
  docDate: { fontSize: 11, color: theme.textMuted },
  dlBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  dlBtnDisabled: { backgroundColor: theme.surfaceMuted },
  dlBtnLoading: { backgroundColor: theme.primarySoft },
  dlBtnDone: { backgroundColor: theme.success + '18' },
  dlBtnError: { backgroundColor: theme.danger + '18' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
