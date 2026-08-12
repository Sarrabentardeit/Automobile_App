import React, { type Dispatch, type SetStateAction } from 'react'
import type { VehiculeSuiviInput } from '../../types'

interface Props {
  data: VehiculeSuiviInput
  setData: Dispatch<SetStateAction<VehiculeSuiviInput>>
  readOnly?: boolean
  numero?: string
}

/* ── couleurs Excel ── */
const C_GREEN  = '#D7E4BD'  // titre + labels
const C_BLUE_H = '#B9CDE5'  // entêtes colonnes
const C_BLUE_F = '#C6D9F1'  // pied technicien

const BDR   = '1px solid #888'
const BDR_M = '2px solid #666'

const cellLbl = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C_GREEN, border: BDR, fontWeight: 700, fontSize: 11,
  padding: '4px 8px', whiteSpace: 'nowrap', ...extra,
})
const cellVal = (extra?: React.CSSProperties): React.CSSProperties => ({
  border: BDR, padding: '4px 6px', fontSize: 11, ...extra,
})
const input: React.CSSProperties = {
  width: '100%', border: 'none', outline: 'none',
  background: 'transparent', fontSize: 11, fontFamily: 'inherit',
}
const thStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: C_BLUE_H, border: BDR, fontWeight: 700, fontSize: 11,
  padding: '5px 8px', textAlign: 'center', ...extra,
})
const tdData: React.CSSProperties = {
  border: BDR, padding: '2px 6px', fontSize: 11,
  height: 22, verticalAlign: 'middle',
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

export default function SuiviForm({ data, setData, readOnly = false, numero }: Props) {
  const set = <K extends keyof VehiculeSuiviInput>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setData(prev => ({ ...prev, [k]: e.target.value }))

  const travEff   = linesOf(data.travauxEffectues)
  const travProch = linesOf(data.travauxProchains)
  const produits  = linesOf(data.produitsUtilises)
  const rowCount  = Math.max(1, travEff.length, travProch.length, produits.length)

  const eff   = padTo(travEff, rowCount)
  const proch = padTo(travProch, rowCount)
  const prod  = padTo(produits, rowCount)

  const setLine = (field: LineField, lines: string[], i: number, val: string) => {
    const copy = padTo(lines, rowCount)
    copy[i] = val
    setData(prev => ({ ...prev, [field]: copy.join('\n') }))
  }

  const addRow = () => {
    setData(prev => ({
      ...prev,
      travauxEffectues: padTo(linesOf(prev.travauxEffectues), rowCount).concat('').join('\n'),
      travauxProchains: padTo(linesOf(prev.travauxProchains), rowCount).concat('').join('\n'),
      produitsUtilises: padTo(linesOf(prev.produitsUtilises), rowCount).concat('').join('\n'),
    }))
  }

  const removeRow = (i: number) => {
    if (rowCount <= 1) return
    const next = (lines: string[]) => {
      const copy = padTo(lines, rowCount)
      copy.splice(i, 1)
      return (copy.length ? copy : ['']).join('\n')
    }
    setData(prev => ({
      ...prev,
      travauxEffectues: next(linesOf(prev.travauxEffectues)),
      travauxProchains: next(linesOf(prev.travauxProchains)),
      produitsUtilises: next(linesOf(prev.produitsUtilises)),
    }))
  }

  return (
    <div style={{ fontFamily: '"Calibri", Arial, sans-serif', background: '#fff', color: '#111',
                  padding: '16px 20px', maxWidth: 860, margin: '0 auto' }}>

      {/* ── TITRE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ textAlign: 'center', fontSize: 32, fontWeight: 400, letterSpacing: 2,
                         background: C_GREEN, border: BDR, padding: '8px 0 4px' }}>
              SUIVI
            </td>
          </tr>
          {numero && (
            <tr>
              <td style={{ textAlign: 'center', fontSize: 10, color: '#555', padding: '2px 0' }}>
                {numero}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── INFOS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '13%' }} />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td style={cellLbl()}>Date :</td>
            <td style={cellVal()}>
              <input type="date" style={input} value={data.date ?? ''} onChange={set('date')} readOnly={readOnly} />
            </td>
            <td style={cellLbl()}>Voiture :</td>
            <td style={cellVal()}>
              <input type="text" style={input} value={data.voiture ?? ''} onChange={set('voiture')} readOnly={readOnly} placeholder="Marque / Modèle" />
            </td>
          </tr>
          <tr>
            <td style={cellLbl()}>Kilométrage :</td>
            <td style={cellVal()}>
              <input type="text" style={input} value={data.kilometrage ?? ''} onChange={set('kilometrage')} readOnly={readOnly} />
            </td>
            <td style={cellLbl()}>Matricule :</td>
            <td style={cellVal()}>
              <input type="text" style={input} value={data.matricule ?? ''} onChange={set('matricule')} readOnly={readOnly} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 3 COLONNES ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 4 }}>
        <colgroup>
          <col style={{ width: readOnly ? '41%' : '39%' }} />
          <col style={{ width: readOnly ? '36%' : '34%' }} />
          <col style={{ width: readOnly ? '23%' : '21%' }} />
          {!readOnly && <col style={{ width: '6%' }} />}
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle()}>TRAVAUX EFFECTUÉES</th>
            <th style={thStyle()}>TRAVAUX PROCHAINS</th>
            <th style={thStyle()}>PRODUITS UTILISÉS</th>
            {!readOnly && <th style={thStyle({ padding: '5px 2px', fontSize: 10 })}></th>}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, i) => (
            <tr key={i}>
              <td style={tdData}>
                {readOnly ? (eff[i] ?? '') : (
                  <input type="text" style={input} value={eff[i] ?? ''}
                    onChange={e => setLine('travauxEffectues', eff, i, e.target.value)} />
                )}
              </td>
              <td style={tdData}>
                {readOnly ? (proch[i] ?? '') : (
                  <input type="text" style={input} value={proch[i] ?? ''}
                    onChange={e => setLine('travauxProchains', proch, i, e.target.value)} />
                )}
              </td>
              <td style={tdData}>
                {readOnly ? (prod[i] ?? '') : (
                  <input type="text" style={input} value={prod[i] ?? ''}
                    onChange={e => setLine('produitsUtilises', prod, i, e.target.value)} />
                )}
              </td>
              {!readOnly && (
                <td style={{ ...tdData, textAlign: 'center', padding: 0 }}>
                  <button
                    type="button"
                    title={rowCount <= 1 ? 'Au moins une ligne requise' : 'Supprimer la ligne'}
                    disabled={rowCount <= 1}
                    onClick={() => removeRow(i)}
                    style={{
                      border: 'none', background: 'transparent', cursor: rowCount <= 1 ? 'not-allowed' : 'pointer',
                      color: rowCount <= 1 ? '#ccc' : '#c0392b', fontSize: 14, lineHeight: 1, padding: '4px 6px',
                      opacity: rowCount <= 1 ? 0.4 : 1,
                    }}
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!readOnly && (
            <tr>
              <td
                colSpan={4}
                style={{ ...tdData, cursor: 'pointer', background: '#fafafa', textAlign: 'center', height: 28 }}
                onClick={addRow}
              >
                <span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 600 }}>+ Ajouter une ligne</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── PIED ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ background: C_BLUE_F, border: BDR_M, fontSize: 14, padding: '6px 12px', width: '55%' }}>
              TECHNICIEN :&nbsp;&nbsp;
              {readOnly ? (data.technicien ?? '') : (
                <input type="text" style={{ ...input, fontSize: 14, display: 'inline', width: 'auto', minWidth: 160 }}
                  value={data.technicien ?? ''} onChange={set('technicien')} />
              )}
            </td>
            <td style={cellLbl({ width: '22%' })}>Fiche remplie par :</td>
            <td style={cellVal()}>
              {readOnly ? (data.rempliPar ?? '') : (
                <input type="text" style={input} value={data.rempliPar ?? ''} onChange={set('rempliPar')} />
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
