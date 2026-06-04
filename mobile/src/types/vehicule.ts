export type EtatVehicule =
  | 'orange'
  | 'mauve'
  | 'attente_client'
  | 'bleu'
  | 'rouge'
  | 'remise_cle'
  | 'vert'
  | 'retour'

export type VehiculeType = 'voiture' | 'moto'

export interface Vehicule {
  id: number
  immatriculation: string
  modele: string
  type: VehiculeType
  etat_actuel: EtatVehicule
  service_type?: string
  technicien_id: number | null
  responsable_id: number | null
  technicien_ids?: number[]
  responsable_ids?: number[]
  defaut: string
  client_telephone: string
  date_entree: string
  date_sortie: string | null
  notes: string
  derniere_mise_a_jour: string
  avance_client?: number
}

export interface VehiculeDepenseLigne {
  id: number
  vehicule_id: number
  libelle: string
  montant: number
  created_at: string
  product_id?: number | null
  quantite?: number | null
  cout_stock_sortie?: number | null
}

export interface VehiculeFicheFinanciere {
  avance_client: number
  lignes: VehiculeDepenseLigne[]
  total: number
  reste: number
}

export interface HistoriqueEtat {
  id: number
  vehicule_id: number
  etat_precedent: string | null
  etat_nouveau: EtatVehicule
  date_changement: string
  utilisateur_id: number
  utilisateur_nom: string
  commentaire: string
  duree_etat_precedent_minutes: number | null
  pieces_utilisees: string
}

export interface OrdreReparation {
  id: number
  vehiculeId: number
  numero: string
  clientNom: string
  clientTelephone: string
  voiture: string
  immatriculation: string
  kilometrage: number | null
  dateEntree: string
  technicien: string
  vin: string
  rempliPar: string
  carrosserieJson?: Record<string, string> | null
  voyantsJson?: Record<string, string> | null
  complementJson?: Record<string, unknown> | null
  lignes: Array<{ id: number; description: string; statut: string; ordre: number }>
}

export interface VehiculeSuivi {
  id: number
  vehiculeId: number
  numero: string
  date: string
  voiture: string
  matricule: string
  kilometrage: string
  travauxEffectues: string
  travauxProchains: string
  produitsUtilises: string
  technicien: string
  rempliPar: string
}

export interface VehiculeImage {
  id: number
  vehicule_id: number
  url_path: string
  original_name: string
  category?: VehiculeImageCategory
  note: string
  created_at: string
}

export const ETAT_CONFIG: Record<
  EtatVehicule,
  { label: string; description: string; color: string }
> = {
  orange: { label: 'EN COURS', description: 'Réparation en cours', color: '#f97316' },
  mauve: { label: 'ATT PIÈCES', description: 'En attente pièce', color: '#a855f7' },
  attente_client: { label: 'ATT CLIENT', description: 'En attente client', color: '#ca8a04' },
  bleu: { label: 'TEST', description: 'Test / essai', color: '#06b6d4' },
  rouge: { label: 'À RÉSOUDRE', description: 'Problème technique', color: '#ef4444' },
  remise_cle: { label: 'REMISE CLÉ', description: 'Prêt remise clés', color: '#14b8a6' },
  vert: { label: 'VALIDÉ', description: 'Validé', color: '#22c55e' },
  retour: { label: 'RETOUR', description: 'Retour client', color: '#0f172a' },
}

export type ServiceType =
  | 'diagnostic'
  | 'diagnostic_approfondi'
  | 'service_rapide'
  | 'reprogrammation'
  | 'mecanique'
  | 'autre'

export type VehiculeImageCategory =
  | 'etat_exterieur'
  | 'etat_interieur'
  | 'compteur'
  | 'plaque'
  | 'dommage'
  | 'intervention'

export interface VehiculeFormData {
  immatriculation: string
  modele: string
  type: VehiculeType
  etat_initial: EtatVehicule
  date_entree: string
  defaut: string
  technicien_id: number | null
  responsable_id: number | null
  technicien_ids: number[]
  responsable_ids: number[]
  client_telephone: string
  notes: string
  service_type?: ServiceType
}

export type VehiculeImageUploadInput = {
  dataUrl: string
  fileName: string
  category: VehiculeImageCategory
  note: string
}

export type VehiculeSuiviInput = {
  date?: string
  voiture?: string
  matricule?: string
  kilometrage?: string
  travauxEffectues?: string
  travauxProchains?: string
  produitsUtilises?: string
  technicien?: string
  rempliPar?: string
}

export type OrdreLigneStatut = 'en_attente' | 'fait' | 'na'

export type OrdreReparationInput = {
  clientNom?: string
  clientTelephone?: string
  voiture?: string
  immatriculation?: string
  kilometrage?: number | null
  dateEntree?: string
  technicien?: string
  vin?: string
  carrosserieJson?: Record<string, string>
  voyantsJson?: Record<string, string>
  complementJson?: Record<string, unknown> | null
  rempliPar?: string
  lignes?: Array<{ description: string; statut?: OrdreLigneStatut; ordre?: number }>
}

export const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'diagnostic_approfondi', label: 'Diagnostic approfondi' },
  { value: 'service_rapide', label: 'Service rapide' },
  { value: 'reprogrammation', label: 'Reprogrammation' },
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'autre', label: 'Autre' },
]

export const IMAGE_CATEGORIES: { value: VehiculeImageCategory; label: string }[] = [
  { value: 'etat_exterieur', label: 'État extérieur' },
  { value: 'etat_interieur', label: 'État intérieur' },
  { value: 'compteur', label: 'Compteur / KM' },
  { value: 'plaque', label: 'Plaque / châssis' },
  { value: 'dommage', label: 'Dommage constaté' },
  { value: 'intervention', label: 'Intervention / pièce' },
]

export const ETATS_ENTREE: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'vert',
  'retour',
]

export const TRANSITIONS_AUTORISEES: Record<EtatVehicule, EtatVehicule[]> = {
  orange: ['bleu', 'mauve', 'attente_client', 'rouge', 'remise_cle', 'retour'],
  mauve: ['orange', 'attente_client'],
  attente_client: ['orange', 'mauve', 'bleu', 'rouge', 'remise_cle', 'vert'],
  bleu: ['remise_cle', 'orange', 'attente_client'],
  rouge: ['orange', 'mauve', 'attente_client'],
  remise_cle: ['vert', 'orange', 'attente_client'],
  vert: ['retour'],
  retour: ['orange', 'mauve', 'attente_client', 'bleu', 'rouge', 'remise_cle', 'vert'],
}
