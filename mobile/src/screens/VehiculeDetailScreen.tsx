import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import ChangeEtatModal from '../components/ChangeEtatModal'
import ModalBlurBackdrop from '../components/ui/ModalBlurBackdrop'
import OrdreFormModal from '../components/OrdreFormModal'
import SuiviFormModal from '../components/SuiviFormModal'
import VehiculeFicheFinanciereModal from '../components/VehiculeFicheFinanciereModal'
import VehiculeFormModal from '../components/VehiculeFormModal'
import NotificationsBell from '../components/NotificationsBell'
import VehiculeStats from '../components/VehiculeStats'
import type { VehiculeOpenOptions } from '../navigation/vehiculeNav'
import type { StoredUser } from '../lib/authStorage'
import { userNames } from '../lib/assignees'
import { downloadOrdreExcel, downloadSuiviExcel } from '../lib/downloadExcel'
import { printOrdre, printSuivi } from '../lib/printDocuments'
import { daysSince, formatDate, formatDuree } from '../lib/format'
import { getStatusBarInset } from '../lib/safeArea'
import {
  changeEtat,
  deleteOrdre,
  deleteSuivi,
  deleteVehicule,
  deleteVehiculeImage,
  fetchHistorique,
  fetchImages,
  fetchOrdres,
  fetchSuivis,
  fetchUsers,
  fetchVehicule,
  mediaUrl,
  uploadVehiculeImage,
  userName,
  type AppUser,
} from '../lib/vehiculeApi'
import {
  ETAT_CONFIG,
  IMAGE_CATEGORIES,
  type EtatVehicule,
  type HistoriqueEtat,
  type OrdreReparation,
  type Vehicule,
  type VehiculeImage,
  type VehiculeImageCategory,
  type VehiculeSuivi,
} from '../types/vehicule'

type TabId = 'resume' | 'historique' | 'ordres' | 'suivis' | 'photos'

type Props = {
  vehiculeId: number
  accessToken: string
  user: StoredUser
  archives?: boolean
  initialTab?: VehiculeOpenOptions['initialTab']
  onBack: () => void
  onOpenVehicule?: (vehiculeId: number) => void
}

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'resume', label: 'Résumé', icon: 'information-circle-outline' },
  { id: 'historique', label: 'Historique', icon: 'time-outline' },
  { id: 'ordres', label: 'Ordres OR', icon: 'document-text-outline' },
  { id: 'suivis', label: 'Suivis', icon: 'clipboard-outline' },
  { id: 'photos', label: 'Photos', icon: 'images-outline' },
]

function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

export default function VehiculeDetailScreen({
  vehiculeId,
  accessToken,
  user,
  archives = false,
  initialTab,
  onBack,
  onOpenVehicule,
}: Props) {
  const [vehicule, setVehicule] = useState<Vehicule | null>(null)
  const [historique, setHistorique] = useState<HistoriqueEtat[]>([])
  const [ordres, setOrdres] = useState<OrdreReparation[]>([])
  const [suivis, setSuivis] = useState<VehiculeSuivi[]>([])
  const [images, setImages] = useState<VehiculeImage[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [tab, setTab] = useState<TabId>('resume')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChangeEtat, setShowChangeEtat] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [expandedOrdre, setExpandedOrdre] = useState<number | null>(null)
  const [expandedSuivi, setExpandedSuivi] = useState<number | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showOrdreForm, setShowOrdreForm] = useState(false)
  const [editingOrdre, setEditingOrdre] = useState<OrdreReparation | null>(null)
  const [showSuiviForm, setShowSuiviForm] = useState(false)
  const [editingSuivi, setEditingSuivi] = useState<VehiculeSuivi | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [imageCategory, setImageCategory] = useState<VehiculeImageCategory>('etat_exterieur')
  const [imageNote, setImageNote] = useState('')
  const [showFicheFinanciere, setShowFicheFinanciere] = useState(false)
  const [excelLoadingId, setExcelLoadingId] = useState<string | null>(null)

  const permissions = user.permissions
  const canEditFicheFinanciere =
    permissions.canEditVehicule || permissions.canViewFinance
  const canEdit =
    permissions.canEditVehicule ||
    permissions.canAddVehicule ||
    permissions.canChangeEtat
  const canChangeEtat =
    permissions.canChangeEtat &&
    (archives || vehicule?.etat_actuel !== 'vert') &&
    (permissions.vehiculeVisibility === 'all' ||
      vehicule?.technicien_id === user.id ||
      (vehicule?.technicien_ids?.includes(user.id) ?? false))

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab, vehiculeId])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [v, h, o, s, img, u] = await Promise.all([
        fetchVehicule(accessToken, vehiculeId),
        fetchHistorique(accessToken, vehiculeId),
        fetchOrdres(accessToken, vehiculeId).catch(() => [] as OrdreReparation[]),
        fetchSuivis(accessToken, vehiculeId).catch(() => [] as VehiculeSuivi[]),
        fetchImages(accessToken, vehiculeId).catch(() => [] as VehiculeImage[]),
        fetchUsers(accessToken).catch(() => [] as AppUser[]),
      ])
      setVehicule(v)
      setHistorique(h)
      setOrdres(o)
      setSuivis(s)
      setImages(img)
      setUsers(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
      setVehicule(null)
    }
  }, [accessToken, vehiculeId])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const callClient = () => {
    const tel = vehicule?.client_telephone?.replace(/\s/g, '')
    if (!tel) {
      Alert.alert('Téléphone', 'Aucun numéro client')
      return
    }
    void Linking.openURL(`tel:${tel}`)
  }

  const handleChangeEtat = async (
    etat: EtatVehicule,
    commentaire: string,
    pieces: string
  ) => {
    const updated = await changeEtat(accessToken, vehiculeId, {
      nouvel_etat: etat,
      commentaire,
      pieces_utilisees: pieces,
    })
    setVehicule(updated)
    const h = await fetchHistorique(accessToken, vehiculeId)
    setHistorique(h)
    Alert.alert('Succès', 'État mis à jour')
  }

  const techDefaut = userName(users, vehicule?.technicien_id ?? null)

  const pickAndUploadPhoto = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisez l’accès aux photos.')
      return
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.75, base64: true })
    if (result.canceled || !result.assets?.[0]?.base64) return
    const asset = result.assets[0]
    setUploadingPhoto(true)
    try {
      const mime = asset.mimeType ?? 'image/jpeg'
      await uploadVehiculeImage(accessToken, vehiculeId, {
        dataUrl: `data:${mime};base64,${asset.base64}`,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        category: imageCategory,
        note: imageNote.trim(),
      })
      setImageNote('')
      const img = await fetchImages(accessToken, vehiculeId)
      setImages(img)
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Upload impossible')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSuiviExcel = async (s: VehiculeSuivi) => {
    const key = `suivi-${s.id}`
    setExcelLoadingId(key)
    try {
      await downloadSuiviExcel(accessToken, vehiculeId, s.id, s.numero)
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export Excel impossible')
    } finally {
      setExcelLoadingId(null)
    }
  }

  const handleOrdreExcel = async (o: OrdreReparation) => {
    const key = `ordre-${o.id}`
    setExcelLoadingId(key)
    try {
      await downloadOrdreExcel(accessToken, vehiculeId, o.id, o.numero)
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export Excel impossible')
    } finally {
      setExcelLoadingId(null)
    }
  }

  const confirmDeleteVehicule = () => {
    Alert.alert('Supprimer', 'Supprimer ce véhicule ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteVehicule(accessToken, vehiculeId)
              onBack()
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible')
            }
          })()
        },
      },
    ])
  }

  const statusBarInset = getStatusBarInset()

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: statusBarInset }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    )
  }

  if (error || !vehicule) {
    return (
      <View style={[styles.centered, { paddingTop: statusBarInset }]}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>{error ?? 'Véhicule introuvable'}</Text>
        <Pressable style={styles.btnOrange} onPress={onBack}>
          <Text style={styles.btnOrangeText}>Retour</Text>
        </Pressable>
      </View>
    )
  }

  const cfg = ETAT_CONFIG[vehicule.etat_actuel] ?? {
    label: vehicule.etat_actuel,
    color: '#6b7280',
    description: '',
  }
  const jours = daysSince(vehicule.date_entree)
  const minutesInState = Math.max(
    0,
    Math.round(
      (Date.now() - new Date(vehicule.derniere_mise_a_jour).getTime()) / 60000
    )
  )
  const showHeroActions =
    canChangeEtat || permissions.canEditVehicule || canEditFicheFinanciere

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.topBar, { paddingTop: statusBarInset + 6 }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#374151" />
          <Text style={styles.backBtnText}>Retour</Text>
        </Pressable>
        <View style={styles.topBarBell}>
          <NotificationsBell
            accessToken={accessToken}
            userId={user.id}
            iconColor="#374151"
            onOpenVehicule={(id) => {
              if (id === vehiculeId) return
              if (onOpenVehicule) onOpenVehicule(id)
              else onBack()
            }}
          />
        </View>
      </View>

      <View style={styles.hero}>
        <View style={[styles.heroBar, { backgroundColor: cfg.color }]} />
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <Ionicons
              name={vehicule.type === 'moto' ? 'bicycle' : 'car'}
              size={22}
              color={cfg.color}
            />
            <Text style={styles.heroModel}>{vehicule.modele}</Text>
            <View style={[styles.heroBadge, { backgroundColor: cfg.color }]}>
              <Text style={styles.heroBadgeText}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={styles.heroImmat}>
            {vehicule.immatriculation || 'Sans immatriculation'}
          </Text>
          {vehicule.defaut ? (
            <Text style={styles.heroDefaut}>{vehicule.defaut}</Text>
          ) : null}
          <View style={styles.durationBlock}>
            <View style={styles.durationBar}>
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
              <Text style={styles.durationBarText}>
                <Text style={styles.durationBold}>{jours}j</Text>
                <Text style={styles.durationMuted}> au garage</Text>
              </Text>
            </View>
            <View style={[styles.durationBar, { backgroundColor: `${cfg.color}12` }]}>
              <Ionicons name="time-outline" size={16} color={cfg.color} />
              <Text style={styles.durationBarText} numberOfLines={2}>
                <Text style={[styles.durationBold, { color: cfg.color }]}>
                  {formatDuree(minutesInState)}
                </Text>
                <Text style={styles.durationMuted}> en {cfg.label}</Text>
              </Text>
            </View>
          </View>

          {showHeroActions ? (
            <View style={styles.heroActions}>
              {canChangeEtat ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.heroBtnPrimary,
                    pressed && styles.heroBtnPressed,
                  ]}
                  onPress={() => setShowChangeEtat(true)}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#fff" />
                  <Text style={styles.heroBtnPrimaryText} numberOfLines={1}>
                    Changer l&apos;état
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [
                  styles.heroBtnOutline,
                  pressed && styles.heroBtnOutlinePressed,
                  { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
                ]}
                onPress={() => setShowFicheFinanciere(true)}
              >
                <Ionicons name="wallet-outline" size={16} color="#059669" />
                <Text style={[styles.heroBtnOutlineText, { color: '#059669' }]}>
                  Fiche fin.
                </Text>
              </Pressable>
              {permissions.canEditVehicule ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.heroBtnOutline,
                    pressed && styles.heroBtnOutlinePressed,
                  ]}
                  onPress={() => setShowEdit(true)}
                >
                  <Ionicons name="pencil-outline" size={16} color="#374151" />
                  <Text style={styles.heroBtnOutlineText}>Modifier</Text>
                </Pressable>
              ) : null}
              {permissions.canEditVehicule ? (
                <Pressable style={styles.heroBtnDanger} onPress={confirmDeleteVehicule}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && styles.tabActive]}
          >
            <Ionicons
              name={t.icon}
              size={15}
              color={tab === t.id ? '#fff' : '#6b7280'}
            />
            <Text
              style={[styles.tabText, tab === t.id && styles.tabTextActive]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
            {t.id === 'ordres' && ordres.length > 0 ? (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{ordres.length}</Text>
              </View>
            ) : null}
            {t.id === 'suivis' && suivis.length > 0 ? (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{suivis.length}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'resume' && (
          <>
            <SectionCard title="Informations">
              <InfoLine
                icon="person-outline"
                label="Technicien"
                value={userNames(users, vehicule.technicien_ids, vehicule.technicien_id)}
              />
              <InfoLine
                icon="shield-outline"
                label="Responsable"
                value={userNames(users, vehicule.responsable_ids, vehicule.responsable_id)}
              />
              <InfoLine
                icon="call-outline"
                label="Tél. client"
                value={vehicule.client_telephone || '—'}
                onPress={vehicule.client_telephone ? callClient : undefined}
                link={!!vehicule.client_telephone}
              />
              <InfoLine icon="calendar-outline" label="Date entrée" value={formatDate(vehicule.date_entree)} />
              {vehicule.date_sortie ? (
                <InfoLine icon="checkmark-circle-outline" label="Date sortie" value={formatDate(vehicule.date_sortie)} />
              ) : null}
              {vehicule.service_type ? (
                <InfoLine icon="construct-outline" label="Service" value={vehicule.service_type} />
              ) : null}
            </SectionCard>
            {vehicule.notes ? (
              <SectionCard title="Notes">
                <Text style={styles.notesText}>{vehicule.notes}</Text>
              </SectionCard>
            ) : null}
          </>
        )}

        {tab === 'historique' && (
          <>
            <SectionCard title="Statistiques">
              <VehiculeStats historique={historique} dateEntree={vehicule.date_entree} />
            </SectionCard>
            <SectionCard title="Historique des états">
            {historique.length === 0 ? (
              <Text style={styles.empty}>Aucun historique</Text>
            ) : (
              historique.map((h, idx) => {
                const nCfg = ETAT_CONFIG[h.etat_nouveau] ?? { label: h.etat_nouveau, color: '#6b7280' }
                const isLast = idx === historique.length - 1
                return (
                  <View key={h.id} style={styles.timelineItem}>
                    {!isLast ? <View style={styles.timelineLine} /> : null}
                    <View style={[styles.timelineDot, { backgroundColor: nCfg.color }]} />
                    <View style={styles.timelineBody}>
                      <View style={styles.timelineHeader}>
                        <Text style={[styles.timelineEtat, { color: nCfg.color }]}>
                          {nCfg.label}
                        </Text>
                        <Text style={styles.timelineDate}>
                          {formatDate(h.date_changement)}
                        </Text>
                      </View>
                      <Text style={styles.timelineUser}>{h.utilisateur_nom}</Text>
                      {h.duree_etat_precedent_minutes != null ? (
                        <Text style={styles.timelineMeta}>
                          Durée état précédent : {formatDuree(h.duree_etat_precedent_minutes)}
                        </Text>
                      ) : null}
                      {h.commentaire ? (
                        <Text style={styles.timelineComment}>{h.commentaire}</Text>
                      ) : null}
                      {h.pieces_utilisees ? (
                        <Text style={styles.timelinePieces}>Pièces : {h.pieces_utilisees}</Text>
                      ) : null}
                    </View>
                  </View>
                )
              })
            )}
            </SectionCard>
          </>
        )}

        {tab === 'ordres' && (
          <SectionCard title="Ordres de réparation">
            {canEdit ? (
              <Pressable
                style={styles.addRowBtn}
                onPress={() => {
                  setEditingOrdre(null)
                  setShowOrdreForm(true)
                }}
              >
                <Ionicons name="add-circle" size={20} color="#6366f1" />
                <Text style={styles.addRowBtnText}>Nouvel ordre</Text>
              </Pressable>
            ) : null}
            {ordres.length === 0 ? (
              <Text style={styles.empty}>Aucun ordre de réparation</Text>
            ) : (
              ordres.map((o) => {
                const open = expandedOrdre === o.id
                const done = o.lignes.filter((l) => l.statut === 'fait').length
                return (
                  <Pressable
                    key={o.id}
                    style={styles.listItem}
                    onPress={() => setExpandedOrdre(open ? null : o.id)}
                  >
                    <View style={styles.listItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listItemTitle}>{o.numero}</Text>
                        <Text style={styles.listItemSub}>
                          {formatDate(o.dateEntree)} · {o.technicien || '—'}
                        </Text>
                      </View>
                      <Text style={styles.listItemMeta}>
                        {done}/{o.lignes.length} fait
                      </Text>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#9ca3af"
                      />
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable
                        onPress={() => {
                          void printOrdre(o).catch((e) =>
                            Alert.alert(
                              'Impression',
                              e instanceof Error ? e.message : 'Impression impossible'
                            )
                          )
                        }}
                      >
                        <Ionicons name="print-outline" size={18} color="#4b5563" />
                      </Pressable>
                      <Pressable
                        onPress={() => void handleOrdreExcel(o)}
                        disabled={excelLoadingId === `ordre-${o.id}`}
                      >
                        <Ionicons name="document-text-outline" size={18} color="#059669" />
                      </Pressable>
                      {canEdit ? (
                        <Pressable
                          onPress={() => {
                            setEditingOrdre(o)
                            setShowOrdreForm(true)
                          }}
                        >
                          <Ionicons name="pencil" size={18} color="#6366f1" />
                        </Pressable>
                      ) : null}
                      {canEdit ? (
                        <Pressable
                          onPress={() =>
                            Alert.alert('Supprimer', 'Supprimer cet ordre ?', [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => {
                                  void deleteOrdre(accessToken, vehiculeId, o.id).then(() =>
                                    void load()
                                  )
                                },
                              },
                            ])
                          }
                        >
                          <Ionicons name="trash-outline" size={18} color="#dc2626" />
                        </Pressable>
                      ) : null}
                    </View>
                    {open ? (
                      <View style={styles.listItemBody}>
                        <Text style={styles.detailLine}>Client : {o.clientNom}</Text>
                        <Text style={styles.detailLine}>VIN : {o.vin || '—'}</Text>
                        {o.lignes.map((l) => (
                          <View key={l.id} style={styles.ligneRow}>
                            <Ionicons
                              name={
                                l.statut === 'fait'
                                  ? 'checkmark-circle'
                                  : l.statut === 'na'
                                    ? 'remove-circle'
                                    : 'ellipse-outline'
                              }
                              size={16}
                              color={
                                l.statut === 'fait'
                                  ? '#22c55e'
                                  : l.statut === 'na'
                                    ? '#9ca3af'
                                    : '#f97316'
                              }
                            />
                            <Text style={styles.ligneText}>{l.description}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                )
              })
            )}
          </SectionCard>
        )}

        {tab === 'suivis' && (
          <SectionCard title="Fiches suivi">
            {canEdit ? (
              <Pressable
                style={styles.addRowBtn}
                onPress={() => {
                  setEditingSuivi(null)
                  setShowSuiviForm(true)
                }}
              >
                <Ionicons name="add-circle" size={20} color="#f97316" />
                <Text style={styles.addRowBtnText}>Nouvelle fiche</Text>
              </Pressable>
            ) : null}
            {suivis.length === 0 ? (
              <Text style={styles.empty}>Aucune fiche suivi</Text>
            ) : (
              suivis.map((s) => {
                const open = expandedSuivi === s.id
                return (
                  <Pressable
                    key={s.id}
                    style={styles.listItem}
                    onPress={() => setExpandedSuivi(open ? null : s.id)}
                  >
                    <View style={styles.listItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listItemTitle}>{s.numero}</Text>
                        <Text style={styles.listItemSub}>
                          {formatDate(s.date)} · {s.technicien || '—'}
                        </Text>
                      </View>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#9ca3af"
                      />
                    </View>
                    <View style={styles.itemActions}>
                      <Pressable
                        onPress={() => {
                          void printSuivi(s).catch((e) =>
                            Alert.alert(
                              'Impression',
                              e instanceof Error ? e.message : 'Impression impossible'
                            )
                          )
                        }}
                      >
                        <Ionicons name="print-outline" size={18} color="#4b5563" />
                      </Pressable>
                      <Pressable
                        onPress={() => void handleSuiviExcel(s)}
                        disabled={excelLoadingId === `suivi-${s.id}`}
                      >
                        <Ionicons name="document-text-outline" size={18} color="#059669" />
                      </Pressable>
                      {canEdit ? (
                        <Pressable
                          onPress={() => {
                            setEditingSuivi(s)
                            setShowSuiviForm(true)
                          }}
                        >
                          <Ionicons name="pencil" size={18} color="#f97316" />
                        </Pressable>
                      ) : null}
                      {canEdit ? (
                        <Pressable
                          onPress={() =>
                            Alert.alert('Supprimer', 'Supprimer cette fiche ?', [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => {
                                  void deleteSuivi(accessToken, vehiculeId, s.id).then(() =>
                                    void load()
                                  )
                                },
                              },
                            ])
                          }
                        >
                          <Ionicons name="trash-outline" size={18} color="#dc2626" />
                        </Pressable>
                      ) : null}
                    </View>
                    {open ? (
                      <View style={styles.listItemBody}>
                        {s.travauxEffectues ? (
                          <>
                            <Text style={styles.suiviLabel}>Travaux effectués</Text>
                            <Text style={styles.suiviText}>{s.travauxEffectues}</Text>
                          </>
                        ) : null}
                        {s.travauxProchains ? (
                          <>
                            <Text style={styles.suiviLabel}>Travaux prochains</Text>
                            <Text style={styles.suiviText}>{s.travauxProchains}</Text>
                          </>
                        ) : null}
                        {s.produitsUtilises ? (
                          <>
                            <Text style={styles.suiviLabel}>Produits</Text>
                            <Text style={styles.suiviText}>{s.produitsUtilises}</Text>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                )
              })
            )}
          </SectionCard>
        )}

        {tab === 'photos' && (
          <SectionCard title="Photos">
            {permissions.canEditVehicule || permissions.canAddVehicule ? (
              <>
              <Text style={styles.photoSectionLabel}>Catégorie</Text>
              <View style={styles.photoCategoryRow}>
                {IMAGE_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => setImageCategory(c.value)}
                    style={[
                      styles.photoCategoryChip,
                      imageCategory === c.value && styles.photoCategoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.photoCategoryChipText,
                        imageCategory === c.value && styles.photoCategoryChipTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.photoSectionLabel}>Note (optionnel)</Text>
              <TextInput
                style={styles.photoNoteInput}
                value={imageNote}
                onChangeText={setImageNote}
                placeholder="Ex. rayure portière gauche"
                placeholderTextColor="#9ca3af"
              />
              <View style={styles.photoActions}>
                <Pressable
                  style={styles.photoActionBtn}
                  disabled={uploadingPhoto}
                  onPress={() => void pickAndUploadPhoto(true)}
                >
                  <Ionicons name="camera-outline" size={18} color="#374151" />
                  <Text style={styles.photoActionText}>Caméra</Text>
                </Pressable>
                <Pressable
                  style={styles.photoActionBtn}
                  disabled={uploadingPhoto}
                  onPress={() => void pickAndUploadPhoto(false)}
                >
                  <Ionicons name="images-outline" size={18} color="#374151" />
                  <Text style={styles.photoActionText}>Galerie</Text>
                </Pressable>
              </View>
              </>
            ) : null}
            {uploadingPhoto ? (
              <ActivityIndicator color="#f97316" style={{ marginVertical: 12 }} />
            ) : null}
            {images.length === 0 ? (
              <Text style={styles.empty}>Aucune photo</Text>
            ) : (
              <View style={styles.photoGrid}>
                {images.map((img) => (
                  <View key={img.id} style={styles.photoCell}>
                    <Pressable onPress={() => setPreviewImage(mediaUrl(img.url_path))}>
                      <Image
                        source={{ uri: mediaUrl(img.url_path) }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                    </Pressable>
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {img.note ||
                        IMAGE_CATEGORIES.find((c) => c.value === img.category)?.label ||
                        formatDate(img.created_at)}
                    </Text>
                    {permissions.canEditVehicule ? (
                      <Pressable
                        onPress={() =>
                          Alert.alert('Supprimer', 'Supprimer cette photo ?', [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Supprimer',
                              style: 'destructive',
                              onPress: () => {
                                void deleteVehiculeImage(accessToken, vehiculeId, img.id).then(
                                  async () => setImages(await fetchImages(accessToken, vehiculeId))
                                )
                              },
                            },
                          ])
                        }
                      >
                        <Text style={styles.photoDelete}>Supprimer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}
      </ScrollView>

      <VehiculeFicheFinanciereModal
        visible={showFicheFinanciere}
        vehicule={vehicule}
        accessToken={accessToken}
        canEdit={canEditFicheFinanciere}
        onClose={() => setShowFicheFinanciere(false)}
      />

      <ChangeEtatModal
        visible={showChangeEtat}
        vehicule={vehicule}
        onClose={() => setShowChangeEtat(false)}
        onConfirm={handleChangeEtat}
      />

      <VehiculeFormModal
        visible={showEdit}
        vehicule={vehicule}
        accessToken={accessToken}
        onClose={() => setShowEdit(false)}
        onSaved={(v) => {
          setVehicule(v)
          void load()
        }}
      />

      {vehicule ? (
        <>
          <OrdreFormModal
            visible={showOrdreForm}
            vehicule={vehicule}
            ordre={editingOrdre}
            accessToken={accessToken}
            technicienDefaut={techDefaut}
            userName={user.fullName}
            onClose={() => {
              setShowOrdreForm(false)
              setEditingOrdre(null)
            }}
            onSaved={() => void load()}
          />
          <SuiviFormModal
            visible={showSuiviForm}
            vehiculeId={vehiculeId}
            vehiculeModele={vehicule.modele}
            vehiculeImmat={vehicule.immatriculation}
            suivi={editingSuivi}
            accessToken={accessToken}
            userName={user.fullName}
            onClose={() => {
              setShowSuiviForm(false)
              setEditingSuivi(null)
            }}
            onSaved={() => void load()}
          />
        </>
      ) : null}

      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <ModalBlurBackdrop onPress={() => setPreviewImage(null)} />
          <View style={styles.previewContent}>
            {previewImage ? (
              <Image source={{ uri: previewImage }} style={styles.previewImg} resizeMode="contain" />
            ) : null}
          </View>
          <Pressable style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}

function InfoLine({
  icon,
  label,
  value,
  onPress,
  link,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
  link?: boolean
}) {
  const content = (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={18} color={link ? '#f97316' : '#9ca3af'} />
      <View style={styles.infoLineText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, link && styles.infoLink]}>{value}</Text>
      </View>
    </View>
  )
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>
  }
  return content
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
  btnOrange: {
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnOrangeText: { color: '#fff', fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  topBarBell: { marginRight: -8 },
  photoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  photoCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  photoCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  photoCategoryChipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  photoCategoryChipText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  photoCategoryChipTextActive: { color: '#fff' },
  photoNoteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#111827',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  heroBtnPrimary: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  heroBtnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  heroBtnOutline: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  heroBtnOutlineText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  heroBtnDanger: {
    flexShrink: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  heroBtnPressed: { backgroundColor: '#ea580c' },
  heroBtnOutlinePressed: { backgroundColor: '#f9fafb' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
  },
  addRowBtnText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  itemActions: { flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'flex-end' },
  photoActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoActionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  photoDelete: { fontSize: 11, color: '#dc2626', marginTop: 4 },
  hero: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroBar: { width: 5 },
  heroContent: { flex: 1, padding: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  heroModel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  heroBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 0 },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  heroImmat: { fontSize: 13, color: '#6b7280', fontFamily: 'monospace', marginTop: 4 },
  heroDefaut: { fontSize: 14, color: '#374151', marginTop: 8, fontWeight: '500' },
  durationBlock: { gap: 8, marginTop: 12 },
  durationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  durationBarText: { flex: 1, fontSize: 13 },
  durationBold: { fontWeight: '800', color: '#1f2937' },
  durationMuted: { color: '#6b7280', fontWeight: '500' },
  tabBarWrap: {
    backgroundColor: '#f3f4f6',
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBarContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  tabCount: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  tabCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  body: { padding: 12, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoLine: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  infoLineText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  infoLink: { color: '#f97316' },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  timelineItem: { flexDirection: 'row', marginBottom: 16, position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 14,
    bottom: -16,
    width: 2,
    backgroundColor: '#e5e7eb',
  },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
  timelineBody: { flex: 1 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineEtat: { fontSize: 14, fontWeight: '800' },
  timelineDate: { fontSize: 11, color: '#9ca3af' },
  timelineUser: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  timelineMeta: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  timelineComment: { fontSize: 13, color: '#374151', marginTop: 6 },
  timelinePieces: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 12,
  },
  listItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  listItemSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  listItemMeta: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  listItemBody: { marginTop: 10, paddingLeft: 4 },
  detailLine: { fontSize: 13, color: '#374151', marginBottom: 4 },
  ligneRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6 },
  ligneText: { flex: 1, fontSize: 13, color: '#374151' },
  suiviLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', marginTop: 8 },
  suiviText: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCell: { width: '47%', marginBottom: 8 },
  photoImg: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#e5e7eb' },
  photoCaption: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 12,
  },
  previewImg: { width: '100%', height: '80%' },
  previewClose: { position: 'absolute', top: 48, right: 24, zIndex: 2, elevation: 14 },
})
