export type NoteCouleur = '' | 'amber' | 'sky' | 'emerald' | 'rose'

export const NOTE_COULEURS: { value: NoteCouleur; label: string; hex: string }[] = [
  { value: '', label: 'Aucune', hex: '#d1d5db' },
  { value: 'amber', label: 'Ambre', hex: '#f59e0b' },
  { value: 'sky', label: 'Bleu', hex: '#0ea5e9' },
  { value: 'emerald', label: 'Vert', hex: '#10b981' },
  { value: 'rose', label: 'Rose', hex: '#f43f5e' },
]

export type NotePersonnelle = {
  id: number
  userId: number
  titre: string
  contenu: string
  rappelAt: string | null
  couleur?: NoteCouleur | string
  epinglee: boolean
  faite: boolean
  createdAt: string
  updatedAt: string
}

export type NotePersonnelleInput = {
  titre?: string
  contenu?: string
  rappelAt?: string | null
  couleur?: NoteCouleur | string
  epinglee?: boolean
  faite?: boolean
}
