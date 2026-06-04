import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'

type Props = {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}

export default function StockPaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPrev,
  onNext,
}: Props) {
  if (totalCount === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <View style={styles.wrap}>
      <Text style={styles.range}>
        <Text style={styles.rangeBold}>
          {from}–{to}
        </Text>
        {' sur '}
        <Text style={styles.rangeBold}>{totalCount}</Text>
        {totalPages > 1 ? (
          <Text style={styles.pageHint}>
            {' '}
            · page {page}/{totalPages}
          </Text>
        ) : null}
      </Text>
      {totalPages > 1 ? (
        <View style={styles.btns}>
          <Pressable
            style={[styles.btn, page <= 1 && styles.btnDisabled]}
            onPress={onPrev}
            disabled={page <= 1}
          >
            <Ionicons name="chevron-back" size={18} color={page <= 1 ? theme.textSubtle : theme.text} />
            <Text style={[styles.btnText, page <= 1 && styles.btnTextDisabled]}>Préc.</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, page >= totalPages && styles.btnDisabled]}
            onPress={onNext}
            disabled={page >= totalPages}
          >
            <Text style={[styles.btnText, page >= totalPages && styles.btnTextDisabled]}>Suiv.</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= totalPages ? theme.textSubtle : theme.text}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    gap: 10,
  },
  range: { fontSize: 13, color: theme.textMuted },
  rangeBold: { fontWeight: '700', color: theme.text },
  pageHint: { color: theme.textSubtle },
  btns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontSize: 13, fontWeight: '600', color: theme.text },
  btnTextDisabled: { color: theme.textSubtle },
})
