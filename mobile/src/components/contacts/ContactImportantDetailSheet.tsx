import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredSheetShell from '../ui/CenteredSheetShell'
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

  return (
    <CenteredSheetShell
      visible={visible}
      onClose={onClose}
      footer={
        <>
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
        </>
      }
    >
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
    </CenteredSheetShell>
  )
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 36,
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
