/**
 * Réplique exacte de la feuille Excel « Ordre de réparation »
 * – Même structure de tableau, même ordre des champs, mêmes icônes voyants
 */
import React, { type Dispatch, type SetStateAction } from 'react'
import type { OrdreReparationLigneStatut, OrdreReparationComplement, VoyantEtat } from '@/types'
import { CarTopViewSvg, GARAGE_NAME_ORDRE } from '@/components/vehicules/ordreReparationTemplate'

export const ORDRE_EXCEL_TRAVAUX_DEMANDEES = 'TRAVAUX DEMANDEES'
export const ORDRE_EXCEL_QUANTITE = 'QUANTITE'
export const ORDRE_EXCEL_PRODUITS_PIECES = 'PRODUITS / PIECES'
export const ORDRE_EXCEL_TRAVAUX_PROCHAINS = 'TRAVAUX PROCHAINS'

const LIGNE_STATUT_OPTIONS: { value: OrdreReparationLigneStatut; label: string }[] = [
  { value: 'en_attente', label: 'À faire' },
  { value: 'fait', label: 'Fait' },
  { value: 'na', label: 'N/A' },
]

export type ExcelComplementForm = {
  travauxProchains: string
  pieces: { quantite: string; produit: string }[]
  prix: string
  technicienMention: string
  signatureControle: string
  note: string
}

export type ExcelFormState = {
  clientNom: string
  clientTelephone: string
  voiture: string
  immatriculation: string
  kilometrage: string
  dateEntree: string
  technicien: string
  vin: string
  rempliPar: string
  carrosserie: { avG: string; avD: string; arG: string; arD: string; toit: string }
  voyants: Record<string, VoyantEtat>
  lignes: { description: string; statut: OrdreReparationLigneStatut; ordre: number }[]
  complement: ExcelComplementForm
}

export function complementFormToJson(c: ExcelComplementForm): OrdreReparationComplement | null {
  const pieces = c.pieces
    .map(p => ({ quantite: p.quantite.trim(), produit: p.produit.trim() }))
    .filter(p => p.quantite || p.produit)
  const out: OrdreReparationComplement = {}
  if (c.travauxProchains.trim()) out.travauxProchains = c.travauxProchains.trim()
  if (pieces.length) out.pieces = pieces
  if (c.prix.trim()) out.prix = c.prix.trim()
  if (c.technicienMention.trim()) out.technicienMention = c.technicienMention.trim()
  if (c.signatureControle.trim()) out.signatureControle = c.signatureControle.trim()
  if (c.note.trim()) out.note = c.note.trim()
  return Object.keys(out).length ? out : null
}

export function defaultComplementForm(): ExcelComplementForm {
  return {
    travauxProchains: '',
    pieces: Array.from({ length: 10 }, () => ({ quantite: '', produit: '' })),
    prix: '',
    technicienMention: '',
    signatureControle: '',
    note: '',
  }
}

export function complementFromOrdreJson(raw: OrdreReparationComplement | null | undefined): ExcelComplementForm {
  const d = raw ?? {}
  const pieceRows: { quantite: string; produit: string }[] = []
  if (Array.isArray(d.pieces)) {
    for (const p of d.pieces) {
      pieceRows.push({
        quantite: p?.quantite != null ? String(p.quantite) : '',
        produit: p?.produit != null ? String(p.produit) : '',
      })
    }
  }
  while (pieceRows.length < 10) pieceRows.push({ quantite: '', produit: '' })
  return {
    travauxProchains: d.travauxProchains != null ? String(d.travauxProchains) : '',
    pieces: pieceRows,
    prix: d.prix != null ? String(d.prix) : '',
    technicienMention: d.technicienMention != null ? String(d.technicienMention) : '',
    signatureControle: d.signatureControle != null ? String(d.signatureControle) : '',
    note: d.note != null ? String(d.note) : '',
  }
}

/* ── Icônes voyants — images PNG exactes extraites du fichier Excel ── */
// Ordre identique à l'Excel : 4 lignes × 2 colonnes (gauche, droite)
const VOYANT_ICON_DEFS: { key: string; label: string; src: string }[] = [
  { key: 'moteur',      label: 'Moteur / diagnostic', src: '/voyant-moteur.png' },
  { key: 'airbag',      label: 'Airbag',               src: '/voyant-airbag.png' },
  { key: 'abs',         label: 'ABS',                  src: '/voyant-abs.png' },
  { key: 'carburant',   label: 'Carburant',             src: '/voyant-carburant.png' },
  { key: 'prechauffage',label: 'Préchauffage',          src: '/voyant-prechauffage.png' },
  { key: 'pression',    label: 'Pression pneu',         src: '/voyant-pression.png' },
  { key: 'batterie',    label: 'Batterie',              src: '/voyant-batterie.png' },
  { key: 'huile',       label: 'Huile',                 src: '/voyant-huile.png' },
]

/* ── Constantes de style ── */
const BDR = 'border border-black'
const LABEL_CELL = `${BDR} bg-[#e8e8e8] font-bold text-[7.5pt] uppercase text-black px-1 py-0.5 whitespace-nowrap`
const VAL_CELL = `${BDR} px-1 py-0 text-[8.5pt] text-black`
const INPUT = `w-full border-0 bg-transparent text-[8.5pt] text-black outline-none focus:ring-0 px-0 py-0.5 font-sans`
const TH = `${BDR} bg-[#d9d9d9] font-bold text-[7.5pt] uppercase text-center px-1 py-0.5`
const TD = `${BDR} px-1 py-0 text-[8.5pt]`

const TRAVAUX_TOTAL = 20  // rows 10-29 in Excel
const PIECES_TOTAL = 10

type Props = {
  form: ExcelFormState
  setForm: Dispatch<SetStateAction<ExcelFormState | null>>
  canEdit: boolean
  onAddLigne: () => void
  onAddPiece: () => void
}

export default function OrdreReparationExcelForm({ form, setForm, canEdit, onAddLigne, onAddPiece }: Props) {
  const travauxPad = Math.max(0, TRAVAUX_TOTAL - form.lignes.length)
  const pieceSlots: { quantite: string; produit: string }[] = [...form.complement.pieces]
  while (pieceSlots.length < PIECES_TOTAL) pieceSlots.push({ quantite: '', produit: '' })

  const setV = (field: keyof ExcelFormState, value: string) =>
    setForm(f => f && { ...f, [field]: value })

  const setComp = (field: keyof ExcelComplementForm, value: string) =>
    setForm(f => f && { ...f, complement: { ...f.complement, [field]: value } })

  return (
    <div
      className="bg-white text-black font-sans"
      style={{ fontSize: '8.5pt', border: '1.5px solid #000', lineHeight: 1.3 }}
    >
      {/* ══ LIGNE 1 : Titre ═════════════════════════════════════════════════ */}
      <div style={{ padding: '4px 6px 0 6px' }}>
        <div style={{ fontSize: '15pt', fontWeight: 900, letterSpacing: '0.5px', lineHeight: 1.1 }}>
          ORDRE DE RÉPARATION
        </div>
        <div style={{ fontSize: '9pt', fontWeight: 700, marginBottom: 2 }}>{GARAGE_NAME_ORDRE}</div>
      </div>
      {/* ══ LIGNE 2 : REPAIRWORKORDER ═══════════════════════════════════════ */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '7pt',
          letterSpacing: '0.25em',
          border: '1px solid #000',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '2px 0',
          color: '#333',
          margin: '0 0 0 0',
        }}
      >
        R E P A I R W O R K O R D E R
      </div>

      {/* ══ LIGNES 4-7 : Champs véhicule / client ═══════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '32%' }} />
        </colgroup>
        <tbody>
          {/* NOM DU CLIENT | TÉLÉPHONE CLIENT */}
          <tr>
            <td className={LABEL_CELL}>NOM DU CLIENT</td>
            <td className={VAL_CELL}>
              <input className={INPUT} value={form.clientNom} disabled={!canEdit}
                onChange={e => setV('clientNom', e.target.value)} />
            </td>
            <td className={LABEL_CELL}>TÉLÉPHONE CLIENT</td>
            <td className={VAL_CELL}>
              <input className={INPUT} value={form.clientTelephone} disabled={!canEdit}
                onChange={e => setV('clientTelephone', e.target.value)} />
            </td>
          </tr>
          {/* VOITURE | IMMATRICULATION */}
          <tr>
            <td className={LABEL_CELL}>VOITURE</td>
            <td className={VAL_CELL}>
              <input className={INPUT} value={form.voiture} disabled={!canEdit}
                onChange={e => setV('voiture', e.target.value)} />
            </td>
            <td className={LABEL_CELL}>IMMATRICULATION</td>
            <td className={VAL_CELL}>
              <input className={`${INPUT} font-mono font-bold`} value={form.immatriculation} disabled={!canEdit}
                onChange={e => setV('immatriculation', e.target.value)} />
            </td>
          </tr>
          {/* KILOMETRAGE | TECHNICIEN */}
          <tr>
            <td className={LABEL_CELL}>KILOMETRAGE</td>
            <td className={VAL_CELL}>
              <input className={INPUT} type="number" min={0} value={form.kilometrage} disabled={!canEdit}
                onChange={e => setV('kilometrage', e.target.value)} />
            </td>
            <td className={LABEL_CELL}>TECHNICIEN</td>
            <td className={VAL_CELL}>
              <input className={INPUT} value={form.technicien} disabled={!canEdit}
                onChange={e => setV('technicien', e.target.value)} />
            </td>
          </tr>
          {/* DATE D'ENTRÉE | VIN NUMBER */}
          <tr>
            <td className={LABEL_CELL}>DATE D'ENTRÉE</td>
            <td className={VAL_CELL}>
              <input className={INPUT} type="date" value={form.dateEntree} disabled={!canEdit}
                onChange={e => setV('dateEntree', e.target.value)} />
            </td>
            <td className={LABEL_CELL}>VIN NUMBER</td>
            <td className={VAL_CELL}>
              <input className={`${INPUT} font-mono`} value={form.vin} disabled={!canEdit}
                onChange={e => setV('vin', e.target.value)} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ BLOC PRINCIPAL : 2 colonnes (gauche 52% / droite 48%) ══════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '52%' }} />
          <col style={{ width: '48%' }} />
        </colgroup>
        <tbody>
          <tr style={{ verticalAlign: 'top' }}>
            {/* ── COLONNE GAUCHE ── */}
            <td style={{ border: '1px solid #000', borderTop: 'none', padding: 0, verticalAlign: 'top' }}>

              {/* En-tête TRAVAUX DEMANDEES */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '78%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={TH} style={{ textAlign: 'center' }}>TRAVAUX DEMANDEES</th>
                    <th className={TH} style={{ textAlign: 'center' }}>STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {form.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className={TD}>
                        <input className={INPUT} value={l.description} disabled={!canEdit}
                          onChange={e => setForm(f => {
                            if (!f) return f
                            const lignes = [...f.lignes]
                            lignes[i] = { ...lignes[i], description: e.target.value }
                            return { ...f, lignes }
                          })} />
                      </td>
                      <td className={TD} style={{ textAlign: 'center', padding: 0 }}>
                        <select
                          style={{ width: '100%', border: 'none', background: '#f9f9f9', fontSize: '7.5pt', textAlign: 'center', padding: '1px 0' }}
                          value={l.statut} disabled={!canEdit}
                          onChange={e => setForm(f => {
                            if (!f) return f
                            const lignes = [...f.lignes]
                            lignes[i] = { ...lignes[i], statut: e.target.value as OrdreReparationLigneStatut }
                            return { ...f, lignes }
                          })}
                        >
                          {LIGNE_STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: travauxPad }).map((_, j) => (
                    <tr key={`pad-${j}`}>
                      <td className={TD} style={{ height: 16 }}>&nbsp;</td>
                      <td className={TD}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {canEdit && (
                <div style={{ borderTop: '1px solid #000', padding: '2px 4px' }}>
                  <button type="button" onClick={onAddLigne}
                    style={{ fontSize: '7pt', color: '#1a56db', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                    + Ligne
                  </button>
                </div>
              )}

              {/* QUANTITE / PRODUITS PIECES */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', borderTop: '1px solid #000' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '78%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={TH} style={{ textAlign: 'center' }}>QUANTITE</th>
                    <th className={TH} style={{ textAlign: 'center' }}>PRODUITS / PIECES</th>
                  </tr>
                </thead>
                <tbody>
                  {pieceSlots.map((p, i) => (
                    <tr key={i}>
                      <td className={TD} style={{ textAlign: 'center' }}>
                        <input className={INPUT} style={{ textAlign: 'center' }} value={p.quantite} disabled={!canEdit}
                          onChange={e => setForm(f => {
                            if (!f) return f
                            const pieces = [...f.complement.pieces]
                            while (pieces.length <= i) pieces.push({ quantite: '', produit: '' })
                            pieces[i] = { ...pieces[i]!, quantite: e.target.value }
                            return { ...f, complement: { ...f.complement, pieces } }
                          })} />
                      </td>
                      <td className={TD}>
                        <input className={INPUT} value={p.produit} disabled={!canEdit}
                          onChange={e => setForm(f => {
                            if (!f) return f
                            const pieces = [...f.complement.pieces]
                            while (pieces.length <= i) pieces.push({ quantite: '', produit: '' })
                            pieces[i] = { ...pieces[i]!, produit: e.target.value }
                            return { ...f, complement: { ...f.complement, pieces } }
                          })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {canEdit && (
                <div style={{ borderTop: '1px solid #000', padding: '2px 4px' }}>
                  <button type="button" onClick={onAddPiece}
                    style={{ fontSize: '7pt', color: '#1a56db', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                    + Ligne pièce
                  </button>
                </div>
              )}
            </td>

            {/* ── COLONNE DROITE ── */}
            <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: 0, verticalAlign: 'top' }}>

              {/* AV.G / AV.D */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', fontWeight: 700, padding: '2px 6px', borderBottom: '1px solid #000' }}>
                <span>AV. G</span><span>AV. D</span>
              </div>

              {/* Schéma voiture */}
              <div style={{ borderBottom: '1px solid #000', padding: '2px', textAlign: 'center', background: '#fff' }}>
                <CarTopViewSvg className="w-full max-h-[190px] object-contain" />
              </div>

              {/* Grille voyants — 4 lignes × 2 colonnes, icônes PNG identiques à l'Excel */}
              <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #000' }}>
                <tbody>
                  {[0, 2, 4, 6].map(idx => {
                    const left = VOYANT_ICON_DEFS[idx]
                    const right = VOYANT_ICON_DEFS[idx + 1]
                    return (
                      <tr key={idx}>
                        {([left, right] as typeof VOYANT_ICON_DEFS).filter(Boolean).map(def => (
                          <td key={def.key}
                            style={{ border: '1px solid #000', width: '50%', padding: '2px 4px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <img
                                src={def.src}
                                alt={def.label}
                                style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
                              />
                              <input
                                type="text"
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '8pt', padding: '1px 2px', outline: 'none', fontFamily: 'Arial, sans-serif' }}
                                value={form.voyants[def.key] ?? ''}
                                disabled={!canEdit}
                                onChange={e => setForm(f =>
                                  f ? { ...f, voyants: { ...f.voyants, [def.key]: e.target.value as VoyantEtat } } : f
                                )}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* TRAVAUX PROCHAINS */}
              <div style={{ background: '#e8e8e8', fontWeight: 700, fontSize: '8pt', textAlign: 'center', borderBottom: '1px solid #000', padding: '2px 4px' }}>
                TRAVAUX PROCHAINS
              </div>
              <textarea
                style={{ width: '100%', minHeight: 70, border: 'none', borderBottom: '1px solid #000', fontSize: '8.5pt', padding: '3px 5px', background: '#fff', resize: 'vertical', outline: 'none', fontFamily: 'Arial, sans-serif', display: 'block', boxSizing: 'border-box' }}
                value={form.complement.travauxProchains}
                disabled={!canEdit}
                onChange={e => setComp('travauxProchains', e.target.value)}
              />

              {/* PRIX / TECHNICIEN */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '30%', background: '#e8e8e8', fontWeight: 700, fontSize: '7.5pt', padding: '2px 5px', border: '1px solid #000', borderTop: 'none', borderLeft: 'none' }}>
                      PRIX :
                    </td>
                    <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: 0 }}>
                      <input className={INPUT} value={form.complement.prix} disabled={!canEdit}
                        onChange={e => setComp('prix', e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ background: '#e8e8e8', fontWeight: 700, fontSize: '7.5pt', padding: '2px 5px', border: '1px solid #000', borderTop: 'none', borderLeft: 'none' }}>
                      TECHNICIEN :
                    </td>
                    <td style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: 0 }}>
                      <input className={INPUT} value={form.complement.technicienMention} disabled={!canEdit}
                        onChange={e => setComp('technicienMention', e.target.value)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ══ SIGNATURE ════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', alignItems: 'stretch' }}>
        <div style={{ background: '#e8e8e8', fontWeight: 700, fontSize: '7.5pt', padding: '3px 6px', border: '1px solid #000', borderTop: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
          SIGNATURE CONTRÔLE QUALITÉ OU GÉRANT :
        </div>
        <div style={{ flex: 1, border: '1px solid #000', borderTop: 'none', borderLeft: 'none', minHeight: 28 }}>
          <input className={INPUT} value={form.complement.signatureControle} disabled={!canEdit}
            onChange={e => setComp('signatureControle', e.target.value)} />
        </div>
      </div>

      {/* ══ NOTE ═════════════════════════════════════════════════════════════ */}
      <div style={{ border: '1px solid #000', borderTop: 'none' }}>
        <div style={{ background: '#e8e8e8', fontWeight: 700, fontSize: '7.5pt', padding: '2px 6px', borderBottom: '1px solid #ccc' }}>
          NOTE :
        </div>
        <textarea
          style={{ width: '100%', minHeight: 56, border: 'none', fontSize: '8.5pt', padding: '3px 5px', background: '#fff', resize: 'vertical', outline: 'none', fontFamily: 'Arial, sans-serif', display: 'block', boxSizing: 'border-box' }}
          value={form.complement.note}
          disabled={!canEdit}
          onChange={e => setComp('note', e.target.value)}
        />
      </div>

      {/* ══ FICHE REMPLIE PAR ════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', borderTop: '1px solid #000', alignItems: 'center' }}>
        <div style={{ background: '#e8e8e8', fontWeight: 700, fontSize: '7.5pt', padding: '3px 6px', border: '1px solid #000', borderTop: 'none', whiteSpace: 'nowrap' }}>
          FICHE REMPLIE PAR
        </div>
        <div style={{ flex: 1, border: '1px solid #000', borderTop: 'none', borderLeft: 'none' }}>
          <input className={INPUT} value={form.rempliPar} disabled={!canEdit}
            onChange={e => setV('rempliPar', e.target.value)} />
        </div>
      </div>
    </div>
  )
}
