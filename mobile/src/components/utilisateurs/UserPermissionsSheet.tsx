import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import {
  ALL_TOGGLE_KEYS,
  ROLE_STYLE,
  TOGGLE_PERMISSION_LABELS,
  VISIBILITY_OPTIONS,
} from '../../types/permissions'
import { theme } from '../../theme/appTheme'
import type { AppAccount } from '../../types/appUser'

type Props = {
  visible: boolean
  user: AppAccount | null
  onClose: () => void
}

export default function UserPermissionsSheet({ visible, user, onClose }: Props) {
  if (!user) return null
  const rc = ROLE_STYLE[user.role]

  return (
    <CenteredBlurModal visible={visible} onClose={onClose} maxWidth={420}>
      <View style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Accès — {user.nom_complet}</Text>
            <Text style={styles.subtitle}>
              {rc.label} · {user.email}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Visibilité véhicules</Text>
          {VISIBILITY_OPTIONS.map((opt) => {
            const active = user.permissions.vehiculeVisibility === opt.value
            return (
              <View key={opt.value} style={[styles.row, active ? styles.rowOn : styles.rowOff]}>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={active ? '#2563eb' : theme.textSubtle}
                />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, active && styles.rowLabelOn]}>{opt.label}</Text>
                  <Text style={styles.rowDesc}>{opt.description}</Text>
                </View>
              </View>
            )
          })}

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Autres accès</Text>
          {ALL_TOGGLE_KEYS.map((key) => {
            const config = TOGGLE_PERMISSION_LABELS[key]
            const hasIt = user.permissions[key]
            return (
              <View key={key} style={[styles.row, hasIt ? styles.rowGreen : styles.rowOff]}>
                <Ionicons
                  name={hasIt ? 'checkmark-circle' : 'close-circle-outline'}
                  size={20}
                  color={hasIt ? '#059669' : theme.textSubtle}
                />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, hasIt && styles.rowLabelGreen]}>{config.label}</Text>
                  <Text style={styles.rowDesc}>{config.description}</Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    width: '100%',
    maxHeight: '88%',
  },
  accent: { height: 4, backgroundColor: theme.primary },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  scroll: { paddingHorizontal: 18, paddingBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionSpaced: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowOn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  rowGreen: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  rowOff: { backgroundColor: theme.bg, borderColor: theme.borderLight, opacity: 0.85 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
  rowLabelOn: { color: '#1d4ed8' },
  rowLabelGreen: { color: '#047857' },
  rowDesc: { fontSize: 12, color: theme.textMuted, marginTop: 2, lineHeight: 17 },
})
