export interface Client {
  id: number
  nom: string
  telephone: string
  email?: string
  adresse?: string
  notes?: string
  matriculeFiscale?: string
}

export type ClientInput = Omit<Client, 'id'>
