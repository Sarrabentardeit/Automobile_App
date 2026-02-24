import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ContactImportant } from '@/types'
import { mockContactsImportants } from '@/data/mock'

const STORAGE_KEY = 'elmecano-contacts-importants'

function loadFromStorage(): ContactImportant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return mockContactsImportants
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : mockContactsImportants
  } catch {
    return mockContactsImportants
  }
}

function saveToStorage(data: ContactImportant[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

interface ContactsImportantsContextValue {
  contacts: ContactImportant[]
  addContact: (c: Omit<ContactImportant, 'id'>) => void
  updateContact: (id: number, c: Partial<ContactImportant>) => void
  removeContact: (id: number) => void
}

const Context = createContext<ContactsImportantsContextValue | null>(null)

export function ContactsImportantsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<ContactImportant[]>(loadFromStorage)
  useEffect(() => { saveToStorage(contacts) }, [contacts])
  const addContact = useCallback((c: Omit<ContactImportant, 'id'>) => {
    setContacts(prev => [...prev, { ...c, id: Math.max(0, ...prev.map(x => x.id)) + 1 }])
  }, [])
  const updateContact = useCallback((id: number, c: Partial<ContactImportant>) => {
    setContacts(prev => prev.map(x => (x.id === id ? { ...x, ...c } : x)))
  }, [])
  const removeContact = useCallback((id: number) => {
    setContacts(prev => prev.filter(x => x.id !== id))
  }, [])
  return (
    <Context.Provider value={{ contacts, addContact, updateContact, removeContact }}>
      {children}
    </Context.Provider>
  )
}

export function useContactsImportants() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useContactsImportants must be used within ContactsImportantsProvider')
  return ctx
}
