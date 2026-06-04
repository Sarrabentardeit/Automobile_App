import { useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  cycleVoyant,
  GARAGE_NAME_ORDRE,
  getWebAssetUrl,
  PIECES_TOTAL,
  STATUT_LABELS,
  TRAVAUX_TOTAL,
  VOYANT_KEYS,
  VOYANT_LABELS,
  type OrdreExcelFormState,
  type VoyantEtat,
} from '../lib/ordreFormHelpers'
import type { OrdreLigneStatut } from '../types/vehicule'

const LBL = '#e8e8e8'
const BDR = '#888'
const VOYANT_COLORS: Record<VoyantEtat, string> = {
  ok: '#22c55e',
  anomalie: '#ef4444',
  nc: '#9ca3af',
}

type Props = {
  form: OrdreExcelFormState
  onChange: (next: OrdreExcelFormState) => void
}

export default function OrdreExcelForm({ form, onChange }: Props) {
  const [schemaFailed, setSchemaFailed] = useState(false)
  const schemaUri = getWebAssetUrl('/ordre-reparation-schema-voiture.jpg')

  const set = <K extends keyof OrdreExcelFormState>(k: K, v: OrdreExcelFormState[K]) =>
    onChange({ ...form, [k]: v })

  const setComp = <K extends keyof OrdreExcelFormState['complement']>(
    k: K,
    v: OrdreExcelFormState['complement'][K]
  ) => onChange({ ...form, complement: { ...form.complement, [k]: v } })

  const travauxPad = Math.max(0, TRAVAUX_TOTAL - form.lignes.length)
  const pieceSlots = [...form.complement.pieces]
  while (pieceSlots.length < PIECES_TOTAL) pieceSlots.push({ quantite: '', produit: '' })

  const cycleStatut = (idx: number) => {
    const lignes = [...form.lignes]
    const order: OrdreLigneStatut[] = ['en_attente', 'fait', 'na']
    const cur = lignes[idx].statut
    lignes[idx] = { ...lignes[idx], statut: order[(order.indexOf(cur) + 1) % order.length] }
    onChange({ ...form, lignes })
  }

  return (
    <View style={styles.sheet}>
      <Text style={styles.mainTitle}>ORDRE DE RÉPARATION</Text>
      <Text style={styles.garageName}>{GARAGE_NAME_ORDRE}</Text>
      <Text style={styles.subEn}>R E P A I R W O R K O R D E R</Text>

      <ExcelRow
        leftLabel="NOM DU CLIENT"
        leftValue={form.clientNom}
        onLeftChange={(v) => set('clientNom', v)}
        rightLabel="TÉLÉPHONE CLIENT"
        rightValue={form.clientTelephone}
        onRightChange={(v) => set('clientTelephone', v)}
      />
      <ExcelRow
        leftLabel="VOITURE"
        leftValue={form.voiture}
        onLeftChange={(v) => set('voiture', v)}
        rightLabel="IMMATRICULATION"
        rightValue={form.immatriculation}
        onRightChange={(v) => set('immatriculation', v)}
      />
      <ExcelRow
        leftLabel="KILOMETRAGE"
        leftValue={form.kilometrage}
        onLeftChange={(v) => set('kilometrage', v)}
        rightLabel="TECHNICIEN"
        rightValue={form.technicien}
        onRightChange={(v) => set('technicien', v)}
        keyboardType="numeric"
      />
      <ExcelRow
        leftLabel="DATE D'ENTRÉE"
        leftValue={form.dateEntree}
        onLeftChange={(v) => set('dateEntree', v)}
        rightLabel="VIN NUMBER"
        rightValue={form.vin}
        onRightChange={(v) => set('vin', v)}
      />

      <View style={styles.twoCol}>
        <View style={styles.leftCol}>
          <View style={styles.thRow}>
            <Text style={[styles.th, { flex: 3 }]}>TRAVAUX DEMANDEES</Text>
            <Text style={[styles.th, { flex: 1 }]}>STATUT</Text>
          </View>
          {form.lignes.map((l, i) => (
            <View key={`l-${i}`} style={styles.travauxRow}>
              <TextInput
                style={[styles.cellInput, { flex: 3 }]}
                value={l.description}
                onChangeText={(v) => {
                  const lignes = [...form.lignes]
                  lignes[i] = { ...lignes[i], description: v }
                  onChange({ ...form, lignes })
                }}
              />
              <Pressable
                style={[styles.statutChip, { flex: 1 }]}
                onPress={() => cycleStatut(i)}
              >
                <Text style={styles.statutChipText}>{STATUT_LABELS[l.statut]}</Text>
              </Pressable>
            </View>
          ))}
          {Array.from({ length: travauxPad }).map((_, j) => (
            <View key={`pad-${j}`} style={styles.travauxRow}>
              <View style={[styles.cellPad, { flex: 3 }]} />
              <View style={[styles.cellPad, { flex: 1 }]} />
            </View>
          ))}
          <Pressable
            style={styles.addLink}
            onPress={() =>
              onChange({
                ...form,
                lignes: [
                  ...form.lignes,
                  { description: '', statut: 'en_attente', ordre: form.lignes.length },
                ],
              })
            }
          >
            <Text style={styles.addLinkText}>+ Ligne travail</Text>
          </Pressable>

          <View style={styles.thRow}>
            <Text style={[styles.th, { flex: 1 }]}>QUANTITE</Text>
            <Text style={[styles.th, { flex: 2 }]}>PRODUITS / PIECES</Text>
          </View>
          {pieceSlots.map((p, i) => (
            <View key={`p-${i}`} style={styles.travauxRow}>
              <TextInput
                style={[styles.cellInput, { flex: 1, textAlign: 'center' }]}
                value={p.quantite}
                onChangeText={(v) => {
                  const pieces = [...form.complement.pieces]
                  while (pieces.length <= i) pieces.push({ quantite: '', produit: '' })
                  pieces[i] = { ...pieces[i], quantite: v }
                  onChange({ ...form, complement: { ...form.complement, pieces } })
                }}
              />
              <TextInput
                style={[styles.cellInput, { flex: 2 }]}
                value={p.produit}
                onChangeText={(v) => {
                  const pieces = [...form.complement.pieces]
                  while (pieces.length <= i) pieces.push({ quantite: '', produit: '' })
                  pieces[i] = { ...pieces[i], produit: v }
                  onChange({ ...form, complement: { ...form.complement, pieces } })
                }}
              />
            </View>
          ))}
          <Pressable
            style={styles.addLink}
            onPress={() =>
              onChange({
                ...form,
                complement: {
                  ...form.complement,
                  pieces: [...form.complement.pieces, { quantite: '', produit: '' }],
                },
              })
            }
          >
            <Text style={styles.addLinkText}>+ Ligne pièce</Text>
          </Pressable>
        </View>

        <View style={styles.rightCol}>
          <View style={styles.cornerLabels}>
            <Text style={styles.cornerLbl}>AV. G</Text>
            <Text style={styles.cornerLbl}>AV. D</Text>
          </View>
          {!schemaFailed ? (
            <Image
              source={{ uri: schemaUri }}
              style={styles.schemaImg}
              resizeMode="contain"
              onError={() => setSchemaFailed(true)}
            />
          ) : (
            <View style={styles.schemaPlaceholder}>
              <Text style={styles.schemaPlaceholderText}>Schéma véhicule</Text>
            </View>
          )}
          <View style={styles.carroRow}>
            {(['avG', 'avD', 'arG', 'arD', 'toit'] as const).map((key) => (
              <TextInput
                key={key}
                style={styles.carroInput}
                placeholder={key.toUpperCase()}
                placeholderTextColor="#9ca3af"
                value={form.carrosserie[key]}
                onChangeText={(v) =>
                  onChange({
                    ...form,
                    carrosserie: { ...form.carrosserie, [key]: v },
                  })
                }
              />
            ))}
          </View>

          <View style={styles.voyantGrid}>
            {VOYANT_KEYS.map((key) => {
              const etat = form.voyants[key] ?? 'nc'
              return (
                <Pressable
                  key={key}
                  style={[styles.voyantCell, { backgroundColor: VOYANT_COLORS[etat] }]}
                  onPress={() =>
                    onChange({
                      ...form,
                      voyants: {
                        ...form.voyants,
                        [key]: cycleVoyant(form.voyants[key] ?? 'nc'),
                      },
                    })
                  }
                >
                  <Text style={styles.voyantLbl} numberOfLines={1}>
                    {VOYANT_LABELS[key]}
                  </Text>
                  <Text style={styles.voyantEtat}>
                    {etat === 'ok' ? 'OK' : etat === 'anomalie' ? '!' : 'N/C'}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.sectionHdr}>TRAVAUX PROCHAINS</Text>
          <TextInput
            style={styles.textarea}
            value={form.complement.travauxProchains}
            onChangeText={(v) => setComp('travauxProchains', v)}
            multiline
          />
          <LabeledField label="PRIX" value={form.complement.prix} onChange={(v) => setComp('prix', v)} />
          <LabeledField
            label="TECHNICIEN"
            value={form.complement.technicienMention}
            onChange={(v) => setComp('technicienMention', v)}
          />
        </View>
      </View>

      <LabeledField
        label="SIGNATURE CONTRÔLE QUALITÉ OU GÉRANT"
        value={form.complement.signatureControle}
        onChange={(v) => setComp('signatureControle', v)}
      />
      <Text style={styles.sectionHdr}>NOTE</Text>
      <TextInput
        style={styles.textarea}
        value={form.complement.note}
        onChangeText={(v) => setComp('note', v)}
        multiline
      />
      <LabeledField label="FICHE REMPLIE PAR" value={form.rempliPar} onChange={(v) => set('rempliPar', v)} />
    </View>
  )
}

function ExcelRow({
  leftLabel,
  leftValue,
  onLeftChange,
  rightLabel,
  rightValue,
  onRightChange,
  keyboardType,
}: {
  leftLabel: string
  leftValue: string
  onLeftChange: (v: string) => void
  rightLabel: string
  rightValue: string
  onRightChange: (v: string) => void
  keyboardType?: 'default' | 'numeric'
}) {
  return (
    <View style={styles.excelRow}>
      <Text style={styles.lbl}>{leftLabel}</Text>
      <TextInput
        style={styles.val}
        value={leftValue}
        onChangeText={onLeftChange}
        keyboardType={keyboardType}
      />
      <Text style={styles.lbl}>{rightLabel}</Text>
      <TextInput style={styles.val} value={rightValue} onChangeText={onRightChange} />
    </View>
  )
}

function LabeledField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View style={styles.labeledRow}>
      <Text style={styles.lblWide}>{label}</Text>
      <TextInput style={styles.valFlex} value={value} onChangeText={onChange} />
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    borderWidth: 1.5,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  mainTitle: { fontSize: 16, fontWeight: '900', paddingHorizontal: 8, paddingTop: 8 },
  garageName: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8 },
  subEn: {
    textAlign: 'center',
    fontSize: 8,
    letterSpacing: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    paddingVertical: 4,
    color: '#333',
  },
  excelRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BDR },
  lbl: {
    width: '22%',
    backgroundColor: LBL,
    fontSize: 9,
    fontWeight: '700',
    padding: 6,
    borderRightWidth: 1,
    borderColor: BDR,
  },
  val: {
    width: '28%',
    fontSize: 11,
    padding: 6,
    borderRightWidth: 1,
    borderColor: BDR,
    color: '#111',
  },
  twoCol: { flexDirection: 'row' },
  leftCol: { flex: 52, borderRightWidth: 1, borderColor: '#000' },
  rightCol: { flex: 48 },
  thRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BDR },
  th: {
    backgroundColor: '#d9d9d9',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    padding: 5,
    borderRightWidth: 1,
    borderColor: BDR,
  },
  travauxRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BDR, minHeight: 32 },
  cellInput: {
    fontSize: 10,
    padding: 4,
    borderRightWidth: 1,
    borderColor: BDR,
    color: '#111',
  },
  cellPad: {
    borderRightWidth: 1,
    borderColor: BDR,
    minHeight: 28,
    backgroundColor: '#fafafa',
  },
  statutChip: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 2,
  },
  statutChipText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  addLink: { padding: 6, borderBottomWidth: 1, borderColor: BDR },
  addLinkText: { fontSize: 10, color: '#1a56db', fontWeight: '600' },
  cornerLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: BDR,
  },
  cornerLbl: { fontSize: 9, fontWeight: '700' },
  schemaImg: { width: '100%', height: 140, backgroundColor: '#fff' },
  schemaPlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderColor: BDR,
  },
  schemaPlaceholderText: { fontSize: 10, color: '#6b7280' },
  carroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, borderBottomWidth: 1, borderColor: BDR },
  carroInput: {
    flex: 1,
    minWidth: '30%',
    borderWidth: 1,
    borderColor: BDR,
    fontSize: 9,
    padding: 4,
  },
  voyantGrid: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderColor: BDR },
  voyantCell: { width: '50%', padding: 6, borderWidth: 0.5, borderColor: '#000' },
  voyantLbl: { fontSize: 8, fontWeight: '700', color: '#fff' },
  voyantEtat: { fontSize: 8, color: '#fff' },
  sectionHdr: {
    backgroundColor: LBL,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    padding: 4,
    borderBottomWidth: 1,
    borderColor: BDR,
  },
  textarea: {
    minHeight: 64,
    fontSize: 11,
    padding: 6,
    borderBottomWidth: 1,
    borderColor: BDR,
    textAlignVertical: 'top',
    color: '#111',
  },
  labeledRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BDR },
  lblWide: {
    backgroundColor: LBL,
    fontSize: 8,
    fontWeight: '700',
    padding: 6,
    maxWidth: '42%',
    borderRightWidth: 1,
    borderColor: BDR,
  },
  valFlex: { flex: 1, fontSize: 11, padding: 6, color: '#111' },
})
