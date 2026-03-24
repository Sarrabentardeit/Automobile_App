import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { OutilMohamed, OutilAhmed } from '@/types'

const MOHAMED_KEY = 'elmecano-outils-mohamed'
const AHMED_KEY = 'elmecano-outils-ahmed'

function loadMohamed(): OutilMohamed[] {
  try {
    const raw = localStorage.getItem(MOHAMED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadAhmed(): OutilAhmed[] {
  try {
    const raw = localStorage.getItem(AHMED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface OutilsContextValue {
  outilsMohamed: OutilMohamed[]
  outilsAhmed: OutilAhmed[]
  addOutilMohamed: (o: Omit<OutilMohamed, 'id'>) => void
  updateOutilMohamed: (id: number, o: Partial<OutilMohamed>) => void
  removeOutilMohamed: (id: number) => void
  addOutilAhmed: (o: Omit<OutilAhmed, 'id'>) => void
  updateOutilAhmed: (id: number, o: Partial<OutilAhmed>) => void
  removeOutilAhmed: (id: number) => void
}

const Context = createContext<OutilsContextValue | null>(null)

export function OutilsProvider({ children }: { children: ReactNode }) {
  const [outilsMohamed, setOutilsMohamed] = useState<OutilMohamed[]>(loadMohamed)
  const [outilsAhmed, setOutilsAhmed] = useState<OutilAhmed[]>(loadAhmed)
  useEffect(() => { localStorage.setItem(MOHAMED_KEY, JSON.stringify(outilsMohamed)) }, [outilsMohamed])
  useEffect(() => { localStorage.setItem(AHMED_KEY, JSON.stringify(outilsAhmed)) }, [outilsAhmed])

  const addOutilMohamed = useCallback((o: Omit<OutilMohamed, 'id'>) => {
    setOutilsMohamed(prev => [...prev, { ...o, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateOutilMohamed = useCallback((id: number, o: Partial<OutilMohamed>) => {
    setOutilsMohamed(prev => prev.map(x => (x.id === id ? { ...x, ...o } : x)))
  }, [])
  const removeOutilMohamed = useCallback((id: number) => setOutilsMohamed(prev => prev.filter(x => x.id !== id)), [])

  const addOutilAhmed = useCallback((o: Omit<OutilAhmed, 'id'>) => {
    setOutilsAhmed(prev => [...prev, { ...o, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateOutilAhmed = useCallback((id: number, o: Partial<OutilAhmed>) => {
    setOutilsAhmed(prev => prev.map(x => (x.id === id ? { ...x, ...o } : x)))
  }, [])
  const removeOutilAhmed = useCallback((id: number) => setOutilsAhmed(prev => prev.filter(x => x.id !== id)), [])

  return (
    <Context.Provider
      value={{
        outilsMohamed,
        outilsAhmed,
        addOutilMohamed,
        updateOutilMohamed,
        removeOutilMohamed,
        addOutilAhmed,
        updateOutilAhmed,
        removeOutilAhmed,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useOutils() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useOutils must be used within OutilsProvider')
  return ctx
}
