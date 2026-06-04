export type ContactImportant = {
  id: number
  nom: string
  numero: string
  categorie?: string
  notes?: string
}

export type ContactImportantInput = {
  nom: string
  numero: string
  categorie?: string
  notes?: string
}

export const CONTACT_CATEGORIES = [
  'Fournisseur',
  'Assurance',
  'Dépannage',
  'Prestataire',
  'Client',
  'Autre',
] as const
