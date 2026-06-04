export type HuileType =
  | 'moteur'
  | 'boite'
  | 'liquide_refroidissement'
  | 'liquide_rincage'
  | 'hydraulique'
  | 'autre'

export type ProduitStock = {
  id: number
  nom: string
  quantite: number
  valeurAchatTTC: number
  dernierPrixUnitaireTTC?: number
  prixAchatUnitaire?: number
  margeVentePct?: number
  prixVente?: number
  categorie?: string
  reference?: string
  unite?: string
  seuilAlerte?: number
  fluideType?: string | null
}

export type ProduitStockInput = Omit<ProduitStock, 'id' | 'dernierPrixUnitaireTTC'>

export type ProduitFormState = {
  categorie: string
  nom: string
  reference: string
  quantite: number
  unite: string
  valeurAchatTTC: number
  prixVente?: number
  prixAchatUnitaire?: number
  margeVentePct?: number
  seuilAlerte?: number
  fluideType: HuileType
}

export const PRODUIT_CATEGORIES_PRESET = [
  'Huiles',
  'Liquides',
  'Pièces',
  'Consommables',
  'Filtres',
] as const

export const HUILE_TYPE_STYLES: Record<
  HuileType,
  { label: string; bg: string; text: string; border: string }
> = {
  moteur: { label: 'Huile moteur', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  boite: { label: 'Huile boîte', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  liquide_refroidissement: {
    label: 'Liquide de refroidissement',
    bg: '#ecfeff',
    text: '#155e75',
    border: '#a5f3fc',
  },
  liquide_rincage: { label: 'Liquide rinçage', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  hydraulique: { label: 'Hydraulique', bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  autre: { label: 'Autre', bg: '#f9fafb', text: '#374151', border: '#e5e7eb' },
}

export function isLegacyHuilesLiquidesCombinedLabel(c: string | undefined | null): boolean {
  if (!c?.trim()) return false
  const t = c.trim().toLowerCase()
  return t === 'huiles & liquides' || t === 'huiles et liquides'
}

export function isHuilesCategorieStock(c: string | undefined | null): boolean {
  if (!c?.trim()) return false
  const t = c.trim().toLowerCase()
  if (t === 'huiles' || t === 'liquides') return true
  return isLegacyHuilesLiquidesCombinedLabel(c)
}

export const FLUIDE_TYPES_HUILES: readonly HuileType[] = ['moteur', 'boite', 'hydraulique', 'autre']
export const FLUIDE_TYPES_LIQUIDES: readonly HuileType[] = [
  'liquide_refroidissement',
  'liquide_rincage',
  'autre',
]

export function fluideTypesForCategorieProduit(categorie: string | undefined | null): HuileType[] {
  const t = categorie?.trim().toLowerCase() ?? ''
  if (t === 'liquides') return [...FLUIDE_TYPES_LIQUIDES]
  if (t === 'huiles' || isLegacyHuilesLiquidesCombinedLabel(categorie)) return [...FLUIDE_TYPES_HUILES]
  return [...new Set<HuileType>([...FLUIDE_TYPES_HUILES, ...FLUIDE_TYPES_LIQUIDES])]
}

export function normalizeFluideTypeForCategorie(
  categorie: string | undefined | null,
  fluideType: string | undefined | null
): HuileType {
  const allowed = fluideTypesForCategorieProduit(categorie)
  if (fluideType && allowed.includes(fluideType as HuileType)) return fluideType as HuileType
  return allowed[0] ?? 'moteur'
}

export function calcPrixVenteDepuisMarge(prixAchat: number, margePct: number): number {
  const pa = Math.max(0, prixAchat)
  const m = Math.max(0, margePct)
  return Math.round(pa * (1 + m / 100) * 100) / 100
}

export function isProduitAlert(p: ProduitStock): boolean {
  const s = p.seuilAlerte
  if (s != null && p.quantite < s) return true
  return false
}

export function emptyProduitForm(): ProduitFormState {
  return {
    categorie: 'Pièces',
    nom: '',
    reference: '',
    quantite: 0,
    unite: 'unité',
    valeurAchatTTC: 0,
    prixVente: undefined,
    prixAchatUnitaire: undefined,
    margeVentePct: undefined,
    seuilAlerte: undefined,
    fluideType: 'moteur',
  }
}

export function produitToForm(p: ProduitStock): ProduitFormState {
  const huile = isHuilesCategorieStock(p.categorie) || !!p.fluideType
  const qte = p.quantite ?? 0
  const val = p.valeurAchatTTC ?? 0
  let prixV = p.prixVente
  if (huile && qte > 0 && (prixV == null || Number.isNaN(prixV)) && val > 0) {
    prixV = Math.round((val / qte) * 100) / 100
  }
  let pa = p.prixAchatUnitaire
  if (!huile && pa == null && qte > 0 && val > 0) pa = val / qte
  let marge = p.margeVentePct
  if (
    marge == null &&
    pa != null &&
    pa > 0 &&
    p.prixVente != null &&
    p.prixVente > 0
  ) {
    marge = Math.round((p.prixVente / pa - 1) * 10000) / 100
  }
  return {
    categorie: p.categorie?.trim() || 'Pièces',
    nom: p.nom,
    reference: p.reference ?? '',
    quantite: qte,
    unite: p.unite ?? 'unité',
    valeurAchatTTC: val,
    prixVente: prixV,
    prixAchatUnitaire: pa,
    margeVentePct: marge,
    seuilAlerte: p.seuilAlerte,
    fluideType: normalizeFluideTypeForCategorie(p.categorie, p.fluideType),
  }
}

export function buildProduitPayload(form: ProduitFormState): ProduitStockInput {
  const qte = Math.max(0, form.quantite)
  const huile = isHuilesCategorieStock(form.categorie)
  let valeurAchatTTC = Math.max(0, form.valeurAchatTTC)
  let prixVenteOut = form.prixVente
  let prixAchatOut: number | undefined
  let margeOut: number | undefined

  const pa = form.prixAchatUnitaire ?? 0
  const m = form.margeVentePct ?? 0
  if (pa > 0) {
    prixAchatOut = pa
    margeOut = m
    prixVenteOut = calcPrixVenteDepuisMarge(pa, m)
    valeurAchatTTC = qte > 0 ? Math.round(pa * qte * 100) / 100 : 0
  } else {
    prixAchatOut = undefined
    margeOut = undefined
    if (huile) {
      const pu = form.prixVente ?? 0
      valeurAchatTTC = Math.round(pu * qte * 100) / 100
    }
  }

  return {
    nom: form.nom.trim(),
    categorie: form.categorie.trim() || undefined,
    quantite: qte,
    valeurAchatTTC,
    prixVente: prixVenteOut,
    prixAchatUnitaire: prixAchatOut,
    margeVentePct: margeOut,
    reference: form.reference.trim(),
    unite: form.unite.trim() || 'unité',
    seuilAlerte: form.seuilAlerte,
    fluideType: huile ? form.fluideType : null,
  }
}

export function mergeFilterCategories(categoriesFromData: string[]): string[] {
  const merged = new Set<string>([...PRODUIT_CATEGORIES_PRESET, ...categoriesFromData])
  const filtered = [...merged].filter((c) => !isLegacyHuilesLiquidesCombinedLabel(c))
  const presetSet = new Set<string>([...PRODUIT_CATEGORIES_PRESET])
  const presetInOrder = [...PRODUIT_CATEGORIES_PRESET].filter((p) => filtered.includes(p))
  const extras = filtered
    .filter((c) => !presetSet.has(c))
    .sort((a, b) => a.localeCompare(b, 'fr'))
  return [...presetInOrder, ...extras]
}

export function modalCategoryOptions(categoriesFromData: string[]): string[] {
  const merged = new Set<string>([...PRODUIT_CATEGORIES_PRESET, ...categoriesFromData])
  return [...merged]
    .filter((c) => !isLegacyHuilesLiquidesCombinedLabel(c) && c.trim().toLowerCase() !== 'autre')
    .sort((a, b) => a.localeCompare(b, 'fr'))
}

export function formatTnd(n: number, digits = 2): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}
