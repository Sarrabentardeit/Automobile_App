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
import SuiviExcelForm from './SuiviExcelForm'
import { createSuivi, updateSuivi } from '../lib/vehiculeApi'
import type { VehiculeSuivi, VehiculeSuiviInput } from '../types/vehicule'

const today = () => new Date().toISOString().split('T')[0]

type Props = {
  visible: boolean
  vehiculeId: number
  vehiculeModele: string
  vehiculeImmat: string
  suivi: VehiculeSuivi | null
  accessToken: string
  userName: string
  onClose: () => void
  onSaved: () => void
}

function emptyInput(modele: string, immat: string, userName: string): VehiculeSuiviInput {
  return {
    date: today(),
    voiture: modele,
    matricule: immat,
    kilometrage: '',
    travauxEffectues: '',
    travauxProchains: '',
    produitsUtilises: '',
    technicien: '',
    rempliPar: userName,
  }
}

export default function SuiviFormModal({
  visible,
  vehiculeId,
  vehiculeModele,
  vehiculeImmat,
  suivi,
  accessToken,
  userName,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!suivi
  const [form, setForm] = useState<VehiculeSuiviInput>(
    emptyInput(vehiculeModele, vehiculeImmat, userName)
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (suivi) {
      setForm({
        date: suivi.date,
        voiture: suivi.voiture,
        matricule: suivi.matricule,
        kilometrage: suivi.kilometrage,
        travauxEffectues: suivi.travauxEffectues,
        travauxProchains: suivi.travauxProchains,
        produitsUtilises: suivi.produitsUtilises,
        technicien: suivi.technicien,
        rempliPar: suivi.rempliPar,
      })
    } else {
      setForm(emptyInput(vehiculeModele, vehiculeImmat, userName))
    }
  }, [visible, suivi, vehiculeModele, vehiculeImmat, userName])

  const submit = async () => {
    setSaving(true)
    try {
      if (isEdit && suivi) {
        await updateSuivi(accessToken, vehiculeId, suivi.id, form)
      } else {
        await createSuivi(accessToken, vehiculeId, form)
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
            {isEdit ? `Modifier ${suivi?.numero}` : 'Nouvelle fiche suivi'}
          </Text>
          <View style={{ width: 26 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SuiviExcelForm
            data={form}
            onChange={setForm}
            numero={isEdit ? suivi?.numero : undefined}
          />
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
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 24 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
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
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
})
