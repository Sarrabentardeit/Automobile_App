import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredSheetShell from './ui/CenteredSheetShell'
import { pickVehiculeImages } from '../lib/imageUpload'
import { updateMyProfile } from '../lib/profileApi'
import { mediaUrl } from '../lib/vehiculeApi'
import { theme } from '../theme/appTheme'

function splitName(full: string): { prenom: string; nom: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { prenom: '', nom: '' }
  if (parts.length === 1) return { prenom: parts[0], nom: '' }
  return { prenom: parts[0], nom: parts.slice(1).join(' ') }
}

function joinName(prenom: string, nom: string): string {
  return [prenom.trim(), nom.trim()].filter(Boolean).join(' ')
}

type Props = {
  visible: boolean
  accessToken: string
  fullName: string
  telephone?: string
  avatarUrl?: string | null
  onClose: () => void
  onSaved: (data: { fullName: string; avatarUrl: string | null }) => void
}

export default function ProfileEditModal({
  visible,
  accessToken,
  fullName,
  telephone = '',
  avatarUrl,
  onClose,
  onSaved,
}: Props) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    const s = splitName(fullName)
    setPrenom(s.prenom)
    setNom(s.nom)
    setTel(telephone)
    setPreviewUri(avatarUrl ? mediaUrl(avatarUrl) : null)
    setAvatarDataUrl(null)
    setRemoveAvatar(false)
  }, [visible, fullName, telephone, avatarUrl])

  const pickPhoto = () => {
    Alert.alert('Photo de profil', 'Choisir une source', [
      {
        text: 'Galerie',
        onPress: () => {
          void (async () => {
            try {
              const items = await pickVehiculeImages({
                useCamera: false,
                category: 'etat_exterieur',
                selectionLimit: 1,
              })
              const item = items[0]
              if (!item) return
              setAvatarDataUrl(item.payload.dataUrl)
              setPreviewUri(item.uri)
              setRemoveAvatar(false)
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Photo impossible')
            }
          })()
        },
      },
      {
        text: 'Caméra',
        onPress: () => {
          void (async () => {
            try {
              const items = await pickVehiculeImages({
                useCamera: true,
                category: 'etat_exterieur',
                selectionLimit: 1,
              })
              const item = items[0]
              if (!item) return
              setAvatarDataUrl(item.payload.dataUrl)
              setPreviewUri(item.uri)
              setRemoveAvatar(false)
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Photo impossible')
            }
          })()
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ])
  }

  const handleSave = async () => {
    const name = joinName(prenom, nom)
    if (name.length < 2) {
      Alert.alert('Nom requis', 'Indiquez au moins un prénom.')
      return
    }
    setSaving(true)
    try {
      const res = await updateMyProfile(accessToken, {
        fullName: name,
        telephone: tel,
        avatarDataUrl: avatarDataUrl ?? undefined,
        removeAvatar: removeAvatar || undefined,
      })
      onSaved({
        fullName: res.fullName,
        avatarUrl: removeAvatar ? null : res.avatarUrl,
      })
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredSheetShell
      visible={visible}
      onClose={onClose}
      maxWidth={400}
      maxCard={560}
      footer={
        <Pressable
          style={[styles.saveBtn, saving && styles.saveDisabled]}
          disabled={saving}
          onPress={() => void handleSave()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Enregistrer</Text>
          )}
        </Pressable>
      }
    >
      <Text style={styles.title}>Mon profil</Text>
      <Text style={styles.subtitle}>Modifier votre nom et votre photo</Text>

      <View style={styles.avatarWrap}>
        {previewUri && !removeAvatar ? (
          <Image source={{ uri: previewUri }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>
              {(prenom || nom || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Pressable style={styles.photoBtn} onPress={pickPhoto}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
            <Text style={styles.photoBtnText}>Photo</Text>
          </Pressable>
          {(previewUri || avatarUrl) && !removeAvatar ? (
            <Pressable
              style={[styles.photoBtn, styles.photoBtnDanger]}
              onPress={() => {
                setRemoveAvatar(true)
                setAvatarDataUrl(null)
                setPreviewUri(null)
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
              <Text style={styles.photoBtnDangerText}>Retirer</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.label}>Prénom</Text>
      <TextInput
        style={styles.input}
        value={prenom}
        onChangeText={setPrenom}
        placeholder="Prénom"
        placeholderTextColor={theme.textSubtle}
      />
      <Text style={styles.label}>Nom</Text>
      <TextInput
        style={styles.input}
        value={nom}
        onChangeText={setNom}
        placeholder="Nom"
        placeholderTextColor={theme.textSubtle}
      />
      <Text style={styles.label}>Téléphone</Text>
      <TextInput
        style={styles.input}
        value={tel}
        onChangeText={setTel}
        placeholder="Optionnel"
        placeholderTextColor={theme.textSubtle}
        keyboardType="phone-pad"
      />
    </CenteredSheetShell>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    paddingRight: 40,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSubtle,
    marginBottom: 16,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 16, gap: 10 },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '800' },
  photoActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  photoBtnDanger: { backgroundColor: '#fef2f2' },
  photoBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  photoBtnDangerText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.text,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
