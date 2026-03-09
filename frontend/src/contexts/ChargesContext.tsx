import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ChargeMensuelle } from '@/types'

const STORAGE_KEY = 'elmecano-charges'

const DEFAULT_CHARGES: ChargeMensuelle[] = [
  { id: 1, name: 'Loyer Garage', amount: 2850 },
  { id: 2, name: 'Loyer Agence', amount: 1800 },
  { id: 3, name: 'BIAT', amount: 900 },
  { id: 4, name: 'BTS', amount: 300 },
  { id: 5, name: 'Crédit Tante', amount: 1000 },
  { id: 6, name: 'Orange', amount: 200 },
  { id: 7, name: 'Telecom', amount: 50 },
  { id: 8, name: 'Déclaration', amount: 2500 },
  { id: 9, name: 'CNSS', amount: 2700 },
  { id: 10, name: 'STEGE', amount: 200 },
  { id: 11, name: 'SONEDE', amount: 100 },
  { id: 12, name: 'Chokri', amount: 1000 },
  { id: 13, name: 'Comptable', amount: 1350 },
]

function loadFromStorage(): ChargeMensuelle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CHARGES
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CHARGES
  } catch {
    return DEFAULT_CHARGES
  }
}

function saveToStorage(data: ChargeMensuelle[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface ChargesContextValue {
  charges: ChargeMensuelle[]
  totalCharges: number
  addCharge: (c: Omit<ChargeMensuelle, 'id'>) => void
  updateCharge: (id: number, c: Partial<ChargeMensuelle>) => void
  removeCharge: (id: number) => void
}

const Context = createContext<ChargesContextValue | null>(null)

export function ChargesProvider({ children }: { children: ReactNode }) {
  const [charges, setCharges] = useState<ChargeMensuelle[]>(loadFromStorage)
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0)

  useEffect(() => {
    saveToStorage(charges)
  }, [charges])

  const addCharge = useCallback((c: Omit<ChargeMensuelle, 'id'>) => {
    setCharges(prev => [...prev, { ...c, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])

  const updateCharge = useCallback((id: number, c: Partial<ChargeMensuelle>) => {
    setCharges(prev => prev.map(x => (x.id === id ? { ...x, ...c } : x)))
  }, [])

  const removeCharge = useCallback((id: number) => {
    setCharges(prev => prev.filter(x => x.id !== id))
  }, [])

  return (
    <Context.Provider value={{ charges, totalCharges, addCharge, updateCharge, removeCharge }}>
      {children}
    </Context.Provider>
  )
}

export function useCharges() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCharges must be used within ChargesProvider')
  return ctx
}
