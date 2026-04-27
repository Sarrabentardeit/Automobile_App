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

const ROWS = 12

export default function SuiviForm({ data, setData, readOnly = false, numero }: Props) {
  const set = <K extends keyof VehiculeSuiviInput>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setData(prev => ({ ...prev, [k]: e.target.value }))

  const travEff   = (data.travauxEffectues  ?? '').split('\n')
  const travProch = (data.travauxProchains  ?? '').split('\n')
  const produits  = (data.produitsUtilises  ?? '').split('\n')
  const maxRows   = Math.max(ROWS, travEff.length, travProch.length, produits.length)

  const setLine = (field: 'travauxEffectues' | 'travauxProchains' | 'produitsUtilises', lines: string[], i: number, val: string) => {
    const copy = [...lines]
    while (copy.length <= i) copy.push('')
    copy[i] = val
    setData(prev => ({ ...prev, [field]: copy.join('\n') }))
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
          <col style={{ width: '41%' }} />
          <col style={{ width: '36%' }} />
          <col style={{ width: '23%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle()}>TRAVAUX EFFECTUÉES</th>
            <th style={thStyle()}>TRAVAUX PROCHAINS</th>
            <th style={thStyle()}>PRODUITS UTILISÉS</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }, (_, i) => (
            <tr key={i}>
              <td style={tdData}>
                {readOnly ? (travEff[i] ?? '') : (
                  <input type="text" style={input} value={travEff[i] ?? ''}
                    onChange={e => setLine('travauxEffectues', travEff, i, e.target.value)} />
                )}
              </td>
              <td style={tdData}>
                {readOnly ? (travProch[i] ?? '') : (
                  <input type="text" style={input} value={travProch[i] ?? ''}
                    onChange={e => setLine('travauxProchains', travProch, i, e.target.value)} />
                )}
              </td>
              <td style={tdData}>
                {readOnly ? (produits[i] ?? '') : (
                  <input type="text" style={input} value={produits[i] ?? ''}
                    onChange={e => setLine('produitsUtilises', produits, i, e.target.value)} />
                )}
              </td>
            </tr>
          ))}
          {/* ligne vide bonus pour saisie rapide */}
          {!readOnly && (
            <tr>
              <td style={{ ...tdData, cursor: 'pointer', background: '#fafafa' }}
                  onClick={() => setData(p => ({ ...p, travauxEffectues: (p.travauxEffectues ?? '') + '\n' }))}>
                <span style={{ color: '#bbb', fontSize: 10 }}>+ ligne</span>
              </td>
              <td style={{ ...tdData, cursor: 'pointer', background: '#fafafa' }}
                  onClick={() => setData(p => ({ ...p, travauxProchains: (p.travauxProchains ?? '') + '\n' }))}>
                <span style={{ color: '#bbb', fontSize: 10 }}>+ ligne</span>
              </td>
              <td style={{ ...tdData, cursor: 'pointer', background: '#fafafa' }}
                  onClick={() => setData(p => ({ ...p, produitsUtilises: (p.produitsUtilises ?? '') + '\n' }))}>
                <span style={{ color: '#bbb', fontSize: 10 }}>+ ligne</span>
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
