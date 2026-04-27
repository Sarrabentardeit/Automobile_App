import { useCallback, useMemo } from 'react'
import { apiFetch, getApiUrl } from '@/lib/api'
import type { OrdreReparation, OrdreReparationInput } from '@/types'

export function useOrdreReparationsApi(getToken: () => string | null) {
  const list = useCallback(
    async (vehiculeId: number): Promise<OrdreReparation[]> => {
      const token = getToken()
      if (!token) return []
      const res = await apiFetch<OrdreReparation[]>(`/vehicules/${vehiculeId}/ordres-reparation`, { token })
      return Array.isArray(res) ? res : []
    },
    [getToken]
  )

  const getOne = useCallback(
    async (vehiculeId: number, ordreId: number): Promise<OrdreReparation | null> => {
      const token = getToken()
      if (!token) return null
      try {
        return await apiFetch<OrdreReparation>(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}`, { token })
      } catch {
        return null
      }
    },
    [getToken]
  )

  const create = useCallback(
    async (vehiculeId: number, body: OrdreReparationInput): Promise<OrdreReparation> => {
      const token = getToken()
      if (!token) throw new Error('Non connecté')
      return apiFetch<OrdreReparation>(`/vehicules/${vehiculeId}/ordres-reparation`, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      })
    },
    [getToken]
  )

  const update = useCallback(
    async (vehiculeId: number, ordreId: number, body: Partial<OrdreReparationInput>): Promise<OrdreReparation> => {
      const token = getToken()
      if (!token) throw new Error('Non connecté')
      return apiFetch<OrdreReparation>(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(body),
      })
    },
    [getToken]
  )

  const remove = useCallback(
    async (vehiculeId: number, ordreId: number): Promise<void> => {
      const token = getToken()
      if (!token) throw new Error('Non connecté')
      await apiFetch(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}`, { method: 'DELETE', token })
    },
    [getToken]
  )

  const downloadExcel = useCallback(
    async (vehiculeId: number, ordreId: number, numero: string): Promise<void> => {
      const token = getToken()
      if (!token) throw new Error('Non connecté')
      const url = getApiUrl(`/vehicules/${vehiculeId}/ordres-reparation/${ordreId}/excel`)
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!resp.ok) throw new Error(`Erreur ${resp.status}`)
      const blob = await resp.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `${numero || `OR-${ordreId}`}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
    },
    [getToken]
  )

  return useMemo(
    () => ({ list, getOne, create, update, remove, downloadExcel }),
    [list, getOne, create, update, remove, downloadExcel]
  )
}
