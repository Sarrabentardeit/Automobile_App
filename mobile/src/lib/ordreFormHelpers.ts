import { API_BASE } from './config'
import type { OrdreLigneStatut, OrdreReparation } from '../types/vehicule'

export const GARAGE_NAME_ORDRE = 'EL MECANO GARAGE'
export const TRAVAUX_TOTAL = 20
export const PIECES_TOTAL = 10

export const LIGNES_MODELE: string[] = [
  'VERIFICATION NIVEAU LIQUIDE REFROIDISSEMENT',
  "VERIFICATION NIVEAU D'HUILE MOTEUR",
  'VERIFICATION NIVEAU HUILE FREIN',
  'INSPECTION DISQUES ET PLAQUETTES DE FREIN',
  'INSPECTION PNEUS',
  'DIAGNOSTIC',
]

export type VoyantEtat = 'ok' | 'anomalie' | 'nc'

export type OrdreExcelFormState = {
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
  lignes: { description: string; statut: OrdreLigneStatut; ordre: number }[]
  complement: OrdreComplementForm
}

export function getWebAssetUrl(assetPath: string): string {
  const origin = API_BASE.replace(/\/api\/?$/, '')
  const p = assetPath.startsWith('/') ? assetPath : `/${assetPath}`
  return `${origin}${p}`
}

export function defaultOrdreForm(
  vehicule: { modele: string; immatriculation: string; date_entree: string; client_telephone: string },
  technicienDefaut: string,
  userName: string,
  clientNom = ''
): OrdreExcelFormState {
  return {
    clientNom,
    clientTelephone: vehicule.client_telephone ?? '',
    voiture: vehicule.modele,
    immatriculation: vehicule.immatriculation ?? '',
    kilometrage: '',
    dateEntree: vehicule.date_entree,
    technicien: technicienDefaut !== '—' ? technicienDefaut : '',
    vin: '',
    rempliPar: userName,
    carrosserie: defaultCarrosserie(),
    voyants: voyantsFromJson({}),
    lignes: LIGNES_MODELE.map((description, i) => ({
      description,
      statut: 'en_attente' as OrdreLigneStatut,
      ordre: i,
    })),
    complement: defaultComplement(),
  }
}

export function ordreToExcelForm(o: OrdreReparation): OrdreExcelFormState {
  return {
    clientNom: o.clientNom,
    clientTelephone: o.clientTelephone,
    voiture: o.voiture,
    immatriculation: o.immatriculation,
    kilometrage: o.kilometrage == null ? '' : String(o.kilometrage),
    dateEntree: o.dateEntree,
    technicien: o.technicien,
    vin: o.vin,
    rempliPar: o.rempliPar,
    carrosserie: carrosserieFromJson(o.carrosserieJson),
    voyants: voyantsFromJson(o.voyantsJson),
    lignes: o.lignes.map((l) => ({
      description: l.description,
      statut: (l.statut as OrdreLigneStatut) || 'en_attente',
      ordre: l.ordre,
    })),
    complement: complementFromJson(o.complementJson),
  }
}

export function excelFormToPayload(f: OrdreExcelFormState) {
  const km = f.kilometrage.trim() === '' ? null : Math.max(0, parseInt(f.kilometrage, 10) || 0)
  const voyantsJson: Record<string, string> = {}
  for (const k of VOYANT_KEYS) voyantsJson[k] = f.voyants[k] ?? 'nc'
  return {
    clientNom: f.clientNom,
    clientTelephone: f.clientTelephone,
    voiture: f.voiture,
    immatriculation: f.immatriculation,
    kilometrage: km,
    dateEntree: f.dateEntree,
    technicien: f.technicien,
    vin: f.vin,
    rempliPar: f.rempliPar,
    carrosserieJson: f.carrosserie,
    voyantsJson,
    complementJson: complementToJson(f.complement),
    lignes: f.lignes
      .filter((l) => l.description.trim())
      .map((l, i) => ({
        description: l.description.trim(),
        statut: l.statut,
        ordre: l.ordre ?? i,
      })),
  }
}

export type OrdreComplementForm = {
  travauxProchains: string
  pieces: { quantite: string; produit: string }[]
  prix: string
  technicienMention: string
  signatureControle: string
  note: string
}

export const VOYANT_KEYS = [
  'moteur',
  'airbag',
  'abs',
  'carburant',
  'prechauffage',
  'pression',
  'batterie',
  'huile',
] as const

export const VOYANT_LABELS: Record<string, string> = {
  moteur: 'Moteur',
  airbag: 'Airbag',
  abs: 'ABS',
  carburant: 'Carburant',
  prechauffage: 'Préchauffage',
  pression: 'Pression',
  batterie: 'Batterie',
  huile: 'Huile',
}

export function defaultComplement(): OrdreComplementForm {
  return {
    travauxProchains: '',
    pieces: Array.from({ length: 10 }, () => ({ quantite: '', produit: '' })),
    prix: '',
    technicienMention: '',
    signatureControle: '',
    note: '',
  }
}

export function complementFromJson(raw: unknown): OrdreComplementForm {
  const d = (raw ?? {}) as Record<string, unknown>
  const pieceRows: { quantite: string; produit: string }[] = []
  if (Array.isArray(d.pieces)) {
    for (const p of d.pieces as Array<{ quantite?: unknown; produit?: unknown }>) {
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

export function complementToJson(c: OrdreComplementForm): Record<string, unknown> | null {
  const pieces = c.pieces
    .map((p) => ({ quantite: p.quantite.trim(), produit: p.produit.trim() }))
    .filter((p) => p.quantite || p.produit)
  const out: Record<string, unknown> = {}
  if (c.travauxProchains.trim()) out.travauxProchains = c.travauxProchains.trim()
  if (pieces.length) out.pieces = pieces
  if (c.prix.trim()) out.prix = c.prix.trim()
  if (c.technicienMention.trim()) out.technicienMention = c.technicienMention.trim()
  if (c.signatureControle.trim()) out.signatureControle = c.signatureControle.trim()
  if (c.note.trim()) out.note = c.note.trim()
  return Object.keys(out).length ? out : null
}

export function defaultCarrosserie() {
  return { avG: '', avD: '', arG: '', arD: '', toit: '' }
}

export function carrosserieFromJson(raw: unknown) {
  const d = (raw ?? {}) as Record<string, string>
  return {
    avG: d.avG ?? '',
    avD: d.avD ?? '',
    arG: d.arG ?? '',
    arD: d.arD ?? '',
    toit: d.toit ?? '',
  }
}

export function voyantsFromJson(raw: unknown): Record<string, VoyantEtat> {
  const d = (raw ?? {}) as Record<string, string>
  const out: Record<string, VoyantEtat> = {}
  for (const k of VOYANT_KEYS) {
    const v = d[k]
    if (v === 'ok' || v === 'anomalie' || v === 'nc') out[k] = v
    else out[k] = 'nc'
  }
  return out
}

export function cycleVoyant(cur: VoyantEtat): VoyantEtat {
  if (cur === 'nc') return 'ok'
  if (cur === 'ok') return 'anomalie'
  return 'nc'
}

export const STATUT_LABELS: Record<OrdreLigneStatut, string> = {
  en_attente: 'À faire',
  fait: 'Fait',
  na: 'N/A',
}
