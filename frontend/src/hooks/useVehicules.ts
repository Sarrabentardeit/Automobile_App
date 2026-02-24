import { useState, useCallback, useEffect } from 'react'
import type { Vehicule, VehiculeFormData, HistoriqueEtat, EtatVehicule } from '@/types'
import { TRANSITIONS_AUTORISEES } from '@/types'
import { initialVehicules, initialHistorique } from '@/data/mock'

const VEHS_KEY = 'elmecano-vehicules'
const HIST_KEY = 'elmecano-historique'

function loadVehicules(): Vehicule[] {
  try {
    const raw = localStorage.getItem(VEHS_KEY)
    if (!raw) return initialVehicules
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initialVehicules
  } catch { return initialVehicules }
}

function loadHistorique(): HistoriqueEtat[] {
  try {
    const raw = localStorage.getItem(HIST_KEY)
    if (!raw) return initialHistorique
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initialHistorique
  } catch { return initialHistorique }
}

export function useVehicules() {
  const [vehicules, setVehicules] = useState<Vehicule[]>(loadVehicules)
  const [historique, setHistorique] = useState<HistoriqueEtat[]>(loadHistorique)

  useEffect(() => { localStorage.setItem(VEHS_KEY, JSON.stringify(vehicules)) }, [vehicules])
  useEffect(() => { localStorage.setItem(HIST_KEY, JSON.stringify(historique)) }, [historique])

  const addVehicule = useCallback((data: VehiculeFormData, userId: number, userName: string) => {
    const maxVId = Math.max(0, ...vehicules.map(v => v.id))
    const id = maxVId + 1
    const now = new Date().toISOString()
    const newV: Vehicule = {
      id,
      immatriculation: data.immatriculation,
      modele: data.modele,
      type: data.type,
      etat_actuel: data.etat_initial,
      technicien_id: data.technicien_id,
      responsable_id: data.responsable_id,
      defaut: data.defaut,
      client_telephone: data.client_telephone,
      date_entree: data.date_entree,
      date_sortie: null,
      notes: data.notes,
      derniere_mise_a_jour: now,
    }
    setVehicules(prev => [newV, ...prev])

    const maxHId = Math.max(0, ...historique.map(h => h.id))
    const hId = maxHId + 1
    setHistorique(prev => [...prev, {
      id: hId, vehicule_id: id,
      etat_precedent: null, etat_nouveau: data.etat_initial,
      date_changement: now, utilisateur_id: userId, utilisateur_nom: userName,
      commentaire: `Réception du véhicule - ${data.defaut}`,
      duree_etat_precedent_minutes: null, pieces_utilisees: '',
    }])

    return newV
  }, [vehicules, historique])

  const editVehicule = useCallback((id: number, data: Partial<VehiculeFormData>) => {
    setVehicules(prev => prev.map(v => {
      if (v.id !== id) return v
      return {
        ...v,
        modele: data.modele ?? v.modele,
        immatriculation: data.immatriculation ?? v.immatriculation,
        type: data.type ?? v.type,
        defaut: data.defaut ?? v.defaut,
        technicien_id: data.technicien_id !== undefined ? data.technicien_id : v.technicien_id,
        responsable_id: data.responsable_id !== undefined ? data.responsable_id : v.responsable_id,
        client_telephone: data.client_telephone ?? v.client_telephone,
        notes: data.notes ?? v.notes,
        date_entree: data.date_entree ?? v.date_entree,
        derniere_mise_a_jour: new Date().toISOString(),
      }
    }))
  }, [])

  const changeEtat = useCallback((
    vehiculeId: number,
    nouvelEtat: EtatVehicule,
    userId: number,
    userName: string,
    commentaire: string,
    piecesUtilisees: string,
  ) => {
    const vehicule = vehicules.find(v => v.id === vehiculeId)
    if (!vehicule) return false

    const allowed = TRANSITIONS_AUTORISEES[vehicule.etat_actuel]
    if (!allowed.includes(nouvelEtat)) return false

    const now = new Date().toISOString()
    const lastChange = historique
      .filter(h => h.vehicule_id === vehiculeId)
      .sort((a, b) => new Date(b.date_changement).getTime() - new Date(a.date_changement).getTime())[0]

    let duree: number | null = null
    if (lastChange) {
      duree = Math.round((new Date(now).getTime() - new Date(lastChange.date_changement).getTime()) / 60000)
    }

    setVehicules(prev => prev.map(v =>
      v.id === vehiculeId
        ? { ...v, etat_actuel: nouvelEtat, derniere_mise_a_jour: now, date_sortie: nouvelEtat === 'vert' ? now.split('T')[0] : v.date_sortie }
        : v
    ))

    const maxHId = Math.max(0, ...historique.map(h => h.id))
    setHistorique(prev => [...prev, {
      id: maxHId + 1, vehicule_id: vehiculeId,
      etat_precedent: vehicule.etat_actuel, etat_nouveau: nouvelEtat,
      date_changement: now, utilisateur_id: userId, utilisateur_nom: userName,
      commentaire, duree_etat_precedent_minutes: duree, pieces_utilisees: piecesUtilisees,
    }])

    return true
  }, [vehicules, historique])

  const getHistorique = useCallback((vehiculeId: number) => {
    return historique
      .filter(h => h.vehicule_id === vehiculeId)
      .sort((a, b) => new Date(a.date_changement).getTime() - new Date(b.date_changement).getTime())
  }, [historique])

  const getVehicule = useCallback((id: number) => {
    return vehicules.find(v => v.id === id) ?? null
  }, [vehicules])

  return { vehicules, historique, addVehicule, editVehicule, changeEtat, getHistorique, getVehicule }
}
