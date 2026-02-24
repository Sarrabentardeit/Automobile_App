import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { CalendarAssignment } from '@/types'
import { mockCalendarAssignments } from '@/data/mock'

const STORAGE_KEY = 'elmecano-calendar'

function loadFromStorage(): CalendarAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockCalendarAssignments
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockCalendarAssignments
  } catch {
    return mockCalendarAssignments
  }
}

function saveToStorage(data: CalendarAssignment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface CalendarContextValue {
  assignments: CalendarAssignment[]
  addAssignment: (a: Omit<CalendarAssignment, 'id'>) => void
  updateAssignment: (id: number, a: Partial<CalendarAssignment>) => void
  removeAssignment: (id: number) => void
}

const Context = createContext<CalendarContextValue | null>(null)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<CalendarAssignment[]>(loadFromStorage)
  useEffect(() => { saveToStorage(assignments) }, [assignments])
  const addAssignment = useCallback((a: Omit<CalendarAssignment, 'id'>) => {
    setAssignments(prev => [...prev, { ...a, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateAssignment = useCallback((id: number, a: Partial<CalendarAssignment>) => {
    setAssignments(prev => prev.map(x => (x.id === id ? { ...x, ...a } : x)))
  }, [])
  const removeAssignment = useCallback((id: number) => {
    setAssignments(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Context.Provider value={{ assignments, addAssignment, updateAssignment, removeAssignment }}>
      {children}
    </Context.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  return ctx
}
