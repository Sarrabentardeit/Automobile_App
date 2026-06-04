import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import { formatTnd } from '../../types/produitStock'

type Props = {
  totalAchat: number | null
  totalVendu: number | null
  expectedRevenus: number
  loading?: boolean
}

function KpiMini({
  icon,
  color,
  bg,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
  label: string
  value: string
}) {
  return (
    <View style={[styles.mini, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.miniLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

export default function StockKpiStrip({
  totalAchat,
  totalVendu,
  expectedRevenus,
  loading,
}: Props) {
  const dash = loading ? '…' : '—'
  const fmt = (n: number | null) => (n == null ? dash : formatTnd(n))

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      <KpiMini
        icon="cart-outline"
        color="#d97706"
        bg="#fff7ed"
        label="Achat total"
        value={fmt(totalAchat)}
      />
      <KpiMini
        icon="trending-up"
        color="#059669"
        bg="#ecfdf5"
        label="Vendu total"
        value={fmt(totalVendu)}
      />
      <KpiMini
        icon="layers-outline"
        color="#2563eb"
        bg="#eff6ff"
        label="Revenus prev."
        value={fmt(expectedRevenus)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: 8, paddingVertical: 2, marginBottom: 12 },
  mini: {
    width: 118,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    gap: 4,
  },
  miniLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, lineHeight: 13 },
  miniValue: { fontSize: 14, fontWeight: '800', color: theme.text },
})
