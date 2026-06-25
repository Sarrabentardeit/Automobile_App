import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { createClientDette, deleteClientDette, updateClientDette } from '../../lib/clientDetteApi'
import { theme } from '../../theme/appTheme'
import type { ClientAvecDette, ClientDetteInput } from '../../types/clientDette'

type Props = {
  visible: boolean
  client: ClientAvecDette | null
  accessToken: string
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}

function emptyForm(): ClientDetteInput {
  return {
    clientName: '',
    telephoneClient: '',
    designation: '',
    reste: 0,
    notes: '',
  }
}

export default function ClientDetteFormModal({
  visible,
  client,
  accessToken,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!client
  const [form, setForm] = useState<ClientDetteInput>(emptyForm)
  const [resteText, setResteText] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 620)

  useEffect(() => {
    if (!visible) return
    setError(null)
    if (client) {
      setForm({
        clientName: client.clientName,
        telephoneClient: client.telephoneClient ?? '',
        designation: client.designation ?? '',
        reste: client.reste,
        notes: client.notes ?? '',
      })
      setResteText(client.reste ? String(client.reste) : '')
    } else {
      setForm(emptyForm())
      setResteText('')
    }
  }, [visible, client])

  const canSave = form.clientName.trim().length > 0

  const confirmDelete = () => {
    if (!client) return
    Alert.alert(
      'Supprimer',
      `Supprimer « ${client.clientName} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true)
              setError(null)
              try {
                await deleteClientDette(accessToken, client.id)
                onDeleted()
                onClose()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Suppression impossible')
              } finally {
                setSaving(false)
              }
            })()
          },
        },
      ]
    )
  }

  const submit = async () => {
    if (!canSave) return
    setError(null)
    const reste = Number(resteText.replace(',', '.')) || 0
    const payload: ClientDetteInput = {
      clientName: form.clientName.trim(),
      telephoneClient: form.telephoneClient.trim(),
      designation: form.designation.trim(),
      reste,
      notes: form.notes?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (isEdit && client) {
        await updateClientDette(accessToken, client.id, payload)
      } else {
        await createClientDette(accessToken, payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isEdit ? 'Modifier le client' : 'Nouveau client avec dette'}
            </Text>
            {!isEdit ? (
              <Text style={styles.subtitle}>Enregistrer une créance</Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Client</Text>
          <View style={styles.field}>
            <Ionicons name="person-outline" size={18} color={theme.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={form.clientName}
              onChangeText={(clientName) => setForm((f) => ({ ...f, clientName }))}
              placeholder="Nom du client"
            />
          </View>

          <View style={styles.field}>
            <Ionicons name="call-outline" size={18} color={theme.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={form.telephoneClient}
              onChangeText={(telephoneClient) => setForm((f) => ({ ...f, telephoneClient }))}
              keyboardType="phone-pad"
              placeholder="Tél. ou véhicule"
            />
          </View>

          <Text style={styles.sectionLabel}>Créance</Text>
          <View style={styles.field}>
            <Ionicons name="briefcase-outline" size={18} color={theme.textMuted} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={form.designation}
              onChangeText={(designation) => setForm((f) => ({ ...f, designation }))}
              placeholder="PIECES, MO…"
            />
          </View>

          <View style={[styles.field, styles.amountField]}>
            <Ionicons name="cash-outline" size={18} color={theme.primary} style={styles.fieldIcon} />
            <TextInput
              style={[styles.fieldInput, styles.amountInput]}
              value={resteText}
              onChangeText={setResteText}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <Text style={styles.amountSuffix}>DT</Text>
          </View>

          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes ?? ''}
            onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Optionnel"
          />
        </ScrollView>
        {isEdit ? (
          <Pressable
            style={[styles.deleteBtn, saving && styles.saveDisabled]}
            onPress={confirmDelete}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </Pressable>
        ) : null}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveDisabled]}
            onPress={() => void submit()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Enregistrer</Text>
            )}
          </Pressable>
        </View>
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 16,
  },
  accent: { height: 3, backgroundColor: theme.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 12,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  fieldIcon: { marginRight: 10 },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    paddingVertical: 12,
  },
  amountField: {
    backgroundColor: theme.primarySoft,
    borderColor: '#fed7aa',
  },
  amountInput: { fontSize: 18, fontWeight: '700', color: theme.primaryDark },
  amountSuffix: { fontSize: 14, fontWeight: '700', color: theme.textMuted, marginLeft: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  textArea: { minHeight: 72 },
  error: { color: theme.danger, fontSize: 13, marginBottom: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: theme.dangerSoft,
  },
  deleteText: { fontWeight: '700', color: theme.danger },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelText: { fontWeight: '700', color: theme.textSecondary },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '800' },
})
