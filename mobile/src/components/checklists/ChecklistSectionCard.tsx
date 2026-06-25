import { StyleSheet, Text, View } from 'react-native'
import ChecklistItemRow from './ChecklistItemRow'
import type { ChecklistItemStatus, ChecklistSection } from '../../types/checklist'
import { theme } from '../../theme/appTheme'

type Props = {
  section: ChecklistSection
  readOnly?: boolean
  onItemChange: (
    itemId: string,
    patch: Partial<{ status: ChecklistItemStatus; comment: string }>
  ) => void
}

export default function ChecklistSectionCard({ section, readOnly, onItemChange }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{section.title}</Text>
      {section.items.map((item) => (
        <ChecklistItemRow
          key={item.id}
          label={item.label}
          status={item.status}
          comment={item.comment}
          readOnly={readOnly}
          onStatus={(status) => onItemChange(item.id, { status })}
          onComment={(comment) => onItemChange(item.id, { comment })}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.sm,
  },
  title: { fontSize: 15, fontWeight: '800', color: theme.text, marginBottom: 8 },
})
