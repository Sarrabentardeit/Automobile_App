import { apiFetch } from './api'
import { apiUrl } from './config'
import type {
  EtatVehicule,
  HistoriqueEtat,
  OrdreReparation,
  OrdreReparationInput,
  Vehicule,
  VehiculeDepenseLigne,
  VehiculeFicheFinanciere,
  VehiculeFormData,
  VehiculeImage,
  VehiculeImageUploadInput,
  VehiculeSuivi,
  VehiculeSuiviInput,
} from '../types/vehicule'

export function mediaUrl(urlPath: string): string {
  if (urlPath.startsWith('http')) return urlPath
  const p = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath
  return apiUrl(p)
}

export function fetchVehicule(token: string, id: number): Promise<Vehicule> {
  return apiFetch<Vehicule>(`/vehicules/${id}`, { token })
}

export function createVehicule(token: string, data: VehiculeFormData): Promise<Vehicule> {
  return apiFetch<Vehicule>('/vehicules', {
    method: 'POST',
    token,
    body: {
      immatriculation: data.immatriculation,
      modele: data.modele,
      type: data.type,
      etat_initial: data.etat_initial,
      date_entree: data.date_entree,
      defaut: data.defaut,
      technicien_id: data.technicien_id,
      responsable_id: data.responsable_id,
      technicien_ids: data.technicien_ids,
      responsable_ids: data.responsable_ids,
      client_telephone: data.client_telephone,
      notes: data.notes,
      service_type: data.service_type,
    },
  })
}

export function updateVehicule(
  token: string,
  id: number,
  data: Partial<VehiculeFormData>
): Promise<Vehicule> {
  return apiFetch<Vehicule>(`/vehicules/${id}`, { method: 'PUT', token, body: data })
}

export function deleteVehicule(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/vehicules/${id}`, { method: 'DELETE', token })
}

export function fetchHistorique(token: string, id: number): Promise<HistoriqueEtat[]> {
  return apiFetch<HistoriqueEtat[]>(`/vehicules/${id}/historique`, { token })
}

export function fetchOrdres(token: string, id: number): Promise<OrdreReparation[]> {
  return apiFetch<OrdreReparation[]>(`/vehicules/${id}/ordres-reparation`, { token })
}

export function createOrdre(
  token: string,
  vehiculeId: number,
  body: OrdreReparationInput
): Promise<OrdreReparation> {
  return apiFetch<OrdreReparation>(`/vehicules/${vehiculeId}/ordres-reparation`, {
    method: 'POST',
    token,
    body,
  })
}

export function updateOrdre(
  token: string,
  vehiculeId: number,
  ordreId: number,
  body: OrdreReparationInput
): Promise<OrdreReparation> {
  return apiFetch<OrdreReparation>(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}`, {
    method: 'PUT',
    token,
    body,
  })
}

export function deleteOrdre(token: string, vehiculeId: number, ordreId: number): Promise<void> {
  return apiFetch<void>(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}`, {
    method: 'DELETE',
    token,
  })
}

export function fetchSuivis(token: string, id: number): Promise<VehiculeSuivi[]> {
  return apiFetch<VehiculeSuivi[]>(`/vehicules/${id}/suivis`, { token })
}

export function createSuivi(
  token: string,
  vehiculeId: number,
  body: VehiculeSuiviInput
): Promise<VehiculeSuivi> {
  return apiFetch<VehiculeSuivi>(`/vehicules/${vehiculeId}/suivis`, {
    method: 'POST',
    token,
    body,
  })
}

export function updateSuivi(
  token: string,
  vehiculeId: number,
  suiviId: number,
  body: VehiculeSuiviInput
): Promise<VehiculeSuivi> {
  return apiFetch<VehiculeSuivi>(`/vehicules/${vehiculeId}/suivis/${suiviId}`, {
    method: 'PUT',
    token,
    body,
  })
}

export function deleteSuivi(token: string, vehiculeId: number, suiviId: number): Promise<void> {
  return apiFetch<void>(`/vehicules/${vehiculeId}/suivis/${suiviId}`, {
    method: 'DELETE',
    token,
  })
}

export function fetchImages(token: string, id: number): Promise<VehiculeImage[]> {
  return apiFetch<VehiculeImage[]>(`/vehicules/${id}/images`, { token })
}

export function uploadVehiculeImage(
  token: string,
  vehiculeId: number,
  image: VehiculeImageUploadInput
): Promise<VehiculeImage> {
  return apiFetch<VehiculeImage>(`/vehicules/${vehiculeId}/images`, {
    method: 'POST',
    token,
    body: {
      dataUrl: image.dataUrl,
      fileName: image.fileName,
      category: image.category,
      note: image.note,
    },
  })
}

export function deleteVehiculeImage(
  token: string,
  vehiculeId: number,
  imageId: number
): Promise<void> {
  return apiFetch<void>(`/vehicules/${vehiculeId}/images/${imageId}`, {
    method: 'DELETE',
    token,
  })
}

export function changeEtat(
  token: string,
  id: number,
  body: { nouvel_etat: EtatVehicule; commentaire?: string; pieces_utilisees?: string }
): Promise<Vehicule> {
  return apiFetch<Vehicule>(`/vehicules/${id}/changer-etat`, {
    method: 'POST',
    token,
    body,
  })
}

export type AppUser = {
  id: number
  nom_complet: string
  role: string
  statut: string
}

export function fetchUsers(token: string): Promise<AppUser[]> {
  return apiFetch<
    Array<{ id: number; nom_complet: string; role?: string; statut?: string }>
  >('/users', { token }).then((list) =>
    list.map((u) => ({
      id: u.id,
      nom_complet: u.nom_complet,
      role: u.role ?? 'technicien',
      statut: u.statut ?? 'actif',
    }))
  )
}

export function fetchAssignableUsers(token: string): Promise<AppUser[]> {
  return fetchUsers(token).then((list) =>
    list.filter(
      (u) =>
        u.statut === 'actif' &&
        (u.role === 'admin' || u.role === 'responsable' || u.role === 'technicien')
    )
  )
}

export function userName(users: AppUser[], id: number | null | undefined): string {
  if (id == null) return '—'
  return users.find((u) => u.id === id)?.nom_complet ?? `ID ${id}`
}

export function fetchFicheFinanciere(
  token: string,
  vehiculeId: number
): Promise<VehiculeFicheFinanciere> {
  return apiFetch<VehiculeFicheFinanciere>(`/vehicules/${vehiculeId}/fiche-financiere`, {
    token,
  })
}

export function patchFicheFinanciereAvance(
  token: string,
  vehiculeId: number,
  avance_client: number
): Promise<VehiculeFicheFinanciere> {
  return apiFetch<VehiculeFicheFinanciere>(`/vehicules/${vehiculeId}/fiche-financiere`, {
    method: 'PATCH',
    token,
    body: { avance_client },
  })
}

export function createDepense(
  token: string,
  vehiculeId: number,
  libelle: string,
  montant: number
): Promise<VehiculeDepenseLigne> {
  return apiFetch<VehiculeDepenseLigne>(`/vehicules/${vehiculeId}/depenses`, {
    method: 'POST',
    token,
    body: { libelle, montant },
  })
}

export function updateDepense(
  token: string,
  vehiculeId: number,
  depenseId: number,
  libelle: string,
  montant: number
): Promise<VehiculeDepenseLigne> {
  return apiFetch<VehiculeDepenseLigne>(`/vehicules/${vehiculeId}/depenses/${depenseId}`, {
    method: 'PUT',
    token,
    body: { libelle, montant },
  })
}

export function deleteDepense(
  token: string,
  vehiculeId: number,
  depenseId: number
): Promise<void> {
  return apiFetch<void>(`/vehicules/${vehiculeId}/depenses/${depenseId}`, {
    method: 'DELETE',
    token,
  })
}

export function createDepenseFromStock(
  token: string,
  vehiculeId: number,
  productId: number,
  quantite: number
): Promise<VehiculeDepenseLigne> {
  return apiFetch<VehiculeDepenseLigne>(`/vehicules/${vehiculeId}/depenses/stock`, {
    method: 'POST',
    token,
    body: { productId, quantite },
  })
}

export type StockProduit = {
  id: number
  nom: string
  quantite: number
  prix_vente?: number | null
  categorie?: string
}

export function fetchStockProduits(token: string): Promise<StockProduit[]> {
  return apiFetch<StockProduit[]>('/stock/produits', { token })
}
