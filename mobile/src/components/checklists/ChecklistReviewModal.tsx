import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { theme } from '../../theme/appTheme'

type Props = {
  visible: boolean
  action: 'validate' | 'reject' | null
  comment: string
  saving: boolean
  onCommentChange: (v: string) => void
  onClose: () => void
  onConfirm: () => void
}

export default function ChecklistReviewModal({
  visible,
  action,
  comment,
  saving,
  onCommentChange,
  onClose,
  onConfirm,
}: Props) {
  const isReject = action === 'reject'

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {isReject ? 'Rejeter la checklist' : 'Valider la checklist'}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} disabled={saving}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.sub}>
          {isReject
            ? 'Le motif sera visible par l\'utilisateur.'
            : 'Commentaire optionnel pour l\'historique.'}
        </Text>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={onCommentChange}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholder={isReject ? 'Motif du rejet (obligatoire)' : 'Commentaire (optionnel)'}
          placeholderTextColor={theme.textSubtle}
          editable={!saving}
        />
        {isReject ? (
          <Text style={styles.hint}>Le commentaire est obligatoire pour un rejet.</Text>
        ) : null}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmBtn, isReject && styles.confirmReject, saving && styles.disabled]}
            onPress={onConfirm}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmText}>
                {isReject ? 'Confirmer rejet' : 'Confirmer validation'}
              </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, paddingHorizontal: 16, marginTop: 4 },
  input: {
    margin: 16,
    marginBottom: 8,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  hint: { fontSize: 11, color: '#b45309', paddingHorizontal: 16, marginBottom: 4 },
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
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  confirmReject: { backgroundColor: theme.danger },
  confirmText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.5 },
})
