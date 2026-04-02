// ==================== ROLES ====================
export type Role = 'admin' | 'responsable' | 'technicien' | 'financier'

export const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: 'text-red-700', bg: 'bg-red-50' },
  responsable: { label: 'Responsable', color: 'text-blue-700', bg: 'bg-blue-50' },
  technicien: { label: 'Technicien', color: 'text-purple-700', bg: 'bg-purple-50' },
  financier: { label: 'Financier', color: 'text-emerald-700', bg: 'bg-emerald-50' },
}

export const ALL_ROLES: Role[] = ['admin', 'responsable', 'technicien', 'financier']

// ==================== PERMISSIONS ====================
export type VehiculeVisibility = 'all' | 'own' | 'none'

export interface Permissions {
  vehiculeVisibility: VehiculeVisibility
  canAddVehicule: boolean
  canEditVehicule: boolean
  canChangeEtat: boolean
  canAssignTechnicien: boolean
  canManageUsers: boolean
  canViewDashboard: boolean
  canViewFinance: boolean
  /** Stock général + huiles */
  canViewInventory: boolean
  /** Outils Mohamed / Ahmed */
  canViewEquipeOutils: boolean
}

export type TogglePermissionKey =
  | 'canAddVehicule'
  | 'canEditVehicule'
  | 'canChangeEtat'
  | 'canAssignTechnicien'
  | 'canManageUsers'
  | 'canViewDashboard'
  | 'canViewFinance'
  | 'canViewInventory'
  | 'canViewEquipeOutils'

export const TOGGLE_PERMISSION_LABELS: Record<TogglePermissionKey, { label: string; description: string; icon: string }> = {
  canViewDashboard: { label: 'Voir le dashboard', description: 'Accès au tableau de bord et statistiques', icon: '📊' },
  canAddVehicule: { label: 'Ajouter un véhicule', description: 'Créer de nouvelles fiches véhicule', icon: '➕' },
  canEditVehicule: { label: 'Modifier un véhicule', description: 'Modifier les informations des véhicules', icon: '✏️' },
  canChangeEtat: { label: 'Changer l\'état', description: 'Modifier l\'état d\'avancement des véhicules', icon: '🔄' },
  canAssignTechnicien: { label: 'Assigner technicien', description: 'Affecter un technicien à un véhicule', icon: '👤' },
  canManageUsers: { label: 'Gérer les utilisateurs', description: 'Créer, modifier et désactiver des comptes', icon: '🔑' },
  canViewFinance: { label: 'Accès finance', description: 'Consulter les données financières', icon: '💰' },
  canViewInventory: { label: 'Accès inventaire', description: 'Stock général et catalogue produits', icon: '📦' },
  canViewEquipeOutils: { label: 'Accès outils équipe', description: 'Outils Mohamed / Ahmed', icon: '🔧' },
}

export const ALL_TOGGLE_KEYS: TogglePermissionKey[] = [
  'canViewDashboard', 'canAddVehicule', 'canEditVehicule',
  'canChangeEtat', 'canAssignTechnicien', 'canManageUsers', 'canViewFinance',
  'canViewInventory', 'canViewEquipeOutils',
]

export const VISIBILITY_OPTIONS: { value: VehiculeVisibility; label: string; description: string; icon: string }[] = [
  { value: 'all', label: 'Tous les véhicules', description: 'Voir la liste complète des véhicules du garage', icon: '🏢' },
  { value: 'own', label: 'Ses véhicules seulement', description: 'Voir uniquement les véhicules qui lui sont assignés', icon: '👤' },
  { value: 'none', label: 'Aucun accès véhicules', description: 'Pas d\'accès à la liste des véhicules', icon: '🚫' },
]

export const ROLE_PRESETS: Record<Role, Permissions> = {
  admin: {
    vehiculeVisibility: 'all', canAddVehicule: true, canEditVehicule: true, canChangeEtat: true,
    canAssignTechnicien: true, canManageUsers: true, canViewDashboard: true, canViewFinance: true,
    canViewInventory: true, canViewEquipeOutils: true,
  },
  responsable: {
    vehiculeVisibility: 'all', canAddVehicule: true, canEditVehicule: true, canChangeEtat: true,
    canAssignTechnicien: true, canManageUsers: false, canViewDashboard: true, canViewFinance: true,
    canViewInventory: true, canViewEquipeOutils: true,
  },
  technicien: {
    vehiculeVisibility: 'own', canAddVehicule: false, canEditVehicule: false, canChangeEtat: true,
    canAssignTechnicien: false, canManageUsers: false, canViewDashboard: true, canViewFinance: false,
    canViewInventory: false, canViewEquipeOutils: false,
  },
  financier: {
    vehiculeVisibility: 'all', canAddVehicule: false, canEditVehicule: false, canChangeEtat: false,
    canAssignTechnicien: false, canManageUsers: false, canViewDashboard: true, canViewFinance: true,
    canViewInventory: true, canViewEquipeOutils: false,
  },
}

export const DEFAULT_PERMISSIONS: Permissions = { ...ROLE_PRESETS.technicien }

// ==================== USERS ====================
export interface User {
  id: number
  email: string
  nom_complet: string
  telephone: string
  role: Role
  permissions: Permissions
  statut: 'actif' | 'inactif'
  date_creation: string
  derniere_connexion: string | null
}

// ==================== ETATS / WORKFLOW ====================
export type EtatVehicule = 'orange' | 'mauve' | 'bleu' | 'rouge' | 'vert' | 'retour'
export type VehiculeType = 'voiture' | 'moto'

export interface EtatConfig {
  label: string
  description: string
  color: string
  bg: string
  bgLight: string
  border: string
}

export const ETAT_CONFIG: Record<EtatVehicule, EtatConfig> = {
  orange: {
    label: 'EN COURS',
    description: 'Réparation en cours',
    color: '#f97316',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-400',
  },
  mauve: {
    label: 'ATT PIÈCES',
    description: 'En attente d\'une pièce / tourneur',
    color: '#a855f7',
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    border: 'border-purple-400',
  },
  bleu: {
    label: 'TEST',
    description: 'Test driver / essai routier',
    color: '#06b6d4',
    bg: 'bg-cyan-500',
    bgLight: 'bg-cyan-50',
    border: 'border-cyan-400',
  },
  rouge: {
    label: 'PROBLÈME',
    description: 'Problème technique détecté',
    color: '#ef4444',
    bg: 'bg-red-500',
    bgLight: 'bg-red-50',
    border: 'border-red-400',
  },
  vert: {
    label: 'VALIDÉ',
    description: 'Prêt pour remise des clés',
    color: '#22c55e',
    bg: 'bg-green-500',
    bgLight: 'bg-green-50',
    border: 'border-green-400',
  },
  retour: {
    label: 'RETOUR',
    description: 'Retour client après livraison',
    color: '#0f172a',
    bg: 'bg-slate-800',
    bgLight: 'bg-slate-50',
    border: 'border-slate-400',
  },
}

export const TRANSITIONS_AUTORISEES: Record<EtatVehicule, EtatVehicule[]> = {
  orange: ['bleu', 'mauve', 'rouge', 'vert', 'retour'],
  mauve: ['orange'],
  bleu: ['vert', 'orange'],
  rouge: ['orange', 'mauve'],
  vert: ['retour'],
  retour: [],
}

// ==================== VEHICULES ====================
export interface Vehicule {
  id: number
  immatriculation: string
  modele: string
  type: VehiculeType
  etat_actuel: EtatVehicule
  service_type?: 'diagnostic' | 'diagnostic_approfondi' | 'service_rapide' | 'reprogrammation' | 'autre'
  technicien_id: number | null
  responsable_id: number | null
  defaut: string
  client_telephone: string
  date_entree: string
  date_sortie: string | null
  notes: string
  derniere_mise_a_jour: string
}

export type VehiculeImageCategory =
  | 'etat_exterieur'
  | 'etat_interieur'
  | 'compteur'
  | 'plaque'
  | 'dommage'
  | 'intervention'

export interface VehiculeImage {
  id: number
  vehicule_id: number
  url_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  category: VehiculeImageCategory
  note: string
  created_by_id: number | null
  created_by: string
  created_at: string
}

export interface VehiculeFormData {
  immatriculation: string
  modele: string
  type: VehiculeType
  etat_initial: EtatVehicule
  date_entree: string
  defaut: string
  technicien_id: number | null
  responsable_id: number | null
  client_telephone: string
  notes: string
  service_type?: 'diagnostic' | 'diagnostic_approfondi' | 'service_rapide' | 'reprogrammation' | 'autre'
}

export interface VehiculeImageUploadInput {
  dataUrl: string
  fileName: string
  category: VehiculeImageCategory
  note: string
}

// ==================== HISTORIQUE ====================
export interface HistoriqueEtat {
  id: number
  vehicule_id: number
  etat_precedent: EtatVehicule | null
  etat_nouveau: EtatVehicule
  date_changement: string
  utilisateur_id: number
  utilisateur_nom: string
  commentaire: string
  duree_etat_precedent_minutes: number | null
  pieces_utilisees: string
}

// ==================== CAISSE / TEAM MONEY TRACK ====================
/** Membre équipe : nom + numéro de téléphone (pour écran Équipe / Membres et Caisse) */
export interface TeamMember {
  name: string
  phone: string
}

/** Noms des membres de l'équipe (colonnés In Hand / Taken / Note dans l'Excel) — valeur par défaut, sans téléphone */
export const TEAM_MONEY_MEMBERS: string[] = [
  'Souhail', 'Khalil BK', 'ZAK', 'MEHER', 'YASSIN', 'MELEK', 'YASSER', 'AZIZ',
  'MELEK SID', 'BELGACEM', 'YOUSSEF', 'MOHAMED HADDAD', 'AHMED GHAZOUANI',
  'NAMROUD', 'MOHAMED RADHOUENE', 'MOHAMED MAHMOUDI', 'MED ALI', 'ADEM',
]

/** Code couleurs présence (CONGÉ, À TEMPS, ABSENT, etc.) */
export type PresenceStatut =
  | 'conges'
  | 'a_temps'
  | 'absent'
  | 'retard'
  | 'autorisation'
  | 'conges_maladie'
  | 'heures_sup'

export const PRESENCE_CONFIG: Record<PresenceStatut, { label: string; color: string; bg: string }> = {
  conges: { label: 'CONGÉ', color: '#0ea5e9', bg: 'bg-sky-100' },
  a_temps: { label: 'À TEMPS', color: '#22c55e', bg: 'bg-green-100' },
  absent: { label: 'ABSENT', color: '#ef4444', bg: 'bg-red-100' },
  retard: { label: 'RETARD', color: '#f97316', bg: 'bg-orange-100' },
  autorisation: { label: 'AUTORISATION', color: '#a855f7', bg: 'bg-purple-100' },
  conges_maladie: { label: 'CONGÉ DE MALADIE', color: '#ec4899', bg: 'bg-pink-100' },
  heures_sup: { label: 'HEURES SUPP.', color: '#06b6d4', bg: 'bg-cyan-100' },
}

export const ALL_PRESENCE_STATUTS: PresenceStatut[] = [
  'a_temps', 'retard', 'absent', 'conges', 'conges_maladie', 'autorisation', 'heures_sup',
]

/** Pour un membre et une date : en caisse (In Hand), pris (Taken), note, présence */
export interface TeamMemberSlots {
  inHand: number | null
  taken: number | null
  note: string
  presence: PresenceStatut | null
}

/** Une ligne "jour" du suivi Team Money : date + valeurs par membre */
export interface TeamMoneyDayEntry {
  id: number
  date: string // YYYY-MM-DD
  members: Record<string, TeamMemberSlots> // key = member name from TEAM_MONEY_MEMBERS
}

/** Mouvement caisse (section DATE / MONTANT / RABI3-YASSINE / NOTES de l'Excel) */
export interface MouvementCaisse {
  id: number
  date: string
  montant: number
  category: string // ex. RABI3, YASSINE, COMPTE, etc.
  notes: string
}

/** Catégories suggérées pour les mouvements (ex. Excel) */
export const MOUVEMENT_CATEGORIES = ['RABI3', 'YASSINE', 'COMPTE', 'CHOKRI', 'SALIHA', 'GARAGE', 'AUTRE'] as const

/** Charge mensuelle fixe (loyer, cnss, etc.) */
export interface ChargeMensuelle {
  id: number
  name: string
  amount: number
}

// ==================== FEUILLE MONEY (IN / OUT) ====================
/** Entrée (IN) : Date, Montant, Type espèce, Description, Moyen de paiement */
export interface MoneyIn {
  id: number
  date: string // YYYY-MM-DD
  amount: number
  type: string // PIECES, MECA, DIAG, etc.
  description: string
  paymentMethod?: string // ESPECE, CHEQUE, VIREMENT
}

/** Sortie (OUT) : Date, Montant, Catégorie, Description / Bénéficiaire, Nom (équipe) */
export interface MoneyOut {
  id: number
  date: string
  amount: number
  category: string // GARAGE, DEPENSE VOITURE, FOURNISSEUR, etc.
  description: string
  beneficiary?: string // nom (membre équipe ou autre)
  /** Référence pour sync Caisse (ex: "caisse:dayId:memberName") */
  sourceRef?: string
}

/** Catégories type ESPECE pour les entrées (IN) — comme la liste déroulante Excel */
export const MONEY_IN_TYPES = [
  'DIAG',
  'MECA',
  'PROG',
  'PIECES',
  'PRODUIT',
  'AVANCE',
  'pieces garage',
  'cours',
  'consultation',
  'TVA ET TIMBRE',
  'DIAG ACHAT',
  'YASSINE',
  'BENEFICE PIECES',
  'AUTRE',
] as const
export const MONEY_OUT_CATEGORIES = ['GARAGE', 'DEPENSE VOITURE', 'FOURNISSEUR', 'AUTRE'] as const
export const MONEY_PAYMENT_METHODS = ['ESPECE', 'CHEQUE', 'VIREMENT'] as const

// ==================== NOTIFICATIONS ====================
/** Notification reçue par un technicien (ex. assignation réclamation, véhicule, calendrier) */
export interface Notification {
  id: number
  userId: number
  message: string
  date: string
  read: boolean
  /** Type (ex. reclamation_assigned) - venu de l'API */
  type?: string
  /** ID réclamation si type reclamation_assigned - pour lien vers la page */
  reclamationId?: number
  title?: string
}

// ==================== CALENDRIER / AFFECTATIONS ====================
/** Affectation travail : qui (membre équipe) fait quoi (véhicule + description) à quelle date */
export interface CalendarAssignment {
  id: number
  date: string // YYYY-MM-DD
  memberName: string // nom du technicien / membre équipe
  vehicleId: number | null // lien vers Vehicule si connu
  vehicleLabel: string // modele ou immat ou "Véhicule client"
  description: string // travail à faire (ex. JOINT CULASSE, DIAG, 4 AMORTISSEURS)
  clientName?: string // nom client (enregistré automatiquement dans la page Clients)
  clientTelephone?: string
}

// ==================== RÉCLAMATIONS ====================
export type ReclamationStatut = 'ouverte' | 'en_cours' | 'traitee' | 'cloturee'

export interface Reclamation {
  id: number
  date: string // YYYY-MM-DD
  clientName: string
  clientTelephone?: string
  vehicleRef: string // immat ou modèle
  sujet: string
  description: string
  statut: ReclamationStatut
  assigneA?: string // nom du responsable
  priorite?: 'basse' | 'normale' | 'haute'
   /** Autres techniciens assignés (noms complets) */
  techniciens?: string[]
}

export const RECLAMATION_STATUTS: ReclamationStatut[] = ['ouverte', 'en_cours', 'traitee', 'cloturee']
export const RECLAMATION_STATUT_LABELS: Record<ReclamationStatut, string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  traitee: 'Traitée',
  cloturee: 'Clôturée',
}

// ==================== DEVIS / PRIX MAIN D'OEUVRE ====================
export type PrixMainOeuvreGroupe = 'transmission' | 'entretien' | 'train_av_ar' | 'autre'

export interface PrixMainOeuvreItem {
  id: number
  designation: string
  prixLux: string // ex. "300" ou "à partir de 80 et selon type"
  prixLegeres: string
  groupe: PrixMainOeuvreGroupe
}

export const PRIX_MAIN_OEUVRE_GROUPES: Record<PrixMainOeuvreGroupe, { label: string; color: string }> = {
  transmission: { label: 'Transmission', color: 'bg-amber-100 border-amber-200 text-amber-800' },
  entretien: { label: 'Entretien', color: 'bg-emerald-100 border-emerald-200 text-emerald-800' },
  train_av_ar: { label: 'Train av. / ar.', color: 'bg-pink-100 border-pink-200 text-pink-800' },
  autre: { label: 'Autre', color: 'bg-gray-100 border-gray-200 text-gray-700' },
}

// ==================== HUILE (STOCK) ====================
export type HuileType =
  | 'moteur'
  | 'boite'
  | 'liquide_refroidissement'
  | 'liquide_rincage'
  | 'hydraulique'
  | 'autre'

export interface HuileProduct {
  id: number
  designation: string
  reference: string
  type: HuileType
  quantite: number
  unite: string // L, bidon, unité
  seuilAlerte?: number // alerte si quantite < seuil
  prix?: number // prix unitaire (optionnel)
}

export const HUILE_TYPES: Record<HuileType, { label: string; color: string }> = {
  moteur: { label: 'Huile moteur', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  boite: { label: 'Huile boîte', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  liquide_refroidissement: { label: 'Liquide de refroidissement', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  liquide_rincage: { label: 'Liquide rinçage', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  hydraulique: { label: 'Hydraulique', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

// ==================== CLIENTS ====================
export interface Client {
  id: number
  nom: string
  telephone: string
  email?: string
  adresse?: string
  notes?: string
  matriculeFiscale?: string
}

// ==================== CLIENTS AVEC DETTES ====================
export interface ClientAvecDette {
  id: number
  clientName: string
  telephoneClient: string
  designation: string
  reste: number
  notes?: string
}

// ==================== CONTACTS IMPORTANTS (AUTRES) ====================
export interface ContactImportant {
  id: number
  nom: string
  numero: string
  categorie?: string // ex. Fournisseur, Assurance, Dépanneur
  notes?: string
}

// ==================== DEMANDES DEVIS ====================
export type DemandeDevisStatut = 'en_attente' | 'envoye' | 'accepte' | 'refuse'

export interface DemandeDevis {
  id: number
  date: string // YYYY-MM-DD
  clientName: string
  clientTelephone?: string
  vehicleRef: string
  description: string // travaux demandés
  statut: DemandeDevisStatut
  montantEstime?: number
  dateLimite?: string // YYYY-MM-DD
  notes?: string
}

export const DEMANDE_DEVIS_STATUTS: DemandeDevisStatut[] = ['en_attente', 'envoye', 'accepte', 'refuse']
export const DEMANDE_DEVIS_STATUT_LABELS: Record<DemandeDevisStatut, string> = {
  en_attente: 'En attente',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
}

// ==================== FOURNISSEURS ====================
export interface Fournisseur {
  id: number
  nom: string
  telephone: string
  email?: string
  adresse?: string
  contact?: string // personne de contact
  notes?: string
}

export interface FournisseurTopItem {
  fournisseurId: number
  nom: string
  total: number
}

export interface FournisseurFiche {
  fournisseur: Fournisseur
  totalCumule: number
  dernierAchat: { numero: string; date: string; total: number } | null
  historique: { id: number; numero: string; date: string; total: number }[]
  countAchats: number
}

// ==================== STOCK GÉNÉRAL (PRODUITS) ====================
export type MouvementProduitNeufUtilise = 'neuf' | 'occasion'
export type MouvementProduitStatut = 'fini' | 'en_cours'

export interface MouvementProduit {
  id: number
  date: string // YYYY-MM-DD
  produit: string
  vehicule: string
  technicien: string
  neufUtilise: MouvementProduitNeufUtilise
  statut: MouvementProduitStatut
  prix: number
  fournisseur: string
}

/** Catégories proposées à la création (catalogue / page Produits). — Huiles / Liquides : champs fluide dédiés. */
export const PRODUIT_CATEGORIES_PRESET = [
  'Huiles',
  'Liquides',
  'Pièces',
  'Consommables',
  'Filtres',
] as const

/** Ancien libellé combiné — ne plus proposer dans les listes déroulantes (données historiques possibles). */
export function isLegacyHuilesLiquidesCombinedLabel(c: string | undefined | null): boolean {
  if (!c?.trim()) return false
  const t = c.trim().toLowerCase()
  return t === 'huiles & liquides' || t === 'huiles et liquides'
}

/** Affiche les champs « fluide » (type, prix unitaire) pour cette catégorie. */
export function isHuilesCategorieStock(c: string | undefined | null): boolean {
  if (!c?.trim()) return false
  const t = c.trim().toLowerCase()
  if (t === 'huiles' || t === 'liquides') return true
  return isLegacyHuilesLiquidesCombinedLabel(c)
}

/** Types de fluide proposés pour la catégorie « Huiles » (et ancien libellé combiné). */
export const FLUIDE_TYPES_HUILES: readonly HuileType[] = ['moteur', 'boite', 'hydraulique', 'autre']

/** Types de fluide proposés pour la catégorie « Liquides ». */
export const FLUIDE_TYPES_LIQUIDES: readonly HuileType[] = [
  'liquide_refroidissement',
  'liquide_rincage',
  'autre',
]

/** Liste des clés `fluideType` selon la catégorie produit (formulaire catalogue). */
export function fluideTypesForCategorieProduit(categorie: string | undefined | null): HuileType[] {
  const t = categorie?.trim().toLowerCase() ?? ''
  if (t === 'liquides') return [...FLUIDE_TYPES_LIQUIDES]
  if (t === 'huiles' || isLegacyHuilesLiquidesCombinedLabel(categorie)) return [...FLUIDE_TYPES_HUILES]
  return [...new Set<HuileType>([...FLUIDE_TYPES_HUILES, ...FLUIDE_TYPES_LIQUIDES])]
}

/** Valeur stockée cohérente avec la catégorie (édition / affichage). */
export function normalizeFluideTypeForCategorie(
  categorie: string | undefined | null,
  fluideType: string | undefined | null
): HuileType {
  const allowed = fluideTypesForCategorieProduit(categorie)
  if (fluideType && allowed.includes(fluideType as HuileType)) return fluideType as HuileType
  return allowed[0] ?? 'moteur'
}

export interface ProduitStock {
  id: number
  nom: string
  quantite: number
  valeurAchatTTC: number
  prixVente?: number // prix de vente conseillé (HT ou TTC selon usage)
  categorie?: string // ex: Huiles, Pièces, Consommables
  reference?: string
  unite?: string
  seuilAlerte?: number
  /** Présent pour huiles / liquides (moteur, boîte, etc.) ; null côté API pour effacer */
  fluideType?: string | null
}

/** Mouvement simple entrée/sortie stock (achat ou facture) */
export interface MouvementStock {
  id: number
  date: string // YYYY-MM-DD
  productId: number
  produitNom: string
  quantite: number
  type: 'entree' | 'sortie'
  origine: 'achat' | 'facture'
  reference?: string // n° facture ou achat
}

// ==================== OUTILS MOHAMED ====================
/** Feuille MOHAMED OUTILS : Date, Voiture, Outillage, Prix Garage, Prix Mohamed (11%) */
export interface OutilMohamed {
  id: number
  date: string // YYYY-MM-DD
  vehicule: string
  outillage: string // ex. ARRACHE ROTULES, OUTILLAGE CHAINE
  prixGarage: number
  prixMohamed?: number // 11% du prix garage (calculé ou saisi)
}

// ==================== OUTILS AHMED ====================
/** Feuille AHMED : Date, Voiture, Type de travaux, Prix Garage, Prix Ahmed */
export interface OutilAhmed {
  id: number
  date: string // YYYY-MM-DD
  vehicule: string // ex. CHERRY, PAIEMENT, AVANCE
  typeTravaux: string // ex. CHAINE ET SOUPAPES, JCS/DURITE EAU
  prixGarage?: number
  prixAhmed: number // positif = revenu, négatif = paiement/avance
}

// ==================== TRANSACTIONS FOURNISSEURS ====================
export type TransactionFournisseurType = 'achat' | 'revenue' | 'paiement'

export interface TransactionFournisseur {
  id: number
  type: TransactionFournisseurType
  date: string // YYYY-MM-DD
  montant: number
  fournisseur: string
  vehicule?: string
  pieces?: string // description des pièces (achat)
  numFacture?: string // n° facture ou bon de livraison (achat)
}

// ==================== FACTURATION ====================
export type FactureStatut = 'brouillon' | 'envoyee' | 'payee' | 'annulee'

export type LigneFacture =
  | { type: 'main_oeuvre'; designation: string; qte: number; mtHT: number }
  | { type: 'depense'; designation: string; montant: number }
  | { type: 'produit'; productId: number; designation: string; qte: number; prixUnitaireHT: number }

export interface Facture {
  id: number
  numero: string // ex. 26-0001
  date: string // YYYY-MM-DD
  statut: FactureStatut
  clientId?: number
  clientNom: string
  clientTelephone: string
  clientAdresse?: string
  clientMatriculeFiscale?: string
  lignes: LigneFacture[]
  timbre: number // ex. 1 DT
  createdAt: string
}

export const FACTURE_STATUT_LABELS: Record<FactureStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Validée',
  payee: 'Payée',
  annulee: 'Annulée',
}

/** Style et libellé pour affichage pro du statut (badge, workflow) */
export const FACTURE_STATUT_CONFIG: Record<
  FactureStatut,
  { label: string; badge: string; dot: string; order: number }
> = {
  brouillon: {
    label: 'Brouillon',
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    dot: 'bg-slate-500',
    order: 1,
  },
  envoyee: {
    label: 'Validée',
    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
    dot: 'bg-blue-500',
    order: 2,
  },
  payee: {
    label: 'Payée',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dot: 'bg-emerald-500',
    order: 3,
  },
  annulee: {
    label: 'Annulée',
    badge: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
    order: 0,
  },
}

// ==================== ACHATS (FACTURES FOURNISSEUR) ====================
export type FactureFournisseurStatut = 'brouillon' | 'validee' | 'payee'

export interface LigneAchat {
  productId: number
  designation: string
  quantite: number
  prixUnitaire: number
}

export type ModePaiement = 'especes' | 'virement' | 'cheque' | 'carte' | 'autre'

export const MODE_PAIEMENT_OPTIONS: { value: ModePaiement; label: string }[] = [
  { value: 'especes', label: 'Espèces' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'autre', label: 'Autre' },
]

export interface FactureFournisseur {
  id: number
  numero: string
  date: string // YYYY-MM-DD
  fournisseurId: number | null
  fournisseurNom: string
  numeroFactureFournisseur?: string
  modePaiement?: string
  commentaire?: string
  statut: FactureFournisseurStatut
  lignes: LigneAchat[]
  paye: boolean // suivi payé / non payé
  createdAt: string
}

export const FACTURE_FOURNISSEUR_STATUT_CONFIG: Record<
  FactureFournisseurStatut,
  { label: string; badge: string }
> = {
  brouillon: { label: 'Brouillon', badge: 'bg-slate-100 text-slate-700 border border-slate-200' },
  validee: { label: 'Validée', badge: 'bg-blue-100 text-blue-800 border border-blue-200' },
  payee: { label: 'Payée', badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
}

// ==================== CHECKLISTS JOURNALIERES ====================
export type ChecklistRole = 'chef_atelier' | 'coordinateur' | 'technicien'
export type ChecklistItemStatus = 'todo' | 'done' | 'na'
export type ChecklistWorkflowStatus = 'draft' | 'submitted' | 'validated' | 'rejected'

export interface ChecklistItem {
  id: string
  label: string
  status: ChecklistItemStatus
  comment: string
}

export interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface DailyChecklistData {
  version: number
  sections: ChecklistSection[]
}

export interface DailyChecklist {
  id: number
  userId: number
  userName: string
  role: ChecklistRole
  date: string
  status: ChecklistWorkflowStatus
  data: DailyChecklistData
  submittedAt: string | null
  validatedAt: string | null
  validatorId: number | null
  validatorName: string
  validatorComment: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistAuditLog {
  id: number
  checklistId: number
  action: 'created' | 'updated' | 'submitted' | 'validated' | 'rejected' | string
  actorId: number | null
  actorName: string
  actorRole: string
  summary: string
  snapshot: DailyChecklistData | null
  createdAt: string
}

export interface ChecklistMonthlyKpi {
  period: string
  totalChecklists: number
  submitted: number
  validated: number
  rejected: number
  lateSubmissions: number
  nonConformities: number
  submissionRate: number
  validationRate: number
  byRole: Record<string, number>
}

export interface ChecklistHistoryMetrics {
  done: number
  todo: number
  na: number
  total: number
  nonConformities: number
}

export interface ChecklistHistoryEntry extends DailyChecklist {
  metrics: ChecklistHistoryMetrics
  lateSubmission: boolean
}

export interface ChecklistHistorySummaryRow {
  userId: number
  userName: string
  role: string
  total: number
  validated: number
  rejected: number
  lateSubmissions: number
  nonConformities: number
  avgCompletionRate: number
}
