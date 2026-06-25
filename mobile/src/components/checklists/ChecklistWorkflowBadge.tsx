import { StyleSheet, Text, View } from 'react-native'
import { WORKFLOW_LABELS, workflowColors } from '../../lib/checklistHelpers'
import type { ChecklistWorkflowStatus } from '../../types/checklist'

type Props = { status: ChecklistWorkflowStatus }

export default function ChecklistWorkflowBadge({ status }: Props) {
  const c = workflowColors(status)
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{WORKFLOW_LABELS[status]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: { fontSize: 11, fontWeight: '700' },
})
