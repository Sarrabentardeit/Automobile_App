import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatDateFr, relativeDayLabel } from '../../lib/calendarGrid'
import { theme } from '../../theme/appTheme'
import type { CalendarAssignment } from '../../types/calendarAssignment'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function avatarGradient(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
}) {
  const inner = (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={4}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={18} color={theme.textSubtle} /> : null}
    </View>
  )
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.88 }}>
        {inner}
      </Pressable>
    )
  }
  return inner
}

type Props = {
  visible: boolean
  assignment: CalendarAssignment | null
  canManage: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function CalendarAssignmentDetailModal({
  visible,
  assignment,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!assignment) return null

  const [c1, c2] = avatarGradient(assignment.memberName)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 560)
  const rel = relativeDayLabel(assignment.date)
  const tel = assignment.clientTelephone?.replace(/\s/g, '') ?? ''

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Affectation</Text>
            <Text style={styles.subtitle}>
              {rel ? `${rel} · ` : ''}
              {formatDateFr(assignment.date)}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <View style={styles.profile}>
            <LinearGradient colors={[c1, c2]} style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{memberInitials(assignment.memberName)}</Text>
            </LinearGradient>
            <Text style={styles.name}>{assignment.memberName}</Text>
            <Text style={styles.rolePill}>Membre affecté</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails</Text>
            <View style={styles.sectionCard}>
              <InfoRow icon="car-outline" label="Véhicule" value={assignment.vehicleLabel} />
              {assignment.description?.trim() ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow
                    icon="construct-outline"
                    label="Travail à faire"
                    value={assignment.description}
                  />
                </>
              ) : null}
              {assignment.clientName?.trim() ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow
                    icon="person-outline"
                    label="Client"
                    value={
                      tel
                        ? `${assignment.clientName} · ${assignment.clientTelephone}`
                        : assignment.clientName
                    }
                    onPress={tel ? () => void Linking.openURL(`tel:${tel}`) : undefined}
                  />
                </>
              ) : null}
            </View>
          </View>

          {tel ? (
            <Pressable
              style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
              onPress={() => void Linking.openURL(`tel:${tel}`)}
            >
              <Ionicons name="call" size={20} color="#fff" />
              <Text style={styles.callBtnText}>Appeler le client</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {canManage ? (
          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.footerBtn, styles.footerEdit, pressed && styles.pressed]}
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={20} color={theme.primary} />
              <Text style={styles.footerEditText}>Modifier</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.footerBtn, styles.footerDelete, pressed && styles.pressed]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
              <Text style={styles.footerDeleteText}>Supprimer</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerReadOnly}>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
            >
              <Text style={styles.closeBtnText}>Fermer</Text>
            </Pressable>
          </View>
        )}
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
  profile: { alignItems: 'center', marginBottom: 16 },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarLgText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  name: { fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' },
  rolePill: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: theme.primaryDark,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2, lineHeight: 20 },
  divider: { height: 1, backgroundColor: theme.borderLight, marginHorizontal: 12 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    ...theme.shadow.primaryBtn,
  },
  callBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: theme.radius.sm,
  },
  footerEdit: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: theme.primarySoft,
  },
  footerEditText: { fontWeight: '800', color: theme.primaryDark },
  footerDelete: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: theme.dangerSoft,
  },
  footerDeleteText: { fontWeight: '800', color: theme.danger },
  footerReadOnly: { padding: 16, borderTopWidth: 1, borderTopColor: theme.borderLight },
  closeBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  closeBtnText: { fontWeight: '700', color: theme.textSecondary },
  pressed: { opacity: 0.88 },
})
