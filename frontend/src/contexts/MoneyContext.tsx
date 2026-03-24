import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MoneyIn, MoneyOut } from '@/types'

const IN_KEY = 'elmecano-money-in'
const OUT_KEY = 'elmecano-money-out'

function loadIns(): MoneyIn[] {
  try {
    const raw = localStorage.getItem(IN_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadOuts(): MoneyOut[] {
  try {
    const raw = localStorage.getItem(OUT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface MoneyContextValue {
  ins: MoneyIn[]
  outs: MoneyOut[]
  addIn: (m: Omit<MoneyIn, 'id'>) => void
  updateIn: (id: number, m: Partial<MoneyIn>) => void
  removeIn: (id: number) => void
  addOut: (m: Omit<MoneyOut, 'id'>) => void
  updateOut: (id: number, m: Partial<MoneyOut>) => void
  removeOut: (id: number) => void
}

const Context = createContext<MoneyContextValue | null>(null)

export function MoneyProvider({ children }: { children: ReactNode }) {
  const [ins, setIns] = useState<MoneyIn[]>(loadIns)
  const [outs, setOuts] = useState<MoneyOut[]>(loadOuts)
  useEffect(() => { localStorage.setItem(IN_KEY, JSON.stringify(ins)) }, [ins])
  useEffect(() => { localStorage.setItem(OUT_KEY, JSON.stringify(outs)) }, [outs])

  const addIn = useCallback((m: Omit<MoneyIn, 'id'>) => {
    setIns(prev => [...prev, { ...m, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateIn = useCallback((id: number, m: Partial<MoneyIn>) => {
    setIns(prev => prev.map(x => (x.id === id ? { ...x, ...m } : x)))
  }, [])
  const removeIn = useCallback((id: number) => setIns(prev => prev.filter(x => x.id !== id)), [])

  const addOut = useCallback((m: Omit<MoneyOut, 'id'>) => {
    setOuts(prev => [...prev, { ...m, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateOut = useCallback((id: number, m: Partial<MoneyOut>) => {
    setOuts(prev => prev.map(x => (x.id === id ? { ...x, ...m } : x)))
  }, [])
  const removeOut = useCallback((id: number) => setOuts(prev => prev.filter(x => x.id !== id)), [])

  return (
    <Context.Provider value={{ ins, outs, addIn, updateIn, removeIn, addOut, updateOut, removeOut }}>
      {children}
    </Context.Provider>
  )
}

export function useMoney() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useMoney must be used within MoneyProvider')
  return ctx
}
