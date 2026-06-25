export type OutilAhmed = {
  id: number
  date: string
  vehicule: string
  typeTravaux: string
  prixGarage?: number
  prixAhmed: number
}

export type OutilAhmedInput = Omit<OutilAhmed, 'id'>
