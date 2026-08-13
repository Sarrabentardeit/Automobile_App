import { createContext, useContext, useCallback, useEffect, type ReactNode } from 'react'
import type { CalendarAssignment } from '@/types'
import { useCalendarApi } from '@/hooks/useCalendarApi'

interface CalendarContextValue {
  assignments: CalendarAssignment[]
  loading: boolean
  addAssignment: (a: Omit<CalendarAssignment, 'id'>) => Promise<CalendarAssignment>
  updateAssignment: (id: number, a: Partial<CalendarAssignment>) => Promise<CalendarAssignment>
  removeAssignment: (id: number) => Promise<boolean>
  ensureLoaded: () => void
}

const Context = createContext<CalendarContextValue | null>(null)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const api = useCalendarApi()

  const addAssignment = useCallback(
    (a: Omit<CalendarAssignment, 'id'>) => api.addAssignment(a),
    [api]
  )
  const updateAssignment = useCallback(
    (id: number, a: Partial<CalendarAssignment>) => api.updateAssignment(id, a),
    [api]
  )
  const removeAssignment = useCallback(
    (id: number) => api.removeAssignment(id),
    [api]
  )
  return (
    <Context.Provider
      value={{
        assignments: api.assignments,
        loading: api.loading,
        addAssignment,
        updateAssignment,
        removeAssignment,
        ensureLoaded: api.ensureLoaded,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useCalendar() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  useEffect(() => {
    ctx.ensureLoaded()
  }, [ctx.ensureLoaded])
  return ctx
}
