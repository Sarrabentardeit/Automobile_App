import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { ChecklistItemStatus } from '../../types/checklist'
import { theme } from '../../theme/appTheme'

const STATUS_OPTIONS: { id: ChecklistItemStatus; label: string }[] = [
  { id: 'todo', label: 'Non fait' },
  { id: 'done', label: 'Fait' },
  { id: 'na', label: 'N/A' },
]

type Props = {
  label: string
  status: ChecklistItemStatus
  comment: string
  readOnly?: boolean
  onStatus: (status: ChecklistItemStatus) => void
  onComment: (comment: string) => void
}

export default function ChecklistItemRow({
  label,
  status,
  comment,
  readOnly = false,
  onStatus,
  onComment,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt.id}
            disabled={readOnly}
            onPress={() => onStatus(opt.id)}
            style={[styles.chip, chipStyle(opt.id, status === opt.id), readOnly && styles.chipDisabled]}
          >
            <Text style={[styles.chipText, status === opt.id && styles.chipTextOn]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.comment, readOnly && styles.commentDisabled]}
        value={comment}
        editable={!readOnly}
        onChangeText={onComment}
        placeholder="Commentaire (optionnel)"
        placeholderTextColor={theme.textSubtle}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 12,
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipIdle: { backgroundColor: theme.surface, borderColor: theme.border },
  chipTodoOn: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
  chipDoneOn: { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' },
  chipNaOn: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  chipDisabled: { opacity: 0.65 },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  chipTextOn: { color: theme.text },
  comment: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.text,
    backgroundColor: theme.surface,
  },
  commentDisabled: { backgroundColor: theme.bg, color: theme.textMuted },
})

function chipStyle(status: ChecklistItemStatus, active: boolean) {
  if (!active) return styles.chipIdle
  if (status === 'done') return styles.chipDoneOn
  if (status === 'na') return styles.chipNaOn
  return styles.chipTodoOn
}
