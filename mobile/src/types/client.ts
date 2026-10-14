export type CarteVipAcces = 'standard' | 'advanced'

export interface CarteVip {
  numero: string
  debut: string
  fin: string
  acces: CarteVipAcces
}

export interface Client {
  id: number
  nom: string
  telephone: string
  email?: string
  adresse?: string
  notes?: string
  matriculeFiscale?: string
  carteVip?: CarteVip | null
}

export type ClientInput = Omit<Client, 'id'>
