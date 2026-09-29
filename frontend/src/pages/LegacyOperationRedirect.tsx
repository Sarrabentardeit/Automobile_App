import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function LegacyOperationRedirect({ cle }: { cle: string }) {
  const { getAccessToken } = useAuth()
  const [id, setId] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    apiFetch<{ id: number }>(`/operations/by-cle/${cle}`, { token })
      .then((row) => setId(row.id))
      .catch(() => setFailed(true))
  }, [cle, getAccessToken])

  if (failed) return <Navigate to="/operations" replace />
  if (id == null) return null
  return <Navigate to={`/operations/${id}`} replace />
}
