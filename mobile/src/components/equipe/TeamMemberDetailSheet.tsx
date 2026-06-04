import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from '../ui/ModalBlurBackdrop'
import { getStatusBarInset } from '../../lib/safeArea'
import { theme } from '../../theme/appTheme'
import type { TeamMember } from '../../types/teamMember'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function avatarGradient(name: string): [string, string] {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function initial(name: string): string {
  const t = name.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

type Props = {
  visible: boolean
  member: TeamMember | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function TeamMemberDetailSheet({
  visible,
  member,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!member) return null

  const tel = member.phone?.replace(/\s/g, '') ?? ''
  const [c1, c2] = avatarGradient(member.name)
  const bottomPad = Math.max(20, getStatusBarInset() > 40 ? 12 : 20)

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ModalBlurBackdrop onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: bottomPad }]}>
        <View style={styles.handle} />
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeFab}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.profile}>
            <LinearGradient colors={[c1, c2]} style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initial(member.name)}</Text>
            </LinearGradient>
            <Text style={styles.profileName}>{member.name}</Text>
          </View>

          {tel ? (
            <Pressable
              style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
              onPress={() => void Linking.openURL(`tel:${tel}`)}
            >
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.callBtnText}>Appeler</Text>
            </Pressable>
          ) : (
            <View style={styles.noPhoneBox}>
              <Ionicons name="call-outline" size={20} color={theme.textMuted} />
              <Text style={styles.noPhoneText}>Aucun numéro enregistré</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coordonnées</Text>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>{member.name}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable
                disabled={!tel}
                onPress={() => tel && void Linking.openURL(`tel:${tel}`)}
                style={({ pressed }) => pressed && tel && { opacity: 0.88 }}
              >
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, tel && styles.infoIconAccent]}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={tel ? theme.primary : theme.textMuted}
                    />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={[styles.infoValue, tel && styles.infoValueAccent]}>
                      {member.phone || '—'}
                    </Text>
                  </View>
                  {tel ? (
                    <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                  ) : null}
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>

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
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 1,
    ...theme.shadow.sm,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    marginTop: 10,
    marginBottom: 4,
  },
  closeFab: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 8 },
  profile: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  avatarLg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadow.primaryBtn,
  },
  avatarLgText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    marginBottom: 20,
    ...theme.shadow.primaryBtn,
  },
  callBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  noPhoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.bg,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  noPhoneText: { fontSize: 14, color: theme.textMuted, fontWeight: '600' },
  pressed: { opacity: 0.9 },
  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconAccent: { backgroundColor: theme.primarySoft },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: theme.text },
  infoValueAccent: { color: theme.primary },
  divider: { height: 1, backgroundColor: theme.borderLight, marginLeft: 62 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
  },
  footerEdit: {
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: theme.primary + '40',
  },
  footerEditText: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
  footerDelete: {
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: theme.danger + '30',
  },
  footerDeleteText: { fontSize: 15, fontWeight: '700', color: theme.danger },
})
