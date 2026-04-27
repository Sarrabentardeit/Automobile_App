import { useCallback } from 'react'
import { apiFetch, getApiUrl } from '@/lib/api'
import type { VehiculeSuivi, VehiculeSuiviInput } from '../types'

export function useSuivisApi(vehiculeId: number, getAccessToken: () => string | null) {
  const list = useCallback(async (): Promise<VehiculeSuivi[]> => {
    const token = getAccessToken()
    if (!token) return []
    const res = await apiFetch<VehiculeSuivi[]>(`/vehicules/${vehiculeId}/suivis`, { token })
    return Array.isArray(res) ? res : []
  }, [vehiculeId, getAccessToken])

  const create = useCallback(async (data: VehiculeSuiviInput): Promise<VehiculeSuivi> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non connecté')
    return apiFetch<VehiculeSuivi>(`/vehicules/${vehiculeId}/suivis`, {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    })
  }, [vehiculeId, getAccessToken])

  const update = useCallback(async (suiviId: number, data: VehiculeSuiviInput): Promise<VehiculeSuivi> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non connecté')
    return apiFetch<VehiculeSuivi>(`/vehicules/${vehiculeId}/suivis/${suiviId}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    })
  }, [vehiculeId, getAccessToken])

  const remove = useCallback(async (suiviId: number): Promise<void> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non connecté')
    const url = getApiUrl(`/vehicules/${vehiculeId}/suivis/${suiviId}`)
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error((err as { error?: string }).error ?? res.statusText)
    }
  }, [vehiculeId, getAccessToken])

  const downloadExcel = useCallback(async (suiviId: number, numero: string): Promise<void> => {
    const token = getAccessToken()
    if (!token) throw new Error('Non connecté')
    const url = getApiUrl(`/vehicules/${vehiculeId}/suivis/${suiviId}/excel`)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('Erreur export Excel')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${numero || `suivi-${suiviId}`}.xlsx`
    a.click()
  }, [vehiculeId, getAccessToken])

  return { list, create, update, remove, downloadExcel }
}
