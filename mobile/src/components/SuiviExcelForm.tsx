import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { VehiculeSuiviInput } from '../types/vehicule'

const C_GREEN = '#D7E4BD'
const C_BLUE_H = '#B9CDE5'
const C_BLUE_F = '#C6D9F1'

type Props = {
  data: VehiculeSuiviInput
  onChange: (next: VehiculeSuiviInput) => void
  numero?: string
  readOnly?: boolean
}

type LineField = 'travauxEffectues' | 'travauxProchains' | 'produitsUtilises'

function linesOf(value: string | undefined): string[] {
  const parts = (value ?? '').split('\n')
  return parts.length === 0 ? [''] : parts
}

function padTo(lines: string[], n: number): string[] {
  const copy = [...lines]
  while (copy.length < n) copy.push('')
  return copy
}

function setLine(
  field: LineField,
  lines: string[],
  rowCount: number,
  i: number,
  val: string,
  data: VehiculeSuiviInput,
  onChange: (next: VehiculeSuiviInput) => void
) {
  const copy = padTo(lines, rowCount)
  copy[i] = val
  onChange({ ...data, [field]: copy.join('\n') })
}

export default function SuiviExcelForm({ data, onChange, numero, readOnly = false }: Props) {
  const set = <K extends keyof VehiculeSuiviInput>(k: K, v: VehiculeSuiviInput[K]) => {
    if (readOnly) return
    onChange({ ...data, [k]: v })
  }

  const travEff = linesOf(data.travauxEffectues)
  const travProch = linesOf(data.travauxProchains)
  const produits = linesOf(data.produitsUtilises)
  const rowCount = Math.max(1, travEff.length, travProch.length, produits.length)

  const eff = padTo(travEff, rowCount)
  const proch = padTo(travProch, rowCount)
  const prod = padTo(produits, rowCount)

  const addRow = () => {
    if (readOnly) return
    onChange({
      ...data,
      travauxEffectues: padTo(linesOf(data.travauxEffectues), rowCount).concat('').join('\n'),
      travauxProchains: padTo(linesOf(data.travauxProchains), rowCount).concat('').join('\n'),
      produitsUtilises: padTo(linesOf(data.produitsUtilises), rowCount).concat('').join('\n'),
    })
  }

  const removeRow = (i: number) => {
    if (readOnly || rowCount <= 1) return
    const next = (lines: string[]) => {
      const copy = padTo(lines, rowCount)
      copy.splice(i, 1)
      return (copy.length ? copy : ['']).join('\n')
    }
    onChange({
      ...data,
      travauxEffectues: next(linesOf(data.travauxEffectues)),
      travauxProchains: next(linesOf(data.travauxProchains)),
      produitsUtilises: next(linesOf(data.produitsUtilises)),
    })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleBox}>
        <Text style={styles.title}>SUIVI</Text>
        {numero ? <Text style={styles.numero}>{numero}</Text> : null}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Date :</Text>
          <TextInput
            style={styles.valInput}
            value={data.date ?? ''}
            onChangeText={(v) => set('date', v)}
            placeholder="AAAA-MM-JJ"
            editable={!readOnly}
          />
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Voiture :</Text>
          <TextInput
            style={styles.valInput}
            value={data.voiture ?? ''}
            onChangeText={(v) => set('voiture', v)}
            editable={!readOnly}
          />
        </View>
      </View>
      <View style={styles.infoRow}>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Kilométrage :</Text>
          <TextInput
            style={styles.valInput}
            value={data.kilometrage ?? ''}
            onChangeText={(v) => set('kilometrage', v)}
            keyboardType="number-pad"
            editable={!readOnly}
          />
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Matricule :</Text>
          <TextInput
            style={styles.valInput}
            value={data.matricule ?? ''}
            onChangeText={(v) => set('matricule', v)}
            editable={!readOnly}
          />
        </View>
      </View>

      <View style={styles.colHeader}>
        <Text style={[styles.th, { flex: 41 }]}>TRAVAUX EFFECTUÉES</Text>
        <Text style={[styles.th, { flex: 36 }]}>TRAVAUX PROCHAINS</Text>
        <Text style={[styles.th, { flex: 23 }]}>PRODUITS UTILISÉS</Text>
        {!readOnly ? <View style={styles.thAction} /> : null}
      </View>
      {Array.from({ length: rowCount }, (_, i) => (
        <View key={i} style={styles.dataRow}>
          <TextInput
            style={[styles.dataCell, { flex: 41 }]}
            value={eff[i] ?? ''}
            onChangeText={(v) => setLine('travauxEffectues', eff, rowCount, i, v, data, onChange)}
            editable={!readOnly}
          />
          <TextInput
            style={[styles.dataCell, { flex: 36 }]}
            value={proch[i] ?? ''}
            onChangeText={(v) => setLine('travauxProchains', proch, rowCount, i, v, data, onChange)}
            editable={!readOnly}
          />
          <TextInput
            style={[styles.dataCell, { flex: 23 }]}
            value={prod[i] ?? ''}
            onChangeText={(v) => setLine('produitsUtilises', prod, rowCount, i, v, data, onChange)}
            editable={!readOnly}
          />
          {!readOnly ? (
            <Pressable
              onPress={() => removeRow(i)}
              disabled={rowCount <= 1}
              style={[styles.delBtn, rowCount <= 1 && styles.delBtnDisabled]}
              hitSlop={6}
            >
              <Text style={[styles.delText, rowCount <= 1 && styles.delTextDisabled]}>×</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {!readOnly ? (
        <Pressable onPress={addRow} style={styles.addRow}>
          <Text style={styles.addText}>+ Ajouter une ligne</Text>
        </Pressable>
      ) : null}

      <View style={styles.footerRow}>
        <View style={styles.techBox}>
          <Text style={styles.techLbl}>TECHNICIEN :</Text>
          <TextInput
            style={styles.techInput}
            value={data.technicien ?? ''}
            onChangeText={(v) => set('technicien', v)}
            editable={!readOnly}
          />
        </View>
        <View style={styles.rempliBox}>
          <Text style={styles.lbl}>Fiche remplie par :</Text>
          <TextInput
            style={styles.valInput}
            value={data.rempliPar ?? ''}
            onChangeText={(v) => set('rempliPar', v)}
            editable={!readOnly}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  titleBox: {
    backgroundColor: C_GREEN,
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 28, letterSpacing: 2, color: '#111' },
  numero: { fontSize: 10, color: '#555', marginTop: 2 },
  infoRow: { flexDirection: 'row', gap: 0, marginBottom: 0 },
  infoCell: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#888' },
  lbl: {
    backgroundColor: C_GREEN,
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '700',
    borderRightWidth: 1,
    borderColor: '#888',
  },
  valInput: {
    flex: 1,
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 6,
    color: '#111',
  },
  colHeader: { flexDirection: 'row', marginTop: 4 },
  th: {
    backgroundColor: C_BLUE_H,
    borderWidth: 1,
    borderColor: '#888',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    paddingVertical: 5,
  },
  thAction: {
    width: 28,
    backgroundColor: C_BLUE_H,
    borderWidth: 1,
    borderColor: '#888',
  },
  dataRow: { flexDirection: 'row', alignItems: 'stretch' },
  dataCell: {
    borderWidth: 1,
    borderColor: '#888',
    fontSize: 11,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 28,
    color: '#111',
  },
  delBtn: {
    width: 28,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  delBtnDisabled: { opacity: 0.4 },
  delText: { fontSize: 16, color: '#c0392b', fontWeight: '700' },
  delTextDisabled: { color: '#ccc' },
  addRow: {
    borderWidth: 1,
    borderColor: '#888',
    borderTopWidth: 0,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  addText: { color: '#3b82f6', fontSize: 12, fontWeight: '600' },
  footerRow: { marginTop: 6, gap: 4 },
  techBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C_BLUE_F,
    borderWidth: 2,
    borderColor: '#888',
    padding: 6,
  },
  techLbl: { fontSize: 11, fontWeight: '700', marginRight: 4 },
  techInput: { flex: 1, fontSize: 11, color: '#111' },
  rempliBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
  },
})
