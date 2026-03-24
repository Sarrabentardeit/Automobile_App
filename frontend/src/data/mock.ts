import type { User, Vehicule, HistoriqueEtat, TeamMoneyDayEntry, MouvementCaisse, TeamMemberSlots, MoneyIn, MoneyOut, CalendarAssignment, Reclamation, PrixMainOeuvreItem, HuileProduct, Client, ClientAvecDette, ContactImportant, DemandeDevis, Fournisseur, TransactionFournisseur, MouvementProduit, ProduitStock, OutilMohamed, OutilAhmed } from '@/types'
import { ROLE_PRESETS, TEAM_MONEY_MEMBERS } from '@/types'

// ==================== UTILISATEURS ====================
export const mockUsers: User[] = [
  {
    id: 1, email: 'admin@elmecano.tn', nom_complet: 'Souhail', telephone: '58118291',
    role: 'admin', permissions: { ...ROLE_PRESETS.admin },
    statut: 'actif', date_creation: '2026-01-01', derniere_connexion: '2026-02-17T08:30:00',
  },
  {
    id: 2, email: 'mohamed@elmecano.tn', nom_complet: 'Mohamed Haddad', telephone: '56919288',
    role: 'responsable', permissions: { ...ROLE_PRESETS.responsable },
    statut: 'actif', date_creation: '2026-01-01', derniere_connexion: '2026-02-17T07:45:00',
  },
  {
    id: 3, email: 'meher@elmecano.tn', nom_complet: 'Meher', telephone: '26801753',
    role: 'responsable', permissions: { ...ROLE_PRESETS.responsable },
    statut: 'actif', date_creation: '2026-01-01', derniere_connexion: '2026-02-17T08:10:00',
  },
  {
    id: 4, email: 'melek@elmecano.tn', nom_complet: 'Melek', telephone: '22130470',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-05', derniere_connexion: '2026-02-17T08:00:00',
  },
  {
    id: 5, email: 'ahmed@elmecano.tn', nom_complet: 'Ahmed Ghazouani', telephone: '25952917',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-05', derniere_connexion: '2026-02-16T17:30:00',
  },
  {
    id: 6, email: 'khalil@elmecano.tn', nom_complet: 'Khalil BK', telephone: '58174300',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-05', derniere_connexion: '2026-02-17T08:15:00',
  },
  {
    id: 7, email: 'hassen@elmecano.tn', nom_complet: 'Hassen', telephone: '26801753',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-05', derniere_connexion: '2026-02-16T16:00:00',
  },
  {
    id: 8, email: 'sfe9si@elmecano.tn', nom_complet: 'Sfe9si', telephone: '50400451',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-10', derniere_connexion: '2026-02-17T07:50:00',
  },
  {
    id: 9, email: 'aziz@elmecano.tn', nom_complet: 'Aziz', telephone: '55617434',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-10', derniere_connexion: '2026-02-16T17:00:00',
  },
  {
    id: 10, email: 'akrem@elmecano.tn', nom_complet: 'Akrem', telephone: '29639118',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-12', derniere_connexion: '2026-02-15T17:30:00',
  },
  {
    id: 11, email: 'yesser@elmecano.tn', nom_complet: 'Yesser', telephone: '58084001',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'actif', date_creation: '2026-01-12', derniere_connexion: '2026-02-16T12:00:00',
  },
  {
    id: 12, email: 'rabia@elmecano.tn', nom_complet: 'Rabia', telephone: '50400451',
    role: 'financier', permissions: { ...ROLE_PRESETS.financier },
    statut: 'actif', date_creation: '2026-01-01', derniere_connexion: '2026-02-17T08:00:00',
  },
  {
    id: 13, email: 'meleksid@elmecano.tn', nom_complet: 'Melek SID', telephone: '29639118',
    role: 'technicien', permissions: { ...ROLE_PRESETS.technicien },
    statut: 'inactif', date_creation: '2026-01-15', derniere_connexion: '2026-02-10T16:00:00',
  },
]

// ==================== VEHICULES ====================
export const initialVehicules: Vehicule[] = [
  // --- MAUVE (ATT PIECES) ---
  {
    id: 1, immatriculation: '171 TU 4845', modele: 'SEAT', type: 'voiture',
    etat_actuel: 'mauve', technicien_id: 4, responsable_id: 2,
    defaut: 'REVISION', client_telephone: '98305274',
    date_entree: '2026-01-23', date_sortie: null, notes: 'Attente tourneur',
    derniere_mise_a_jour: '2026-02-10T14:00:00',
  },
  // --- ORANGE (EN COURS) ---
  {
    id: 2, immatriculation: '244 TU 634', modele: 'PASSAT 2', type: 'voiture',
    etat_actuel: 'orange', technicien_id: 5, responsable_id: 2,
    defaut: 'VERIFICATION TURBO', client_telephone: '24890863',
    date_entree: '2026-01-27', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-01-27T09:00:00',
  },
  {
    id: 3, immatriculation: '114 TU 1141', modele: '206 RIM', type: 'voiture',
    etat_actuel: 'orange', technicien_id: 4, responsable_id: 3,
    defaut: 'FUITE D\'EAU', client_telephone: '99461486',
    date_entree: '2026-02-14', date_sortie: null, notes: 'Fuite circuit refroidissement',
    derniere_mise_a_jour: '2026-02-14T10:00:00',
  },
  {
    id: 4, immatriculation: '192 TU 6822', modele: 'MERCEDES', type: 'voiture',
    etat_actuel: 'orange', technicien_id: null, responsable_id: 3,
    defaut: 'DIAG', client_telephone: '',
    date_entree: '2026-02-16', date_sortie: null, notes: 'Diagnostic en cours',
    derniere_mise_a_jour: '2026-02-16T08:30:00',
  },
  {
    id: 5, immatriculation: '', modele: 'KIA SPORTAGE', type: 'voiture',
    etat_actuel: 'orange', technicien_id: 6, responsable_id: 4,
    defaut: 'VIDANGE', client_telephone: '98765432',
    date_entree: '2026-02-16', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-16T09:00:00',
  },
  {
    id: 11, immatriculation: 'RS 211365', modele: 'CHEVROLET', type: 'voiture',
    etat_actuel: 'orange', technicien_id: 13, responsable_id: null,
    defaut: 'BRUIT MOTEUR', client_telephone: '93246855',
    date_entree: '2026-02-04', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-04T11:00:00',
  },
  // --- BLEU (TEST) ---
  {
    id: 6, immatriculation: '251 TU 6099', modele: 'TOYOTA', type: 'voiture',
    etat_actuel: 'bleu', technicien_id: 7, responsable_id: 5,
    defaut: 'AVANT TRAIN + TRAIN ARRIERE', client_telephone: '',
    date_entree: '2026-02-13', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-16T16:00:00',
  },
  {
    id: 7, immatriculation: '210 TU 3069', modele: '3008', type: 'voiture',
    etat_actuel: 'bleu', technicien_id: 8, responsable_id: null,
    defaut: 'CULASSE', client_telephone: '99103019',
    date_entree: '2026-02-09', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-15T10:00:00',
  },
  {
    id: 8, immatriculation: '', modele: '207', type: 'voiture',
    etat_actuel: 'bleu', technicien_id: 8, responsable_id: null,
    defaut: 'KIT CHAINE', client_telephone: '54054571',
    date_entree: '2026-02-16', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-16T17:00:00',
  },
  // --- VERT (VALIDE) ---
  {
    id: 9, immatriculation: '251 TU 6099', modele: 'TOYOTA PRADO', type: 'voiture',
    etat_actuel: 'vert', technicien_id: 9, responsable_id: 3,
    defaut: 'POMPE A EAU', client_telephone: '98332228',
    date_entree: '2026-02-14', date_sortie: null, notes: 'Prêt pour remise clé',
    derniere_mise_a_jour: '2026-02-17T09:00:00',
  },
  {
    id: 10, immatriculation: 'FT010LA', modele: 'FORD MONDEO', type: 'voiture',
    etat_actuel: 'vert', technicien_id: 10, responsable_id: null,
    defaut: 'PROBLEME', client_telephone: '',
    date_entree: '2026-02-01', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-02-16T14:00:00',
  },
  // --- ROUGE (PROBLEME) ---
  {
    id: 12, immatriculation: 'RS 190791', modele: 'VITO', type: 'voiture',
    etat_actuel: 'rouge', technicien_id: null, responsable_id: null,
    defaut: 'REVISION', client_telephone: '26305604',
    date_entree: '2026-02-16', date_sortie: null, notes: 'Attente technicien',
    derniere_mise_a_jour: '2026-02-16T10:00:00',
  },
  {
    id: 13, immatriculation: 'RS 256315', modele: 'TOYOTA CHR', type: 'voiture',
    etat_actuel: 'rouge', technicien_id: 8, responsable_id: 6,
    defaut: 'DIAG APP', client_telephone: '24062009',
    date_entree: '2026-01-23', date_sortie: null, notes: 'Problème application diagnostic',
    derniere_mise_a_jour: '2026-02-01T09:00:00',
  },
  {
    id: 14, immatriculation: '127 TU 2987', modele: 'INFINITY', type: 'voiture',
    etat_actuel: 'rouge', technicien_id: 8, responsable_id: null,
    defaut: 'MISE AU POINT', client_telephone: '',
    date_entree: '2025-12-09', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-01-15T11:00:00',
  },
  // --- MOTOS ---
  {
    id: 15, immatriculation: 'DN25299', modele: 'GSXF 750', type: 'moto',
    etat_actuel: 'vert', technicien_id: 11, responsable_id: 10,
    defaut: 'MOTEUR EN ARRET', client_telephone: '99517295',
    date_entree: '2025-10-18', date_sortie: '2026-01-17',
    notes: 'REPARATION FAISCEAU COMPLET / VIDANGE / VERIFICATION BOUGIES',
    derniere_mise_a_jour: '2026-01-17T15:00:00',
  },
  {
    id: 16, immatriculation: 'DN10200', modele: 'R6', type: 'moto',
    etat_actuel: 'orange', technicien_id: null, responsable_id: 10,
    defaut: 'REVISION', client_telephone: '26596049',
    date_entree: '2026-01-17', date_sortie: null, notes: '',
    derniere_mise_a_jour: '2026-01-17T10:00:00',
  },
  {
    id: 17, immatriculation: 'DW58988', modele: 'TZR50', type: 'moto',
    etat_actuel: 'mauve', technicien_id: null, responsable_id: 10,
    defaut: 'MOTEUR EN ARRET + DEVIS PEINTURE', client_telephone: '20020202',
    date_entree: '2026-01-14', date_sortie: null, notes: 'Attente pièces peinture',
    derniere_mise_a_jour: '2026-01-20T14:00:00',
  },
]

// ==================== HISTORIQUE ====================
export const initialHistorique: HistoriqueEtat[] = [
  // TOYOTA (id:6) - parcours complet
  { id: 1, vehicule_id: 6, etat_precedent: null, etat_nouveau: 'orange',
    date_changement: '2026-02-13T09:00:00', utilisateur_id: 2, utilisateur_nom: 'Mohamed Haddad',
    commentaire: 'Réception du véhicule - Problème avant train + train arrière',
    duree_etat_precedent_minutes: null, pieces_utilisees: '' },
  { id: 2, vehicule_id: 6, etat_precedent: 'orange', etat_nouveau: 'mauve',
    date_changement: '2026-02-13T14:30:00', utilisateur_id: 7, utilisateur_nom: 'Hassen',
    commentaire: 'Attente pièces train avant - commande chez WANES',
    duree_etat_precedent_minutes: 330, pieces_utilisees: 'Rotules, biellettes' },
  { id: 3, vehicule_id: 6, etat_precedent: 'mauve', etat_nouveau: 'orange',
    date_changement: '2026-02-15T10:00:00', utilisateur_id: 2, utilisateur_nom: 'Mohamed Haddad',
    commentaire: 'Pièces reçues de WANES - reprise des travaux',
    duree_etat_precedent_minutes: 2610, pieces_utilisees: '' },
  { id: 4, vehicule_id: 6, etat_precedent: 'orange', etat_nouveau: 'bleu',
    date_changement: '2026-02-16T16:00:00', utilisateur_id: 7, utilisateur_nom: 'Hassen',
    commentaire: 'Réparation terminée - envoi en test routier',
    duree_etat_precedent_minutes: 1800, pieces_utilisees: 'Rotules AV, biellettes, silent blocs AR' },
  // TOYOTA PRADO (id:9) - parcours jusqu'à VERT
  { id: 5, vehicule_id: 9, etat_precedent: null, etat_nouveau: 'orange',
    date_changement: '2026-02-14T08:00:00', utilisateur_id: 3, utilisateur_nom: 'Meher',
    commentaire: 'Réception - pompe à eau défaillante',
    duree_etat_precedent_minutes: null, pieces_utilisees: '' },
  { id: 6, vehicule_id: 9, etat_precedent: 'orange', etat_nouveau: 'mauve',
    date_changement: '2026-02-14T11:00:00', utilisateur_id: 9, utilisateur_nom: 'Aziz',
    commentaire: 'Commande pompe à eau chez fournisseur',
    duree_etat_precedent_minutes: 180, pieces_utilisees: '' },
  { id: 7, vehicule_id: 9, etat_precedent: 'mauve', etat_nouveau: 'orange',
    date_changement: '2026-02-15T14:00:00', utilisateur_id: 3, utilisateur_nom: 'Meher',
    commentaire: 'Pièce reçue - remplacement en cours',
    duree_etat_precedent_minutes: 1620, pieces_utilisees: 'Pompe à eau neuve' },
  { id: 8, vehicule_id: 9, etat_precedent: 'orange', etat_nouveau: 'bleu',
    date_changement: '2026-02-16T10:00:00', utilisateur_id: 9, utilisateur_nom: 'Aziz',
    commentaire: 'Remplacement effectué - test de circulation',
    duree_etat_precedent_minutes: 1200, pieces_utilisees: 'Joint, colliers' },
  { id: 9, vehicule_id: 9, etat_precedent: 'bleu', etat_nouveau: 'vert',
    date_changement: '2026-02-17T09:00:00', utilisateur_id: 9, utilisateur_nom: 'Aziz',
    commentaire: 'Test réussi - véhicule validé pour remise clé',
    duree_etat_precedent_minutes: 1380, pieces_utilisees: '' },
  // SEAT (id:1) - Orange puis Mauve
  { id: 10, vehicule_id: 1, etat_precedent: null, etat_nouveau: 'orange',
    date_changement: '2026-01-23T09:00:00', utilisateur_id: 2, utilisateur_nom: 'Mohamed Haddad',
    commentaire: 'Entrée véhicule pour révision complète',
    duree_etat_precedent_minutes: null, pieces_utilisees: '' },
  { id: 11, vehicule_id: 1, etat_precedent: 'orange', etat_nouveau: 'mauve',
    date_changement: '2026-02-10T14:00:00', utilisateur_id: 4, utilisateur_nom: 'Melek',
    commentaire: 'Attente tourneur pour pièces spécifiques',
    duree_etat_precedent_minutes: 26100, pieces_utilisees: '' },
  // TOYOTA CHR (id:13) - Orange puis Rouge
  { id: 12, vehicule_id: 13, etat_precedent: null, etat_nouveau: 'orange',
    date_changement: '2026-01-23T10:00:00', utilisateur_id: 3, utilisateur_nom: 'Meher',
    commentaire: 'Réception pour diagnostic appareil',
    duree_etat_precedent_minutes: null, pieces_utilisees: '' },
  { id: 13, vehicule_id: 13, etat_precedent: 'orange', etat_nouveau: 'rouge',
    date_changement: '2026-02-01T09:00:00', utilisateur_id: 8, utilisateur_nom: 'Sfe9si',
    commentaire: 'Problème avec appareil de diagnostic - outil non compatible',
    duree_etat_precedent_minutes: 12780, pieces_utilisees: '' },
]

// ==================== CAISSE / TEAM MONEY TRACK ====================
function emptySlots(): TeamMemberSlots {
  return { inHand: null, taken: null, note: '', presence: null }
}

function dayEntry(id: number, date: string, membersPartial: Partial<Record<string, Partial<TeamMemberSlots>>>): TeamMoneyDayEntry {
  const members: Record<string, TeamMemberSlots> = {}
  TEAM_MONEY_MEMBERS.forEach(name => {
    const p = membersPartial[name]
    members[name] = p
      ? { inHand: p.inHand ?? null, taken: p.taken ?? null, note: p.note ?? '', presence: p.presence ?? null }
      : emptySlots()
  })
  return { id, date, members }
}

export const mockTeamMoneyDays: TeamMoneyDayEntry[] = [
  dayEntry(1, '2026-02-04', {
    Souhail: { inHand: 481, taken: null, note: '' },
    'Khalil BK': { inHand: 6, taken: 200, note: '' },
    MEHER: { inHand: 815, taken: null, note: '' },
    MELEK: { inHand: 50, taken: 15, note: 'COURS' },
    YASSIN: { inHand: 2, taken: null, note: '' },
    YASSER: { inHand: 102, taken: null, note: '' },
    BELGACEM: { inHand: 982, taken: null, note: '' },
    YOUSSEF: { inHand: 0, taken: null, note: '' },
    'MOHAMED HADDAD': { inHand: 0, taken: null, note: '' },
    'MOHAMED RADHOUENE': { inHand: 60, taken: null, note: '' },
    'MOHAMED MAHMOUDI': { inHand: 1100, taken: 0, note: '' },
    'MED ALI': { inHand: 20, taken: null, note: '' },
    ADEM: { inHand: 0, taken: null, note: '' },
  }),
  dayEntry(2, '2026-02-05', { MELEK: { inHand: 10, taken: null, note: '' }, YASSIN: { inHand: 10, taken: null, note: '' } }),
  dayEntry(3, '2026-02-06', { YASSIN: { inHand: 20, taken: null, note: '' }, 'AHMED GHAZOUANI': { inHand: 100, taken: null, note: '' } }),
  dayEntry(4, '2026-02-07', { MELEK: { inHand: 25, taken: null, note: '' }, 'MED ALI': { inHand: 80, taken: null, note: '' } }),
  dayEntry(5, '2026-02-08', {
    MELEK: { inHand: 30, taken: null, note: '' }, YASSER: { inHand: 30, taken: null, note: '' },
    BELGACEM: { inHand: 50, taken: null, note: '' }, YASSIN: { inHand: 30, taken: null, note: '' },
    'MOHAMED RADHOUENE': { inHand: 100, taken: null, note: '' },
  }),
  dayEntry(6, '2026-02-09', {
    Souhail: { inHand: 20, taken: null, note: '' }, YASSIN: { inHand: 20, taken: null, note: '' },
    MELEK: { inHand: 10, taken: null, note: '' }, 'MOHAMED RADHOUENE': { inHand: 100, taken: null, note: '' },
  }),
  dayEntry(7, '2026-02-10', {
    Souhail: { inHand: 250, taken: 230, note: '', presence: 'a_temps' }, ZAK: { inHand: 100, taken: 100, note: '', presence: 'a_temps' },
    MEHER: { inHand: 100, taken: 100, note: '', presence: 'a_temps' }, MELEK: { inHand: 50, taken: null, note: '100', presence: 'retard' },
    YASSIN: { inHand: 160, taken: null, note: '', presence: 'a_temps' }, 'MELEK SID': { inHand: 100, taken: 70, note: '', presence: 'heures_sup' },
    YASSER: { inHand: 100, taken: 120, note: '' }, AZIZ: { inHand: 100, taken: 100, note: '' },
    BELGACEM: { inHand: 130, taken: 200, note: '' }, 'AHMED GHAZOUANI': { inHand: 250, taken: 250, note: '' },
    'MOHAMED MAHMOUDI': { inHand: 200, taken: 200, note: '' }, 'MED ALI': { inHand: 80, taken: null, note: '', presence: 'conges' },
    ADEM: { inHand: 200, taken: 200, note: '' },
  }),
  dayEntry(8, '2026-02-11', {}),
  dayEntry(9, '2026-02-14', { 'Khalil BK': { inHand: 30, taken: null, note: '' } }),
  dayEntry(10, '2026-02-17', {}),
]

export const mockMouvementsCaisse: MouvementCaisse[] = [
  { id: 1, date: '2026-02-04', montant: 40, category: 'RABI3', notes: '' },
  { id: 2, date: '2026-02-06', montant: 1000, category: 'RABI3', notes: 'CHOKRI' },
  { id: 3, date: '2026-02-07', montant: 600, category: 'RABI3', notes: '' },
  { id: 4, date: '2026-02-09', montant: 150, category: 'RABI3', notes: 'saliha' },
  { id: 5, date: '2026-02-09', montant: 10, category: 'RABI3', notes: '' },
  { id: 6, date: '2026-02-10', montant: 840, category: 'RABI3', notes: 'COMPTE' },
  { id: 7, date: '2026-02-11', montant: 220, category: 'RABI3', notes: '' },
  { id: 8, date: '2026-02-11', montant: 1000, category: 'RABI3', notes: '' },
  { id: 9, date: '2026-02-14', montant: 400, category: 'RABI3', notes: '' },
]

// ==================== FEUILLE MONEY (IN / OUT) ====================
export const mockMoneyIn: MoneyIn[] = [
  { id: 1, date: '2026-02-02', amount: 400, type: 'PIECES', description: 'SEAT IBIZA', paymentMethod: 'ESPECE' },
  { id: 2, date: '2026-02-03', amount: 100, type: 'MECA', description: '308', paymentMethod: 'ESPECE' },
  { id: 3, date: '2026-02-04', amount: 2700, type: 'MECA', description: 'A3', paymentMethod: 'ESPECE' },
  { id: 4, date: '2026-02-05', amount: 500, type: 'DIAG', description: 'PASSAT', paymentMethod: 'ESPECE' },
  { id: 5, date: '2026-02-06', amount: 200, type: 'PIECES', description: 'CADDY', paymentMethod: 'ESPECE' },
]

export const mockMoneyOut: MoneyOut[] = [
  { id: 1, date: '2026-02-02', amount: 2, category: 'GARAGE', description: 'PILES', beneficiary: 'MEHE' },
  { id: 2, date: '2026-02-03', amount: 10, category: 'DEPENSE VOITURE', description: 'C3', beneficiary: 'FAA' },
  { id: 3, date: '2026-02-04', amount: 20, category: 'FOURNISSEUR', description: 'PINCEAUX', beneficiary: 'ZAKAR' },
  { id: 4, date: '2026-02-05', amount: 200, category: 'GARAGE', description: 'ftour', beneficiary: 'AHMED' },
  { id: 5, date: '2026-02-06', amount: 935, category: 'FOURNISSEUR', description: 'KATO', beneficiary: 'MELEK' },
]

// ==================== CALENDRIER AFFECTATIONS ====================
export const mockCalendarAssignments: CalendarAssignment[] = [
  { id: 1, date: '2026-02-02', memberName: 'AHMED', vehicleId: 1, vehicleLabel: 'MEGANE 3', description: 'JOINT DE CULASSE / KIT CHAINE / POMPE A EAU' },
  { id: 2, date: '2026-02-02', memberName: 'MOHAMED ALI', vehicleId: 2, vehicleLabel: 'SKODA', description: '4 AMORTISSEURS' },
  { id: 3, date: '2026-02-03', memberName: 'MEHER', vehicleId: null, vehicleLabel: 'SEAT IBIZA', description: 'DIAG APP RATEE CYLINDRE 1 ET 4' },
  { id: 4, date: '2026-02-04', memberName: 'OUSSEMA', vehicleId: null, vehicleLabel: 'GOLF 6', description: 'VERIFICATION CAPTEUR ABS / POMPE A EAU' },
  { id: 5, date: '2026-02-04', memberName: 'SEIF', vehicleId: null, vehicleLabel: 'NEMO', description: 'DEMONTAGE RENIFLARD ET TURBO' },
  { id: 6, date: '2026-02-05', memberName: 'RAMZI', vehicleId: null, vehicleLabel: 'OPEL ASTRA H', description: 'VERIFICATION TURBO / DIAG POMPE A EAU' },
  { id: 7, date: '2026-02-09', memberName: 'FERNAZ', vehicleId: null, vehicleLabel: 'POLO 7', description: 'REVISION' },
  { id: 8, date: '2026-02-10', memberName: 'ZEINEB', vehicleId: null, vehicleLabel: 'FORD', description: 'FREINS' },
  { id: 9, date: '2026-02-11', memberName: 'MOHAMED', vehicleId: null, vehicleLabel: 'TIGUAN', description: 'DIAG' },
]

// ==================== RÉCLAMATIONS ====================
export const mockReclamations: Reclamation[] = [
  { id: 1, date: '2026-02-03', clientName: 'M. Ben Ali', clientTelephone: '58118291', vehicleRef: 'SEAT IBIZA 127 TU 2987', sujet: 'Bruit frein arrière', description: 'Client signale un grincement au freinage après réparation. À contrôler.', statut: 'ouverte', assigneA: 'Souhail', priorite: 'haute' },
  { id: 2, date: '2026-02-05', clientName: 'Mme Ferchichi', clientTelephone: '50400451', vehicleRef: '308', sujet: 'Climatisation', description: 'Clim ne refroidit plus après passage. Vérifier recharge.', statut: 'en_cours', assigneA: 'Yassin', priorite: 'normale' },
  { id: 3, date: '2026-02-07', clientName: 'M. Ghazouani', vehicleRef: 'A3', sujet: 'Vibrations moteur', description: 'Vibrations ressenties à l\'accélération. Contrôle demandé.', statut: 'traitee', assigneA: 'Melek', priorite: 'normale' },
  { id: 4, date: '2026-02-09', clientName: 'M. Radhouene', clientTelephone: '55617434', vehicleRef: 'GOLF 6', sujet: 'Joint de culasse', description: 'Refait joint il y a 2 semaines. Fuite huile réapparue.', statut: 'ouverte', priorite: 'haute' },
  { id: 5, date: '2026-02-10', clientName: 'M. Belgacem', vehicleRef: 'PASSAT', sujet: 'Retard livraison', description: 'Client mécontent du délai. S\'excuser et prioriser.', statut: 'cloturee', assigneA: 'Souhail', priorite: 'basse' },
]

// ==================== PRIX MAIN D'OEUVRE (DEVIS) ====================
export const mockPrixMainOeuvre: PrixMainOeuvreItem[] = [
  { id: 1, designation: 'Amortisseurs et Toc', prixLux: '200', prixLegeres: '70', groupe: 'train_av_ar' },
  { id: 2, designation: 'Bielles Suspension', prixLux: '60', prixLegeres: '50', groupe: 'train_av_ar' },
  { id: 3, designation: 'Plaquettes de Frein', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 4, designation: 'Disques de Frein', prixLux: '70', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 5, designation: 'Silent Bloc', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 6, designation: 'Triangles', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 7, designation: 'Bras de Direction', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 8, designation: 'Rotules', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 9, designation: 'Roulements', prixLux: '50', prixLegeres: '40', groupe: 'train_av_ar' },
  { id: 10, designation: 'Tête Cardan', prixLux: '60', prixLegeres: '50', groupe: 'train_av_ar' },
  { id: 11, designation: 'Embrayage', prixLux: '300', prixLegeres: '180', groupe: 'transmission' },
  { id: 12, designation: 'Kit Chaîne', prixLux: '500', prixLegeres: '180', groupe: 'transmission' },
  { id: 13, designation: 'Crémaillère', prixLux: '300', prixLegeres: '180', groupe: 'transmission' },
  { id: 14, designation: 'Courroie', prixLux: '50', prixLegeres: '40', groupe: 'transmission' },
  { id: 15, designation: 'Tendeur', prixLux: '50', prixLegeres: '40', groupe: 'transmission' },
  { id: 16, designation: 'Vidange + Bougies', prixLux: '80', prixLegeres: '50', groupe: 'entretien' },
  { id: 17, designation: 'Vidange Complet', prixLux: '50', prixLegeres: '40', groupe: 'entretien' },
  { id: 18, designation: 'EGR', prixLux: '500', prixLegeres: '300', groupe: 'autre' },
  { id: 19, designation: 'FAP', prixLux: '500', prixLegeres: '300', groupe: 'autre' },
  { id: 20, designation: 'Catalyseur', prixLux: '500', prixLegeres: '300', groupe: 'autre' },
  { id: 21, designation: 'Sonde Lambda', prixLux: '50', prixLegeres: '40', groupe: 'autre' },
  { id: 22, designation: 'Bobine', prixLux: '50', prixLegeres: '40', groupe: 'autre' },
  { id: 23, designation: 'Pompe à Eau', prixLux: '300', prixLegeres: 'à partir de 80', groupe: 'autre' },
  { id: 24, designation: 'Joint de Culasse / Joint Cache Soupapes', prixLux: '200', prixLegeres: '70', groupe: 'autre' },
  { id: 25, designation: 'Injecteurs', prixLux: 'à partir de 80 selon type et emplacement', prixLegeres: 'à partir de 80 selon type et emplacement', groupe: 'autre' },
]

// ==================== HUILE (STOCK) ====================
export const mockHuileProducts: HuileProduct[] = [
  { id: 1, designation: '5W30 Synthétique', reference: 'MOT-5W30', type: 'moteur', quantite: 24, unite: 'L', seuilAlerte: 10, prix: 35 },
  { id: 2, designation: '10W40 Semi-synthétique', reference: 'MOT-10W40', type: 'moteur', quantite: 48, unite: 'L', seuilAlerte: 20, prix: 28 },
  { id: 3, designation: '15W40 Mineral', reference: 'MOT-15W40', type: 'moteur', quantite: 8, unite: 'L', seuilAlerte: 10, prix: 22 },
  { id: 4, designation: 'Huile boîte manuelle 75W90', reference: 'BOX-75W90', type: 'boite', quantite: 12, unite: 'L', seuilAlerte: 5, prix: 40 },
  { id: 5, designation: 'Huile boîte auto ATF', reference: 'BOX-ATF', type: 'boite', quantite: 6, unite: 'L', seuilAlerte: 3, prix: 38 },
  { id: 6, designation: 'Liquide refroidissement vert', reference: 'REF-VERT', type: 'liquide_refroidissement', quantite: 20, unite: 'L', seuilAlerte: 5, prix: 12 },
  { id: 7, designation: 'Liquide refroidissement rose', reference: 'REF-ROSE', type: 'liquide_refroidissement', quantite: 15, unite: 'L', seuilAlerte: 5, prix: 14 },
  { id: 8, designation: 'Huile hydraulique direction', reference: 'HYD-DIR', type: 'hydraulique', quantite: 4, unite: 'L', seuilAlerte: 2, prix: 30 },
  { id: 9, designation: 'Dégrippant / Nettoyant freins', reference: 'AUT-DEG', type: 'autre', quantite: 12, unite: 'unité', seuilAlerte: 3, prix: 8 },
]

// ==================== CLIENTS ====================
export const mockClients: Client[] = [
  { id: 1, nom: 'M. Ben Salem', telephone: '58118291', email: 'bensalem@email.tn', adresse: 'Tunis' },
  { id: 2, nom: 'Mme Ferchichi', telephone: '50400451' },
  { id: 3, nom: 'M. Ghazouani', telephone: '25952917', adresse: 'Ariana' },
  { id: 4, nom: 'M. Radhouene', telephone: '55617434', notes: 'Client fidèle' },
]

// ==================== CLIENTS AVEC DETTES ====================
export const mockClientsAvecDettes: ClientAvecDette[] = [
  { id: 1, clientName: 'ACHREF', telephoneClient: 'ACHREF CLA250', designation: 'PIECES', reste: 130, notes: '' },
  { id: 2, clientName: 'ZIED', telephoneClient: 'BERLINGO', designation: 'MO', reste: 200, notes: '' },
  { id: 3, clientName: 'FAWZI BOUDEN', telephoneClient: 'NISSAN JUKE', designation: 'MO', reste: 2600, notes: '' },
  { id: 4, clientName: 'SABRI', telephoneClient: 'W204', designation: 'RESTE PIECES ET MO', reste: 985, notes: '' },
]

// ==================== DEMANDES DEVIS ====================
export const mockDemandesDevis: DemandeDevis[] = [
  { id: 1, date: '2026-02-12', clientName: 'M. Ben Salem', clientTelephone: '58118291', vehicleRef: 'SEAT IBIZA 127 TU 2987', description: 'Révision complète + plaquettes frein arrière', statut: 'en_attente', montantEstime: 350, dateLimite: '2026-02-20' },
  { id: 2, date: '2026-02-10', clientName: 'Mme Ferchichi', clientTelephone: '50400451', vehicleRef: '308', description: 'Climatisation : recharge + vérification fuite', statut: 'envoye', montantEstime: 180 },
  { id: 3, date: '2026-02-08', clientName: 'M. Ghazouani', vehicleRef: 'A3', description: 'Amortisseurs 4 roues + silentblocs', statut: 'accepte', montantEstime: 650 },
  { id: 4, date: '2026-02-05', clientName: 'M. Radhouene', clientTelephone: '55617434', vehicleRef: 'GOLF 6', description: 'Joint de culasse + kit distribution', statut: 'refuse', notes: 'Client préfère autre garage' },
]

// ==================== CONTACTS IMPORTANTS ====================
export const mockContactsImportants: ContactImportant[] = [
  { id: 1, nom: 'Dépannage 24h', numero: '71 123 456', categorie: 'Dépannage', notes: 'Remorquage' },
  { id: 2, nom: 'Fournisseur pièces', numero: '72 234 567', categorie: 'Fournisseur' },
  { id: 3, nom: 'Assurance partenaire', numero: '73 345 678', categorie: 'Assurance' },
  { id: 4, nom: 'Contrôle technique', numero: '74 456 789', categorie: 'Prestataire' },
]

// ==================== FOURNISSEURS ====================
export const mockFournisseurs: Fournisseur[] = [
  { id: 1, nom: 'Auto Parts Tunis', telephone: '71 234 567', email: 'contact@autoparts.tn', adresse: 'Zone industrielle Ben Arous', contact: 'M. Karim', notes: 'Pièces détachées' },
  { id: 2, nom: 'Lubrifiants Pro', telephone: '72 345 678', email: 'info@lubrifiants.tn', contact: 'Mme Samira' },
  { id: 3, nom: 'Équipements Garage', telephone: '73 456 789', adresse: 'Ariana', notes: 'Outillage et équipements' },
]

// ==================== STOCK GÉNÉRAL (PRODUITS) ====================
export const mockMouvementsProduit: MouvementProduit[] = [
  { id: 1, date: '2026-02-10', produit: 'INJECTEUR DIESEL', vehicule: '308', technicien: 'RABIA', neufUtilise: 'neuf', statut: 'fini', prix: 110, fournisseur: 'AHMED AUTO ONE' },
  { id: 2, date: '2026-02-10', produit: 'HUILE 10W40', vehicule: 'QASHQAI', technicien: 'MOHAMED', neufUtilise: 'neuf', statut: 'fini', prix: 35, fournisseur: 'CASTROL' },
  { id: 3, date: '2026-02-16', produit: 'LIQUIDE REF VERT', vehicule: 'TIGUAN', technicien: 'MELEK', neufUtilise: 'neuf', statut: 'fini', prix: 30, fournisseur: 'LIQUIMOLY' },
  { id: 4, date: '2026-02-17', produit: 'CORPS PAPILLON', vehicule: 'KIA WAJDI', technicien: 'HAMA', neufUtilise: 'neuf', statut: 'en_cours', prix: 380, fournisseur: 'GARAGE' },
  { id: 5, date: '2026-02-17', produit: 'PATE A JOINT', vehicule: 'TOYOTA PRADO', technicien: 'ADEM', neufUtilise: 'neuf', statut: 'fini', prix: 10, fournisseur: 'FLAMINGO (ATEF)' },
  { id: 6, date: '2026-02-19', produit: 'HUILE 5W30', vehicule: 'MERCEDES', technicien: 'RABIA', neufUtilise: 'neuf', statut: 'fini', prix: 30, fournisseur: 'LIQUIMOLY' },
]

export const mockProduitsStock: ProduitStock[] = [
  { id: 1, nom: 'HUILE 5W30', quantite: 6, valeurAchatTTC: 141 },
  { id: 2, nom: 'HUILE 5W40', quantite: 1, valeurAchatTTC: 124 },
  { id: 3, nom: 'RAF11', quantite: 8, valeurAchatTTC: 97 },
  { id: 4, nom: 'ESSUIE-GLACE', quantite: 15, valeurAchatTTC: 4 },
  { id: 5, nom: 'LIQUIDE REF ROUGE', quantite: 11, valeurAchatTTC: 5 },
  { id: 6, nom: 'PATE A MAIN', quantite: 16, valeurAchatTTC: 5 },
  { id: 7, nom: 'ANTI USURE', quantite: 1, valeurAchatTTC: 30 },
  { id: 8, nom: 'RINCAGE', quantite: 10, valeurAchatTTC: 23.7 },
  { id: 9, nom: 'ADDITIF DIESEL', quantite: 10, valeurAchatTTC: 19.6 },
]

// ==================== OUTILS MOHAMED ====================
export const mockOutilsMohamed: OutilMohamed[] = [
  { id: 1, date: '2026-01-08', vehicule: 'FIAT ADEX', outillage: 'ARRACHE ROTULES', prixGarage: 40, prixMohamed: 4.4 },
  { id: 2, date: '2026-02-03', vehicule: 'SKODA', outillage: 'ARRACHE AMORTISSEURS', prixGarage: 130, prixMohamed: 14.3 },
  { id: 3, date: '2026-02-09', vehicule: 'c3', outillage: 'OUTILLAGE CHAINE', prixGarage: 150, prixMohamed: 16.5 },
  { id: 4, date: '2026-02-09', vehicule: 'SEAT', outillage: 'OUTILLAGE CHAINE', prixGarage: 150, prixMohamed: 16.5 },
  { id: 5, date: '2026-02-09', vehicule: 'SEAT', outillage: 'OUTILLAGE CHAINE', prixGarage: 150, prixMohamed: 16.5 },
  { id: 6, date: '2026-02-12', vehicule: 'SEAT', outillage: 'OUTILLAGE CHAINE', prixGarage: 170, prixMohamed: 18.7 },
]

// ==================== OUTILS AHMED ====================
export const mockOutilsAhmed: OutilAhmed[] = [
  { id: 1, date: '2026-02-03', vehicule: 'CHERRY', typeTravaux: 'CHAINE ET SOUPAPES', prixGarage: 700, prixAhmed: 350 },
  { id: 2, date: '2026-02-03', vehicule: 'PAIEMENT', typeTravaux: '', prixAhmed: -210 },
  { id: 3, date: '2026-02-05', vehicule: 'AVANCE', typeTravaux: 'ZAKARIA', prixAhmed: -50 },
  { id: 4, date: '2026-02-07', vehicule: 'AVANCE', typeTravaux: '', prixAhmed: -50 },
  { id: 5, date: '2026-02-11', vehicule: 'AVANCE', typeTravaux: '', prixAhmed: -100 },
  { id: 6, date: '2026-02-13', vehicule: 'CHERRY', typeTravaux: 'JCS/DURITE EAU', prixAhmed: 20 },
  { id: 7, date: '2026-02-13', vehicule: 'AUDI A6', typeTravaux: 'ALTERNATEUR', prixAhmed: 50 },
  { id: 8, date: '2026-02-13', vehicule: 'PAIEMENT', typeTravaux: '', prixAhmed: -70 },
]

// ==================== TRANSACTIONS FOURNISSEURS ====================
export const mockTransactionsFournisseurs: TransactionFournisseur[] = [
  // Achats
  { id: 1, type: 'achat', date: '2026-01-06', montant: 230, fournisseur: 'WANES', vehicule: 'TOUAREG', pieces: 'NECESSAIRE INJECTEURS' },
  { id: 2, type: 'achat', date: '2026-01-07', montant: 90, fournisseur: 'WANES', pieces: 'HUILE MOTEUR' },
  { id: 3, type: 'achat', date: '2026-01-07', montant: 227, fournisseur: 'LOTFI MULTI SERVICE', vehicule: 'GOLF6', pieces: 'TENDEUR' },
  { id: 4, type: 'achat', date: '2026-01-07', montant: 850, fournisseur: 'WANES', vehicule: 'A4', pieces: 'FUSEE' },
  { id: 5, type: 'achat', date: '2026-01-07', montant: -100, fournisseur: 'LOTFI MULTI SERVICE' },
  { id: 6, type: 'achat', date: '2026-01-10', montant: 4980, fournisseur: 'WANES' },
  { id: 7, type: 'achat', date: '2026-01-10', montant: 2015.52, fournisseur: 'LE PROFESSIONEL' },
  { id: 8, type: 'achat', date: '2026-01-10', montant: 10000, fournisseur: 'AHMED MERCEDES' },
  { id: 9, type: 'achat', date: '2026-01-12', montant: 350, fournisseur: 'SOMACS' },
  { id: 10, type: 'achat', date: '2026-01-13', montant: 380, fournisseur: 'KARRAY' },
  // Revenues
  { id: 11, type: 'revenue', date: '2026-01-09', montant: 950, fournisseur: 'WANNES AUTO', vehicule: 'A4' },
  { id: 12, type: 'revenue', date: '2026-01-10', montant: 371, fournisseur: 'OTO ONE', vehicule: 'c5' },
  { id: 13, type: 'revenue', date: '2026-01-12', montant: 300, fournisseur: 'WANNES AUTO', vehicule: 'PASSAT' },
  { id: 14, type: 'revenue', date: '2026-01-13', montant: 227, fournisseur: 'MULTISERVICE', vehicule: 'GOLF6' },
  { id: 15, type: 'revenue', date: '2026-01-13', montant: 220, fournisseur: 'OTO ONE', vehicule: 'B9' },
  { id: 16, type: 'revenue', date: '2026-01-15', montant: 630, fournisseur: 'WANNES AUTO', vehicule: 'passat 2l' },
  { id: 17, type: 'revenue', date: '2026-01-16', montant: 1050, fournisseur: 'OTO ONE', vehicule: 'c5' },
  { id: 18, type: 'revenue', date: '2026-01-24', montant: 1353, fournisseur: 'MULTISERVICE', vehicule: '206' },
  { id: 19, type: 'revenue', date: '2026-01-27', montant: 1070, fournisseur: 'WANNES AUTO', vehicule: 'A4' },
  { id: 20, type: 'revenue', date: '2026-01-28', montant: 100, fournisseur: 'OTO ONE', vehicule: '406' },
  // Paiements
  { id: 21, type: 'paiement', date: '2026-01-12', montant: 295, fournisseur: 'ATEF AKROUT' },
  { id: 22, type: 'paiement', date: '2026-01-12', montant: 235, fournisseur: 'MULTISERVICE' },
  { id: 23, type: 'paiement', date: '2026-01-13', montant: 400, fournisseur: 'OTO ONE' },
  { id: 24, type: 'paiement', date: '2026-01-14', montant: 1000, fournisseur: 'WANNES AUTO' },
  { id: 25, type: 'paiement', date: '2026-01-30', montant: 2000, fournisseur: 'OTO ONE' },
  { id: 26, type: 'paiement', date: '2026-01-30', montant: 2000, fournisseur: 'MISTER PIECES AUTO' },
  { id: 27, type: 'paiement', date: '2026-01-30', montant: 1500, fournisseur: 'WANNES AUTO' },
  { id: 28, type: 'paiement', date: '2026-02-10', montant: 1500, fournisseur: 'WANNES AUTO' },
  { id: 29, type: 'paiement', date: '2026-02-10', montant: 1500, fournisseur: 'OTO ONE' },
  { id: 30, type: 'paiement', date: '2026-02-10', montant: 1055, fournisseur: 'MULTISERVICE' },
]
