import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { TeamMoneyDayEntry } from '@/types'
import { mockTeamMoneyDays } from '@/data/mock'

const STORAGE_KEY = 'elmecano-caisse'

function loadFromStorage(): TeamMoneyDayEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockTeamMoneyDays
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockTeamMoneyDays
  } catch {
    return mockTeamMoneyDays
  }
}

function saveToStorage(data: TeamMoneyDayEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface CaisseContextValue {
  days: TeamMoneyDayEntry[]
  setDays: React.Dispatch<React.SetStateAction<TeamMoneyDayEntry[]>>
}

const Context = createContext<CaisseContextValue | null>(null)

export function CaisseProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<TeamMoneyDayEntry[]>(loadFromStorage)
  useEffect(() => { saveToStorage(days) }, [days])
  return (
    <Context.Provider value={{ days, setDays }}>
      {children}
    </Context.Provider>
  )
}

export function useCaisse() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCaisse must be used within CaisseProvider')
  return ctx
}
