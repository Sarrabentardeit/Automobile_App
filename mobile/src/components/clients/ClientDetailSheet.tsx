import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import ModalBlurBackdrop from '../ui/ModalBlurBackdrop'
import { getStatusBarInset } from '../../lib/safeArea'
import { theme } from '../../theme/appTheme'
import type { Client } from '../../types/client'

const GRADIENTS: [string, string][] = [
  ['#f97316', '#fb923c'],
  ['#ea580c', '#f97316'],
  ['#c2410c', '#ea580c'],
]

function avatarGradient(nom: string): [string, string] {
  let h = 0
  for (let i = 0; i < nom.length; i++) h = nom.charCodeAt(i) + ((h << 5) - h)
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function initial(nom: string): string {
  const t = nom.trim()
  return t ? t.charAt(0).toUpperCase() : '?'
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  onPress?: () => void
  accent?: boolean
}) {
  const inner = (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, accent && styles.infoIconAccent]}>
        <Ionicons name={icon} size={18} color={accent ? theme.primary : theme.textMuted} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, accent && styles.infoValueAccent]} numberOfLines={3}>
          {value}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
      ) : null}
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
  client: Client | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ClientDetailSheet({
  visible,
  client,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!client) return null

  const tel = client.telephone.replace(/\s/g, '')
  const [c1, c2] = avatarGradient(client.nom)
  const topInset = getStatusBarInset()

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ModalBlurBackdrop onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(20, topInset > 0 ? 12 : 20) }]}>
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <View style={styles.profile}>
            <LinearGradient colors={[c1, c2]} style={styles.avatarLg}>
              <Text style={styles.avatarLgText}>{initial(client.nom)}</Text>
            </LinearGradient>
            <Text style={styles.profileName}>{client.nom}</Text>
            {client.matriculeFiscale ? (
              <View style={styles.mfPill}>
                <Text style={styles.mfPillText}>MF {client.matriculeFiscale}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionGrid}>
            <Pressable
              style={({ pressed }) => [styles.actionPrimary, pressed && styles.pressed]}
              onPress={() => void Linking.openURL(`tel:${tel}`)}
            >
              <Ionicons name="call" size={22} color="#fff" />
              <Text style={styles.actionPrimaryText}>Appeler</Text>
            </Pressable>
            {client.email ? (
              <Pressable
                style={({ pressed }) => [styles.actionSecondary, pressed && styles.pressed]}
                onPress={() => void Linking.openURL(`mailto:${client.email}`)}
              >
                <Ionicons name="mail" size={20} color={theme.primary} />
                <Text style={styles.actionSecondaryText}>E-mail</Text>
              </Pressable>
            ) : (
              <View style={[styles.actionSecondary, styles.actionDisabled]}>
                <Ionicons name="mail-outline" size={20} color={theme.textSubtle} />
                <Text style={styles.actionDisabledText}>E-mail</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coordonnées</Text>
            <View style={styles.sectionCard}>
              <InfoRow
                icon="call-outline"
                label="Téléphone"
                value={client.telephone}
                accent
                onPress={() => void Linking.openURL(`tel:${tel}`)}
              />
              {client.email ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow
                    icon="mail-outline"
                    label="E-mail"
                    value={client.email}
                    onPress={() => void Linking.openURL(`mailto:${client.email}`)}
                  />
                </>
              ) : null}
              {client.adresse ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow icon="location-outline" label="Adresse" value={client.adresse} />
                </>
              ) : null}
            </View>
          </View>

          {client.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
                <Text style={styles.notesText}>{client.notes}</Text>
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

        <Pressable onPress={onClose} hitSlop={12} style={styles.closeFab}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
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
    maxHeight: '92%',
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
  scroll: { paddingHorizontal: 20, paddingBottom: 8 },
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
  },
  profile: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
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
    letterSpacing: -0.3,
  },
  mfPill: {
    marginTop: 8,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  mfPillText: { fontSize: 12, fontWeight: '700', color: theme.primaryDark },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    ...theme.shadow.primaryBtn,
  },
  actionPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primarySoft,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.primary + '33',
  },
  actionSecondaryText: { color: theme.primaryDark, fontSize: 15, fontWeight: '700' },
  actionDisabled: { backgroundColor: theme.bg, borderColor: theme.border },
  actionDisabledText: { color: theme.textSubtle, fontSize: 15, fontWeight: '600' },
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
  notesCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 14,
  },
  notesText: { flex: 1, fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
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
