import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from './ui/ModalBlurBackdrop'
import {
  ETAT_CONFIG,
  TRANSITIONS_AUTORISEES,
  type EtatVehicule,
  type Vehicule,
} from '../types/vehicule'

type Props = {
  visible: boolean
  vehicule: Vehicule
  onClose: () => void
  onConfirm: (
    etat: EtatVehicule,
    commentaire: string,
    pieces: string
  ) => Promise<void>
}

export default function ChangeEtatModal({
  visible,
  vehicule,
  onClose,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<EtatVehicule | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [pieces, setPieces] = useState('')
  const [step, setStep] = useState<'select' | 'confirm'>('select')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const transitions = TRANSITIONS_AUTORISEES[vehicule.etat_actuel] ?? []
  const currentCfg = ETAT_CONFIG[vehicule.etat_actuel]

  const reset = () => {
    setSelected(null)
    setCommentaire('')
    setPieces('')
    setStep('select')
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleConfirm = async () => {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await onConfirm(selected, commentaire.trim(), pieces.trim())
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  if (transitions.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <ModalBlurBackdrop onPress={handleClose} />
          <View style={styles.sheet}>
            <Text style={styles.title}>Aucune transition</Text>
            <Text style={styles.sub}>
              Impossible de changer l&apos;état depuis {currentCfg.label}.
            </Text>
            <Pressable style={styles.btnSecondary} onPress={handleClose}>
              <Text style={styles.btnSecondaryText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <ModalBlurBackdrop onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>
              {step === 'confirm' ? 'Confirmer' : "Changer l'état"}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <Text style={styles.sub}>
            {vehicule.modele} — {vehicule.immatriculation || 'Sans immat.'}
          </Text>

          {step === 'select' ? (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>État actuel</Text>
              <View style={[styles.badge, { backgroundColor: currentCfg.color }]}>
                <Text style={styles.badgeText}>{currentCfg.label}</Text>
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Nouvel état</Text>
              {transitions.map((etat) => {
                const cfg = ETAT_CONFIG[etat]
                const isSel = selected === etat
                return (
                  <Pressable
                    key={etat}
                    onPress={() => {
                      setSelected(etat)
                      setError('')
                    }}
                    style={[
                      styles.etatOption,
                      isSel && { borderColor: cfg.color, backgroundColor: `${cfg.color}12` },
                    ]}
                  >
                    <View style={[styles.radio, { borderColor: cfg.color }]}>
                      {isSel ? (
                        <View style={[styles.radioInner, { backgroundColor: cfg.color }]} />
                      ) : null}
                    </View>
                    <View style={styles.etatOptionText}>
                      <Text style={[styles.etatLabel, { color: cfg.color }]}>{cfg.label}</Text>
                      <Text style={styles.etatDesc}>{cfg.description}</Text>
                    </View>
                  </Pressable>
                )
              })}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={[styles.btnPrimary, !selected && styles.btnDisabled]}
                disabled={!selected}
                onPress={() => {
                  if (!selected) setError('Choisissez un état')
                  else setStep('confirm')
                }}
              >
                <Text style={styles.btnPrimaryText}>Suivant</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <View>
              <View style={styles.transitionRow}>
                <View style={[styles.badge, { backgroundColor: currentCfg.color }]}>
                  <Text style={styles.badgeText}>{currentCfg.label}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#9ca3af" />
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: ETAT_CONFIG[selected!].color },
                  ]}
                >
                  <Text style={styles.badgeText}>{ETAT_CONFIG[selected!].label}</Text>
                </View>
              </View>
              <Text style={styles.label}>Commentaire (optionnel)</Text>
              <TextInput
                style={styles.textarea}
                multiline
                placeholder="Détails du changement..."
                value={commentaire}
                onChangeText={setCommentaire}
              />
              <Text style={styles.label}>Pièces utilisées (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Références pièces..."
                value={pieces}
                onChangeText={setPieces}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.btnRow}>
                <Pressable style={styles.btnSecondary} onPress={() => setStep('select')}>
                  <Text style={styles.btnSecondaryText}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnPrimary, styles.btnFlex, loading && styles.btnDisabled]}
                  disabled={loading}
                  onPress={() => void handleConfirm()}
                >
                  <Text style={styles.btnPrimaryText}>
                    {loading ? 'Enregistrement...' : 'Confirmer'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    zIndex: 1,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 12 },
  scroll: { maxHeight: 420 },
  label: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  etatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  etatOptionText: { flex: 1 },
  etatLabel: { fontSize: 14, fontWeight: '700' },
  etatDesc: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnFlex: { flex: 1 },
  btnPrimary: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  btnSecondaryText: { color: '#374151', fontWeight: '600' },
})
