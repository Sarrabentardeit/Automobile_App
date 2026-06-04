import { useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from './ui/CenteredBlurModal'
import ModalBlurBackdrop from './ui/ModalBlurBackdrop'
import * as ImagePicker from 'expo-image-picker'
import { BRAND_OPTIONS, parseMarqueModele } from '../constants/brands'
import { getStatusBarInset } from '../lib/safeArea'
import { notifyAssignedUsers } from '../lib/notifications'
import {
  createVehicule,
  fetchAssignableUsers,
  updateVehicule,
  uploadVehiculeImage,
  type AppUser,
} from '../lib/vehiculeApi'
import {
  ETAT_CONFIG,
  ETATS_ENTREE,
  IMAGE_CATEGORIES,
  SERVICE_OPTIONS,
  type EtatVehicule,
  type Vehicule,
  type ServiceType,
  type VehiculeFormData,
  type VehiculeImageCategory,
  type VehiculeImageUploadInput,
  type VehiculeType,
} from '../types/vehicule'

const today = () => new Date().toISOString().split('T')[0]
const MAX_IMAGES = 12

type Props = {
  visible: boolean
  vehicule: Vehicule | null
  accessToken: string
  onClose: () => void
  onSaved: (v: Vehicule) => void
}

type PendingImage = {
  id: string
  uri: string
  payload: VehiculeImageUploadInput
}

export default function VehiculeFormModal({
  visible,
  vehicule,
  accessToken,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!vehicule
  const parsed = parseMarqueModele(vehicule?.modele ?? '')

  const [users, setUsers] = useState<AppUser[]>([])
  const [marque, setMarque] = useState(parsed.marque)
  const [form, setForm] = useState<VehiculeFormData>({
    modele: parsed.modele,
    immatriculation: vehicule?.immatriculation ?? '',
    type: vehicule?.type ?? 'voiture',
    etat_initial: vehicule?.etat_actuel ?? 'orange',
    date_entree: vehicule?.date_entree ?? today(),
    defaut: vehicule?.defaut ?? '',
    technicien_id: vehicule?.technicien_id ?? null,
    responsable_id: vehicule?.responsable_id ?? null,
    technicien_ids: vehicule?.technicien_ids?.length
      ? vehicule.technicien_ids
      : vehicule?.technicien_id
        ? [vehicule.technicien_id]
        : [],
    responsable_ids: vehicule?.responsable_ids?.length
      ? vehicule.responsable_ids
      : vehicule?.responsable_id
        ? [vehicule.responsable_id]
        : [],
    client_telephone: vehicule?.client_telephone ?? '',
    notes: vehicule?.notes ?? '',
    service_type: (vehicule?.service_type as ServiceType | undefined) ?? 'diagnostic',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [imageCategory, setImageCategory] = useState<VehiculeImageCategory>('etat_exterieur')
  const [imageNote, setImageNote] = useState('')
  const [showMarquePicker, setShowMarquePicker] = useState(false)
  const statusBarInset = getStatusBarInset()
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 680)

  useEffect(() => {
    if (!visible) return
    setShowMarquePicker(false)
    const p = parseMarqueModele(vehicule?.modele ?? '')
    setMarque(p.marque)
    setForm({
      modele: p.modele,
      immatriculation: vehicule?.immatriculation ?? '',
      type: vehicule?.type ?? 'voiture',
      etat_initial: vehicule?.etat_actuel ?? 'orange',
      date_entree: vehicule?.date_entree ?? today(),
      defaut: vehicule?.defaut ?? '',
      technicien_id: vehicule?.technicien_id ?? null,
      responsable_id: vehicule?.responsable_id ?? null,
      technicien_ids: vehicule?.technicien_ids?.length
        ? vehicule.technicien_ids
        : vehicule?.technicien_id
          ? [vehicule.technicien_id]
          : [],
      responsable_ids: vehicule?.responsable_ids?.length
        ? vehicule.responsable_ids
        : vehicule?.responsable_id
          ? [vehicule.responsable_id]
          : [],
      client_telephone: vehicule?.client_telephone ?? '',
      notes: vehicule?.notes ?? '',
      service_type: (vehicule?.service_type as ServiceType | undefined) ?? 'diagnostic',
    })
    setPendingImages([])
    setErrors({})
    void fetchAssignableUsers(accessToken).then(setUsers)
  }, [visible, vehicule, accessToken])

  const update = <K extends keyof VehiculeFormData>(key: K, value: VehiculeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const n = { ...prev }
      delete n[key as string]
      return n
    })
  }

  const toggleAssignee = (field: 'technicien_ids' | 'responsable_ids', userId: number) => {
    setForm((prev) => {
      const current = prev[field]
      const next = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
      return {
        ...prev,
        [field]: next,
        ...(field === 'technicien_ids' ? { technicien_id: next[0] ?? null } : {}),
        ...(field === 'responsable_ids' ? { responsable_id: next[0] ?? null } : {}),
      }
    })
  }

  const pickImages = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisez l’accès à la caméra ou aux photos.')
      return
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.75,
          base64: true,
          allowsMultipleSelection: true,
          selectionLimit: Math.max(1, MAX_IMAGES - pendingImages.length),
        })
    if (result.canceled || !result.assets?.length) return
    const accepted: PendingImage[] = []
    for (const asset of result.assets) {
      if (!asset?.base64) continue
      const mime = asset.mimeType ?? 'image/jpeg'
      accepted.push({
        id: `${Date.now()}-${Math.random()}`,
        uri: asset.uri,
        payload: {
          dataUrl: `data:${mime};base64,${asset.base64}`,
          fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
          category: imageCategory,
          note: imageNote.trim(),
        },
      })
    }
    if (accepted.length) setPendingImages((prev) => [...prev, ...accepted].slice(0, MAX_IMAGES))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.modele.trim()) e.modele = 'Modèle obligatoire'
    if (!form.defaut.trim()) e.defaut = 'Défaut obligatoire'
    if (!form.date_entree) e.date_entree = 'Date obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    const mergedModele = marque
      ? `${marque} ${form.modele.trim()}`.trim()
      : form.modele.trim()
    const payload = { ...form, modele: mergedModele }
    setSaving(true)
    try {
      let saved: Vehicule
      if (isEdit && vehicule) {
        saved = await updateVehicule(accessToken, vehicule.id, payload)
      } else {
        saved = await createVehicule(accessToken, payload)
      }
      if (pendingImages.length > 0) {
        let failed = 0
        for (const img of pendingImages) {
          try {
            await uploadVehiculeImage(accessToken, saved.id, img.payload)
          } catch {
            failed += 1
          }
        }
        if (failed > 0) {
          Alert.alert('Photos', `${failed} photo(s) non envoyée(s).`)
        }
      }
      const techIds = payload.technicien_ids ?? []
      const respIds = payload.responsable_ids ?? []
      if (techIds.length > 0 || respIds.length > 0) {
        const msg = isEdit
          ? `Véhicule modifié : ${saved.modele}${saved.immatriculation ? ` (${saved.immatriculation})` : ''}`
          : `Nouveau véhicule : ${saved.modele}${saved.immatriculation ? ` (${saved.immatriculation})` : ''}`
        void notifyAssignedUsers(accessToken, users, techIds, respIds, msg, saved.id)
      }
      onSaved(saved)
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={480}>
      <View style={[styles.card, { height: dialogHeight }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.headerClose}>
            <Ionicons name="close" size={26} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
          </Text>
          <View style={styles.headerClose} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text style={styles.label}>Type</Text>
          <View style={styles.row}>
            {(['voiture', 'moto'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => update('type', t)}
                style={[styles.chip, form.type === t && styles.chipActive]}
              >
                <Ionicons
                  name={t === 'voiture' ? 'car-outline' : 'bicycle-outline'}
                  size={18}
                  color={form.type === t ? '#fff' : '#6b7280'}
                />
                <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>
                  {t === 'voiture' ? 'Voiture' : 'Moto'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Marque</Text>
          <Pressable style={styles.select} onPress={() => setShowMarquePicker(true)}>
            <Text style={[styles.selectText, !marque && styles.selectPlaceholder]}>
              {marque || 'Sélectionner une marque'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </Pressable>

          <Field
            label="Modèle *"
            value={form.modele}
            onChangeText={(v) => update('modele', v)}
            error={errors.modele}
            placeholder="Passat, 308..."
          />
          <Field
            label="Immatriculation"
            value={form.immatriculation}
            onChangeText={(v) => update('immatriculation', v)}
          />
          <Field
            label="Défaut / travaux *"
            value={form.defaut}
            onChangeText={(v) => update('defaut', v)}
            error={errors.defaut}
            multiline
          />

          <Text style={styles.label}>Service</Text>
          <View style={styles.wrap}>
            {SERVICE_OPTIONS.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => update('service_type', s.value)}
                style={[
                  styles.miniChip,
                  form.service_type === s.value && styles.miniChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.miniChipText,
                    form.service_type === s.value && styles.miniChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {!isEdit ? (
            <>
              <Text style={styles.label}>État d&apos;entrée *</Text>
              <View style={styles.wrap}>
                {ETATS_ENTREE.map((etat) => {
                  const cfg = ETAT_CONFIG[etat]
                  const sel = form.etat_initial === etat
                  return (
                    <Pressable
                      key={etat}
                      onPress={() => update('etat_initial', etat)}
                      style={[
                        styles.etatChip,
                        sel && { borderColor: cfg.color, backgroundColor: `${cfg.color}18` },
                      ]}
                    >
                      <Text style={[styles.etatChipText, { color: cfg.color }]}>{cfg.label}</Text>
                    </Pressable>
                  )
                })}
              </View>
            </>
          ) : null}

          <Field
            label="Date d'entrée *"
            value={form.date_entree}
            onChangeText={(v) => update('date_entree', v)}
            error={errors.date_entree}
            placeholder="AAAA-MM-JJ"
          />

          <Text style={styles.label}>Techniciens</Text>
          <AssigneeChips
            users={users}
            selected={form.technicien_ids}
            onToggle={(id) => toggleAssignee('technicien_ids', id)}
          />
          <Text style={styles.label}>Responsables</Text>
          <AssigneeChips
            users={users}
            selected={form.responsable_ids}
            onToggle={(id) => toggleAssignee('responsable_ids', id)}
          />

          <Field
            label="Téléphone client"
            value={form.client_telephone}
            onChangeText={(v) => update('client_telephone', v)}
            keyboardType="phone-pad"
          />
          <Field
            label="Notes"
            value={form.notes}
            onChangeText={(v) => update('notes', v)}
            multiline
          />

          <Text style={styles.label}>Photos ({pendingImages.length}/{MAX_IMAGES})</Text>
          <View style={styles.row}>
            <Pressable style={styles.photoBtn} onPress={() => void pickImages(true)}>
              <Ionicons name="camera-outline" size={18} color="#374151" />
              <Text style={styles.photoBtnText}>Caméra</Text>
            </Pressable>
            <Pressable style={styles.photoBtn} onPress={() => void pickImages(false)}>
              <Ionicons name="images-outline" size={18} color="#374151" />
              <Text style={styles.photoBtnText}>Galerie</Text>
            </Pressable>
          </View>
          <View style={styles.photoGrid}>
            {pendingImages.map((img) => (
              <View key={img.id} style={styles.thumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.thumb} />
                <Pressable
                  style={styles.thumbRemove}
                  onPress={() => setPendingImages((p) => p.filter((x) => x.id !== img.id))}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(16, statusBarInset > 20 ? 8 : 16) }]}>
          <Pressable style={styles.btnOutline} onPress={onClose}>
            <Text style={styles.btnOutlineText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.btnPrimary, saving && styles.btnDisabled]}
            disabled={saving}
            onPress={() => void submit()}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showMarquePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMarquePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <ModalBlurBackdrop onPress={() => setShowMarquePicker(false)} />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choisir une marque</Text>
              <Pressable onPress={() => setShowMarquePicker(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>
            <ScrollView style={styles.pickerScroll} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[styles.pickerItem, !marque && styles.pickerItemActive]}
                onPress={() => {
                  setMarque('')
                  setShowMarquePicker(false)
                }}
              >
                <Text style={styles.pickerItemText}>— Aucune —</Text>
                {!marque ? <Ionicons name="checkmark" size={20} color="#f97316" /> : null}
              </Pressable>
              {BRAND_OPTIONS.map((m) => {
                const selected = marque === m
                return (
                  <Pressable
                    key={m}
                    style={[styles.pickerItem, selected && styles.pickerItemActive]}
                    onPress={() => {
                      setMarque(m)
                      setShowMarquePicker(false)
                    }}
                  >
                    <Text style={styles.pickerItemText}>{m}</Text>
                    {selected ? <Ionicons name="checkmark" size={20} color="#f97316" /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </CenteredBlurModal>
  )
}

function Field({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  error?: string
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'phone-pad'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        multiline={multiline}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

function AssigneeChips({
  users,
  selected,
  onToggle,
}: {
  users: AppUser[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  return (
    <View style={styles.wrap}>
      {users.map((u) => {
        const sel = selected.includes(u.id)
        return (
          <Pressable
            key={u.id}
            onPress={() => onToggle(u.id)}
            style={[styles.assignChip, sel && styles.assignChipActive]}
          >
            <Text style={[styles.assignChipText, sel && styles.assignChipTextActive]}>
              {u.nom_complet}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerClose: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  scrollView: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 8 },
  field: { marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipText: { fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  selectText: { fontSize: 15, color: '#111827', flex: 1 },
  selectPlaceholder: { color: '#9ca3af' },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
    zIndex: 1,
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  pickerScroll: { maxHeight: 400 },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemActive: { backgroundColor: '#fff7ed' },
  pickerItemText: { fontSize: 16, color: '#111827' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  miniChipActive: { backgroundColor: '#f97316' },
  miniChipText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  miniChipTextActive: { color: '#fff' },
  etatChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  etatChipText: { fontSize: 10, fontWeight: '800' },
  assignChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  assignChipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  assignChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  assignChipTextActive: { color: '#fff' },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  btnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  btnOutlineText: { fontWeight: '600', color: '#374151' },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  btnPrimaryText: { fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
})
