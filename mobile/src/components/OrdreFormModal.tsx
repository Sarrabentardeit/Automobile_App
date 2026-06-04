import { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import FullScreenBlurModal from './ui/FullScreenBlurModal'
import OrdreExcelForm from './OrdreExcelForm'
import { createOrdre, updateOrdre } from '../lib/vehiculeApi'
import {
  defaultOrdreForm,
  excelFormToPayload,
  ordreToExcelForm,
  type OrdreExcelFormState,
} from '../lib/ordreFormHelpers'
import type { OrdreReparation, Vehicule } from '../types/vehicule'

type Props = {
  visible: boolean
  vehicule: Vehicule
  ordre: OrdreReparation | null
  accessToken: string
  technicienDefaut: string
  userName: string
  onClose: () => void
  onSaved: () => void
}

export default function OrdreFormModal({
  visible,
  vehicule,
  ordre,
  accessToken,
  technicienDefaut,
  userName,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!ordre
  const [form, setForm] = useState<OrdreExcelFormState>(
    defaultOrdreForm(vehicule, technicienDefaut, userName)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setForm(
      ordre
        ? ordreToExcelForm(ordre)
        : defaultOrdreForm(vehicule, technicienDefaut, userName)
    )
  }, [visible, ordre, vehicule, technicienDefaut, userName])

  const submit = async () => {
    setSaving(true)
    try {
      const payload = excelFormToPayload(form)
      if (isEdit && ordre) {
        await updateOrdre(accessToken, vehicule.id, ordre.id, payload)
      } else {
        await createOrdre(accessToken, vehicule.id, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FullScreenBlurModal visible={visible} onClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={26} color="#111827" />
          </Pressable>
          <Text style={styles.title}>
            {isEdit ? `Modifier ${ordre?.numero}` : 'Ordre de réparation'}
          </Text>
          <View style={{ width: 26 }} />
        </View>
        <Text style={styles.subtitle}>Mise en page identique à la feuille Excel atelier</Text>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <OrdreExcelForm form={form} onChange={setForm} />
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.btnOutline} onPress={onClose}>
            <Text style={styles.btnOutlineText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.btnPrimary, saving && styles.disabled]}
            disabled={saving}
            onPress={() => void submit()}
          >
            <Text style={styles.btnPrimaryText}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </Pressable>
        </View>
      </View>
    </FullScreenBlurModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scroll: { padding: 12, paddingBottom: 24 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#fff',
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
  btnOutlineText: { fontWeight: '600' },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
})
