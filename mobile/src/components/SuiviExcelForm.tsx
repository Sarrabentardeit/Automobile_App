import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { VehiculeSuiviInput } from '../types/vehicule'

const C_GREEN = '#D7E4BD'
const C_BLUE_H = '#B9CDE5'
const C_BLUE_F = '#C6D9F1'
const ROWS = 12

type Props = {
  data: VehiculeSuiviInput
  onChange: (next: VehiculeSuiviInput) => void
  numero?: string
}

function setLine(
  field: 'travauxEffectues' | 'travauxProchains' | 'produitsUtilises',
  lines: string[],
  i: number,
  val: string,
  data: VehiculeSuiviInput,
  onChange: (next: VehiculeSuiviInput) => void
) {
  const copy = [...lines]
  while (copy.length <= i) copy.push('')
  copy[i] = val
  onChange({ ...data, [field]: copy.join('\n') })
}

export default function SuiviExcelForm({ data, onChange, numero }: Props) {
  const set = <K extends keyof VehiculeSuiviInput>(k: K, v: VehiculeSuiviInput[K]) =>
    onChange({ ...data, [k]: v })

  const travEff = (data.travauxEffectues ?? '').split('\n')
  const travProch = (data.travauxProchains ?? '').split('\n')
  const produits = (data.produitsUtilises ?? '').split('\n')
  const maxRows = Math.max(ROWS, travEff.length, travProch.length, produits.length)

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
          />
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Voiture :</Text>
          <TextInput
            style={styles.valInput}
            value={data.voiture ?? ''}
            onChangeText={(v) => set('voiture', v)}
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
          />
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.lbl}>Matricule :</Text>
          <TextInput
            style={styles.valInput}
            value={data.matricule ?? ''}
            onChangeText={(v) => set('matricule', v)}
          />
        </View>
      </View>

      <View style={styles.colHeader}>
        <Text style={[styles.th, { flex: 41 }]}>TRAVAUX EFFECTUÉES</Text>
        <Text style={[styles.th, { flex: 36 }]}>TRAVAUX PROCHAINS</Text>
        <Text style={[styles.th, { flex: 23 }]}>PRODUITS UTILISÉS</Text>
      </View>
      {Array.from({ length: maxRows }, (_, i) => (
        <View key={i} style={styles.dataRow}>
          <TextInput
            style={[styles.dataCell, { flex: 41 }]}
            value={travEff[i] ?? ''}
            onChangeText={(v) => setLine('travauxEffectues', travEff, i, v, data, onChange)}
          />
          <TextInput
            style={[styles.dataCell, { flex: 36 }]}
            value={travProch[i] ?? ''}
            onChangeText={(v) => setLine('travauxProchains', travProch, i, v, data, onChange)}
          />
          <TextInput
            style={[styles.dataCell, { flex: 23 }]}
            value={produits[i] ?? ''}
            onChangeText={(v) => setLine('produitsUtilises', produits, i, v, data, onChange)}
          />
        </View>
      ))}

      <View style={styles.footerRow}>
        <View style={styles.techBox}>
          <Text style={styles.techLbl}>TECHNICIEN :</Text>
          <TextInput
            style={styles.techInput}
            value={data.technicien ?? ''}
            onChangeText={(v) => set('technicien', v)}
          />
        </View>
        <View style={styles.rempliBox}>
          <Text style={styles.lbl}>Fiche remplie par :</Text>
          <TextInput
            style={styles.valInput}
            value={data.rempliPar ?? ''}
            onChangeText={(v) => set('rempliPar', v)}
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
  dataRow: { flexDirection: 'row' },
  dataCell: {
    borderWidth: 1,
    borderColor: '#888',
    fontSize: 11,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 28,
    color: '#111',
  },
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
