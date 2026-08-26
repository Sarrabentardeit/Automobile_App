export type OutilNouri = {
  id: number
  date: string
  vehicule: string
  typeTravaux: string
  prixGarage?: number
  prixNouri: number
}

export type OutilNouriInput = Omit<OutilNouri, 'id'>
