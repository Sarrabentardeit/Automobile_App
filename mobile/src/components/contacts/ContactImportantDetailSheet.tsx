import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from '../ui/ModalBlurBackdrop'
import { getStatusBarInset } from '../../lib/safeArea'
import { theme } from '../../theme/appTheme'
import type { ContactImportant } from '../../types/contactImportant'

type Props = {
  visible: boolean
  contact: ContactImportant | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ContactImportantDetailSheet({
  visible,
  contact,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!contact) return null

  const tel = contact.numero.replace(/\s/g, '')
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
            <View style={styles.iconLg}>
              <Ionicons name="call" size={32} color={theme.primary} />
            </View>
            <Text style={styles.profileName}>{contact.nom}</Text>
            {contact.categorie ? (
              <View style={styles.catPill}>
                <Text style={styles.catPillText}>{contact.categorie}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
            onPress={() => void Linking.openURL(`tel:${tel}`)}
          >
            <Ionicons name="call" size={22} color="#fff" />
            <Text style={styles.callBtnText}>Appeler</Text>
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <View style={styles.sectionCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={theme.textMuted} />
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Nom</Text>
                  <Text style={styles.infoValue}>{contact.nom}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable
                onPress={() => void Linking.openURL(`tel:${tel}`)}
                style={({ pressed }) => pressed && { opacity: 0.88 }}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color={theme.primary} />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Numéro</Text>
                    <Text style={[styles.infoValue, styles.infoAccent]}>{contact.numero}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                </View>
              </Pressable>
            </View>
          </View>

          {contact.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{contact.notes}</Text>
              </View>
            </View>
          ) : null}
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
  iconLg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    textAlign: 'center',
  },
  catPill: {
    marginTop: 8,
    backgroundColor: theme.bg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.border,
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: theme.textSecondary },
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
  pressed: { opacity: 0.9 },
  section: { marginBottom: 16 },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: theme.text },
  infoAccent: { color: theme.primary },
  divider: { height: 1, backgroundColor: theme.borderLight, marginLeft: 44 },
  notesCard: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
  },
  notesText: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
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
