export type MouvementStock = {
  id: number
  productId: number
  date: string
  produitNom: string
  quantite: number
  type: 'entree' | 'sortie'
  origine: 'achat' | 'facture'
  reference?: string
}
