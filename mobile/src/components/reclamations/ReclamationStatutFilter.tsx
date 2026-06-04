import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../../theme/appTheme'
import {
  RECLAMATION_STATUT_LABELS,
  RECLAMATION_STATUTS,
  type ReclamationStatut,
} from '../../types/reclamation'

type FilterStatut = 'toutes' | ReclamationStatut

type Props = {
  value: FilterStatut
  onChange: (v: FilterStatut) => void
}

const OPTIONS: FilterStatut[] = ['toutes', ...RECLAMATION_STATUTS]

export default function ReclamationStatutFilter({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {OPTIONS.map((s) => {
          const active = value === s
          return (
            <Pressable
              key={s}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => onChange(s)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {s === 'toutes' ? 'Toutes' : RECLAMATION_STATUT_LABELS[s]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 4,
  },
  scroll: { gap: 4 },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  segmentActive: {
    backgroundColor: theme.surface,
    ...theme.shadow.sm,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  segmentTextActive: { color: theme.text, fontWeight: '700' },
})
