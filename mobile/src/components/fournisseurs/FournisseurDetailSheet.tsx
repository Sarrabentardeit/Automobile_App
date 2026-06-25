import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { theme } from '../../theme/appTheme'
import type { Fournisseur } from '../../types/fournisseur'

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
        <Ionicons
          name={icon}
          size={18}
          color={accent ? theme.primary : theme.textMuted}
        />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, accent && styles.infoValueAccent]}
          numberOfLines={4}
        >
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
  fournisseur: Fournisseur | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function FournisseurDetailSheet({
  visible,
  fournisseur,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!fournisseur) return null

  const [c1, c2] = avatarGradient(fournisseur.nom)
  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 560)
  const tel = fournisseur.telephone.replace(/\s/g, '')

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Fournisseur</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {fournisseur.nom}
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
              <Text style={styles.avatarLgText}>{initial(fournisseur.nom)}</Text>
            </LinearGradient>
            <Text style={styles.name}>{fournisseur.nom}</Text>
            {fournisseur.contact?.trim() ? (
              <Text style={styles.contactPill}>Contact : {fournisseur.contact}</Text>
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
            {fournisseur.email ? (
              <Pressable
                style={({ pressed }) => [styles.actionSecondary, pressed && styles.pressed]}
                onPress={() => void Linking.openURL(`mailto:${fournisseur.email}`)}
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
                value={fournisseur.telephone}
                accent
                onPress={() => void Linking.openURL(`tel:${tel}`)}
              />
              {fournisseur.email ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow
                    icon="mail-outline"
                    label="E-mail"
                    value={fournisseur.email}
                    onPress={() => void Linking.openURL(`mailto:${fournisseur.email}`)}
                  />
                </>
              ) : null}
              {fournisseur.adresse ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow icon="location-outline" label="Adresse" value={fournisseur.adresse} />
                </>
              ) : null}
              {fournisseur.contact ? (
                <>
                  <View style={styles.divider} />
                  <InfoRow icon="person-outline" label="Personne de contact" value={fournisseur.contact} />
                </>
              ) : null}
            </View>
          </View>

          {fournisseur.notes ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
                <Text style={styles.notesText}>{fournisseur.notes}</Text>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 8 },
  profile: { alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarLgText: { fontSize: 26, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center' },
  contactPill: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: theme.primaryDark,
    backgroundColor: theme.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 13,
    borderRadius: theme.radius.sm,
  },
  actionPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  actionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primarySoft,
    paddingVertical: 13,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.primary + '33',
  },
  actionSecondaryText: { color: theme.primaryDark, fontSize: 15, fontWeight: '700' },
  actionDisabled: { backgroundColor: theme.bg, borderColor: theme.border },
  actionDisabledText: { color: theme.textSubtle, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.9 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    padding: 12,
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
  divider: { height: 1, backgroundColor: theme.borderLight, marginLeft: 60 },
  notesCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    padding: 12,
  },
  notesText: { flex: 1, fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
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
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
  },
  footerEdit: {
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: theme.primary + '40',
  },
  footerEditText: { fontWeight: '700', color: theme.primaryDark },
  footerDelete: {
    backgroundColor: theme.dangerSoft,
    borderWidth: 1,
    borderColor: theme.danger + '30',
  },
  footerDeleteText: { fontWeight: '700', color: theme.danger },
})
