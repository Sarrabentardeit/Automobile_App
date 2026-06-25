import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CenteredBlurModal from '../ui/CenteredBlurModal'
import { formatDate } from '../../lib/format'
import { formatMontant } from '../../lib/formatMoney'
import { downloadFactureAchatPdf, shareFactureAchatPdf } from '../../lib/factureAchatPdf'
import {
  factureAchatResteTTC,
  factureAchatTotalTTC,
  ligneAchatLabel,
  ligneAchatMontantHT,
} from '../../lib/factureAchatHelpers'
import { MODE_PAIEMENT_OPTIONS, type FactureAchat } from '../../types/factureAchat'
import { theme } from '../../theme/appTheme'
import FactureAchatStatutBadge from './FactureAchatStatutBadge'

type Props = {
  visible: boolean
  facture: FactureAchat | null
  onClose: () => void
  onPayer: () => void
  onValidateValidee: () => void
  onValidatePayee: () => void
  onMarquerPayee: () => void
  onPdfDone?: (msg: string) => void
  onPdfError?: (msg: string) => void
  busy?: boolean
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function ActionBtn({
  label,
  icon,
  onPress,
  variant = 'default',
  disabled,
  loading,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  variant?: 'primary' | 'success' | 'default' | 'outline'
  disabled?: boolean
  loading?: boolean
}) {
  const v =
    variant === 'primary'
      ? styles.actionPrimary
      : variant === 'success'
        ? styles.actionSuccess
        : variant === 'outline'
          ? styles.actionOutline
          : styles.actionDefault
  const t =
    variant === 'primary' || variant === 'success'
      ? styles.actionTextLight
      : variant === 'outline'
        ? styles.actionTextOutline
        : styles.actionTextDefault
  const ic =
    variant === 'primary' || variant === 'success'
      ? '#fff'
      : variant === 'outline'
        ? theme.primary
        : theme.textSecondary

  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, v, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? theme.primary : '#fff'} />
      ) : (
        <Ionicons name={icon} size={17} color={ic} />
      )}
      <Text style={[styles.actionLabel, t]}>{label}</Text>
    </Pressable>
  )
}

function modePaiementLabel(v: string) {
  return MODE_PAIEMENT_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export default function FactureAchatDetailSheet({
  visible,
  facture,
  onClose,
  onPayer,
  onValidateValidee,
  onValidatePayee,
  onMarquerPayee,
  onPdfDone,
  onPdfError,
  busy,
}: Props) {
  const [shareBusy, setShareBusy] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const pdfBusy = shareBusy || downloadBusy

  if (!facture) return null

  const dialogHeight = Math.min(Dimensions.get('window').height * 0.9, 680)
  const timbre = facture.timbre ?? 1
  const total = factureAchatTotalTTC(facture.lignes, timbre)
  const paye = facture.montantPaye ?? 0
  const reste = factureAchatResteTTC(facture)
  const canPayer = facture.statut === 'validee' || facture.statut === 'partiellement_payee'
  const isBrouillon = facture.statut === 'brouillon'
  const canMarquerPayee =
    (facture.statut === 'validee' || facture.statut === 'partiellement_payee') && reste > 0.01

  const handleSharePdf = async () => {
    setShareBusy(true)
    try {
      await shareFactureAchatPdf(facture)
      onPdfDone?.('Facture prête à envoyer')
    } catch (e) {
      onPdfError?.(e instanceof Error ? e.message : 'Erreur partage PDF')
    } finally {
      setShareBusy(false)
    }
  }

  const handleDownloadPdf = async () => {
    setDownloadBusy(true)
    try {
      const result = await downloadFactureAchatPdf(facture)
      if (result === 'saved_downloads') {
        onPdfDone?.('PDF enregistré dans Téléchargements')
      } else {
        onPdfDone?.("PDF ouvert — choisissez un lecteur ou enregistrez depuis l'aperçu")
      }
    } catch (e) {
      onPdfError?.(e instanceof Error ? e.message : 'Erreur téléchargement PDF')
    } finally {
      setDownloadBusy(false)
    }
  }

  return (
    <CenteredBlurModal visible={visible} onClose={onClose}>
      <View style={[styles.card, { maxHeight: dialogHeight }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.numero}>{facture.numero}</Text>
            <Text style={styles.fournisseurName} numberOfLines={1}>
              {facture.fournisseurNom}
            </Text>
            <View style={styles.headerMeta}>
              <Text style={styles.date}>{formatDate(facture.date)}</Text>
              <FactureAchatStatutBadge statut={facture.statut} compact />
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => void handleSharePdf()}
              style={styles.iconBtn}
              hitSlop={8}
              disabled={pdfBusy || busy}
              accessibilityLabel="Envoyer la facture"
            >
              {shareBusy ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="share-outline" size={20} color={theme.primary} />
              )}
            </Pressable>
            <Pressable
              onPress={() => void handleDownloadPdf()}
              style={styles.iconBtn}
              hitSlop={8}
              disabled={pdfBusy || busy}
              accessibilityLabel="Télécharger le PDF"
            >
              {downloadBusy ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="download-outline" size={20} color={theme.primary} />
              )}
            </Pressable>
            <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          bounces={false}
        >
          <View style={styles.summary}>
            <View style={styles.summaryMain}>
              <Text style={styles.summaryLabel}>Total TTC</Text>
              <Text style={styles.summaryValue}>{formatMontant(total)}</Text>
            </View>
            {(paye > 0 || (reste > 0.01 && !isBrouillon)) && (
              <View style={styles.summaryRow}>
                {paye > 0 ? (
                  <View style={styles.summaryChip}>
                    <Text style={styles.chipLabel}>Payé</Text>
                    <Text style={styles.chipValue}>{formatMontant(paye)}</Text>
                  </View>
                ) : null}
                {reste > 0.01 && !isBrouillon ? (
                  <View style={[styles.summaryChip, styles.summaryChipWarn]}>
                    <Text style={styles.chipLabel}>Reste</Text>
                    <Text style={[styles.chipValue, styles.chipValueWarn]}>
                      {formatMontant(reste)}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {isBrouillon ? (
            <Text style={styles.hint}>Édition des lignes sur la version web</Text>
          ) : null}

          {(facture.numeroFactureFournisseur?.trim() || facture.modePaiement?.trim()) && (
            <Section title="Fournisseur">
              {facture.numeroFactureFournisseur?.trim() ? (
                <View style={styles.infoLine}>
                  <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                  <Text style={styles.infoValue}>N° fact. : {facture.numeroFactureFournisseur}</Text>
                </View>
              ) : null}
              {facture.modePaiement?.trim() ? (
                <View style={styles.infoLine}>
                  <Ionicons name="card-outline" size={16} color={theme.primary} />
                  <Text style={styles.infoValue}>
                    {modePaiementLabel(facture.modePaiement)}
                  </Text>
                </View>
              ) : null}
            </Section>
          )}

          <Section title={`Lignes · ${facture.lignes.length}`}>
            {facture.lignes.map((l, i) => (
              <View key={i} style={[styles.ligneRow, i > 0 && styles.ligneBorder]}>
                <View style={styles.ligneLeft}>
                  <Text style={styles.ligneDesignation} numberOfLines={2}>
                    {l.designation || '—'}
                  </Text>
                  <Text style={styles.ligneSub}>
                    {ligneAchatLabel(l)} · Qté {l.quantite}
                  </Text>
                </View>
                <Text style={styles.ligneMontant}>{formatMontant(ligneAchatMontantHT(l))}</Text>
              </View>
            ))}
            {timbre > 0 ? (
              <View style={[styles.ligneRow, styles.ligneBorder]}>
                <Text style={styles.ligneDesignation}>Timbre</Text>
                <Text style={styles.ligneMontant}>{formatMontant(timbre)}</Text>
              </View>
            ) : null}
          </Section>

          {(facture.paiements?.length ?? 0) > 0 ? (
            <Section title="Paiements">
              {facture.paiements!.map((p, i) => (
                <View key={p.id} style={[styles.paiementRow, i > 0 && styles.ligneBorder]}>
                  <View style={styles.paiementLeft}>
                    <Text style={styles.paiementDate}>{formatDate(p.date)}</Text>
                    {p.mode ? <Text style={styles.paiementMode}>{p.mode}</Text> : null}
                  </View>
                  <Text style={styles.paiementMontant}>{formatMontant(p.montant)}</Text>
                </View>
              ))}
            </Section>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {isBrouillon ? (
            <>
              <ActionBtn
                label="Valider"
                icon="checkmark-circle-outline"
                onPress={onValidateValidee}
                variant="default"
                disabled={busy || pdfBusy}
              />
              <ActionBtn
                label="Payée"
                icon="checkmark-outline"
                onPress={onValidatePayee}
                variant="primary"
                disabled={busy || pdfBusy}
              />
            </>
          ) : null}
          {canPayer ? (
            <ActionBtn
              label="Payer"
              icon="wallet-outline"
              onPress={onPayer}
              variant="primary"
              disabled={busy || pdfBusy || reste <= 0.01}
            />
          ) : null}
          {canMarquerPayee ? (
            <ActionBtn
              label="Solder"
              icon="checkmark-done-outline"
              onPress={onMarquerPayee}
              variant="success"
              disabled={busy || pdfBusy}
            />
          ) : null}
        </View>
      </View>
    </CenteredBlurModal>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  headerText: { flex: 1, gap: 4 },
  headerActions: { flexDirection: 'row', gap: 6 },
  numero: { fontSize: 13, fontWeight: '500', color: theme.primaryDark, letterSpacing: 0.3 },
  fournisseurName: { fontSize: 20, fontWeight: '600', color: theme.text },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  date: { fontSize: 13, color: theme.textMuted },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 12, paddingTop: 14 },
  summary: {
    backgroundColor: theme.primarySoft,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  summaryMain: { gap: 4 },
  summaryLabel: { fontSize: 13, color: theme.textMuted },
  summaryValue: { fontSize: 28, fontWeight: '600', color: theme.primaryDark, letterSpacing: -0.5 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  summaryChip: {
    backgroundColor: theme.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
  },
  summaryChipWarn: { backgroundColor: theme.surface },
  chipLabel: { fontSize: 11, color: theme.textSubtle },
  chipValue: { fontSize: 15, fontWeight: '600', color: theme.text, marginTop: 2 },
  chipValueWarn: { color: theme.primaryDark },
  hint: {
    fontSize: 12,
    color: theme.textSubtle,
    marginBottom: 14,
    marginTop: -6,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSubtle,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionBody: {
    backgroundColor: theme.surfaceMuted,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderLight,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  infoValue: { flex: 1, fontSize: 14, color: theme.text, lineHeight: 20 },
  ligneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ligneBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.borderLight,
  },
  ligneLeft: { flex: 1 },
  ligneDesignation: { fontSize: 14, color: theme.text, lineHeight: 20 },
  ligneSub: { fontSize: 12, color: theme.textSubtle, marginTop: 3 },
  ligneMontant: { fontSize: 14, fontWeight: '600', color: theme.text },
  paiementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paiementLeft: { flex: 1 },
  paiementDate: { fontSize: 14, color: theme.text },
  paiementMode: { fontSize: 12, color: theme.textSubtle, marginTop: 2, textTransform: 'capitalize' },
  paiementMontant: { fontSize: 14, fontWeight: '600', color: theme.success },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.borderLight,
    backgroundColor: theme.surface,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: '47%',
    flexGrow: 1,
  },
  actionDefault: { backgroundColor: theme.surfaceMuted },
  actionOutline: {
    backgroundColor: theme.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  actionPrimary: { backgroundColor: theme.primary },
  actionSuccess: { backgroundColor: theme.success },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  actionTextDefault: { color: theme.textSecondary },
  actionTextOutline: { color: theme.primaryDark },
  actionTextLight: { color: '#fff' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
})
