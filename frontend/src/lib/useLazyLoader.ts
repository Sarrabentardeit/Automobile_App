import { useCallback, useEffect, useRef } from 'react'

/**
 * Charge les données au premier besoin (pas au login global).
 * Appeler `ensureLoaded()` depuis le hook consommateur (`useX`).
 */
export function useLazyLoader(isAuthenticated: boolean, load: () => void | Promise<void>) {
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) startedRef.current = false
  }, [isAuthenticated])

  return useCallback(() => {
    if (!isAuthenticated || startedRef.current) return
    startedRef.current = true
    void load()
  }, [isAuthenticated, load])
}
