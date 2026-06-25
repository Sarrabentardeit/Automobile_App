import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatDate } from '../../lib/format'
import { formatMontant } from '../../lib/formatMoney'
import { theme } from '../../theme/appTheme'
import type { DemandeDevis } from '../../types/demandeDevis'
import DevisStatutBadge from './DevisStatutBadge'

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
        <Text style={styles.infoValue}>{value}</Text>
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
  demande: DemandeDevis | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function DevisDetailSheet({
  visible,
  demande,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  if (!demande) return null

  const dialogHeight = Math.min(Dimensions.get('window').height * 0.88, 620)
  const tel = demande.clientTelephone?.replace(/\s/g, '') ?? ''

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.accent} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Demande de devis</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {demande.clientName}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.badgeRow}>
            <DevisStatutBadge statut={demande.statut} />
            {demande.montantEstime != null && demande.montantEstime > 0 ? (
              <View style={styles.montantPill}>
                <Text style={styles.montantLabel}>Montant estimé</Text>
                <Text style={styles.montantValue}>{formatMontant(demande.montantEstime)}</Text>
              </View>
            ) : null}
          </View>

          <InfoRow icon="calendar-outline" label="Date demande" value={formatDate(demande.date)} />
          {demande.dateLimite ? (
            <InfoRow icon="time-outline" label="Date limite" value={formatDate(demande.dateLimite)} />
          ) : null}
          {tel ? (
            <InfoRow
              icon="call-outline"
              label="Téléphone client"
              value={demande.clientTelephone ?? ''}
              onPress={() => void Linking.openURL(`tel:${tel}`)}
            />
          ) : null}
          {demande.vehicleRef?.trim() ? (
            <InfoRow icon="car-outline" label="Véhicule" value={demande.vehicleRef} />
          ) : null}

          <View style={styles.descBlock}>
            <Text style={styles.descLabel}>Travaux demandés</Text>
            <Text style={styles.descText}>{demande.description}</Text>
          </View>

          {demande.notes?.trim() ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes internes</Text>
              <Text style={styles.notesText}>{demande.notes}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.editBtn} onPress={onEdit}>
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Modifier</Text>
          </Pressable>
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
          </Pressable>
        </View>
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
    maxWidth: 420,
  },
  accent: { height: 4, backgroundColor: theme.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textMuted, marginTop: 2 },
  scroll: { paddingHorizontal: 18, paddingBottom: 8, gap: 4 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  montantPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  montantLabel: { fontSize: 10, fontWeight: '700', color: '#047857', textTransform: 'uppercase' },
  montantValue: { fontSize: 16, fontWeight: '800', color: '#065f46', marginTop: 2 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.text, lineHeight: 20 },
  descBlock: {
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  descLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, marginBottom: 6 },
  descText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  notesBlock: {
    marginTop: 10,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  notesLabel: { fontSize: 11, fontWeight: '700', color: '#92400e', marginBottom: 6 },
  notesText: { fontSize: 13, color: '#78350f', lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
})
