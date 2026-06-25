export interface Fournisseur {
  id: number
  nom: string
  telephone: string
  email?: string
  adresse?: string
  contact?: string
  notes?: string
}

export type FournisseurInput = Omit<Fournisseur, 'id'>
