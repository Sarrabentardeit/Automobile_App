import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { useToast } from '@/contexts/ToastContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import type { CalendarAssignment } from '@/types'
import { useCalendar } from '@/contexts/CalendarContext'
import { useClients } from '@/contexts/ClientsContext'
import { useUsers } from '@/contexts/UsersContext'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Car,
  Briefcase,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

type DayCell = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

function getCalendarGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = (first.getDay() + 6) % 7
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const today = new Date()
  const todayStr =
    today.getFullYear() +
    '-' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(today.getDate()).padStart(2, '0')

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    let d: number, m: number, y: number, isCurrentMonth: boolean
    if (i < startWeekday) {
      d = prevMonthDays - startWeekday + 1 + i
      m = month === 1 ? 12 : month - 1
      y = month === 1 ? year - 1 : year
      isCurrentMonth = false
    } else if (i < startWeekday + daysInMonth) {
      d = i - startWeekday + 1
      m = month
      y = year
      isCurrentMonth = true
    } else {
      d = i - startWeekday - daysInMonth + 1
      m = month === 12 ? 1 : month + 1
      y = month === 12 ? year + 1 : year
      isCurrentMonth = false
    }
    const dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    cells.push({ date: dateStr, day: d, isCurrentMonth, isToday: dateStr === todayStr })
  }
  return cells
}

export default function CalendarPage() {
  const { user } = useAuth()
  const { users } = useUsers()
  const { vehicules } = useVehiculesContext()
  const today = new Date()
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const { assignments, addAssignment, updateAssignment, removeAssignment } = useCalendar()
  const { addNotification } = useNotifications()
  const { clients, addClient } = useClients()
  const toast = useToast()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newAssign, setNewAssign] = useState({
    date: '',
    memberName: '',
    vehicleId: null as number | null,
    vehicleLabel: '',
    description: '',
    clientName: '',
    clientTelephone: '',
    members: [] as string[],
  })

  const memberNames = useMemo(
    () =>
      users
        .filter(u => u.statut === 'actif' && (u.role === 'technicien' || u.role === 'responsable'))
        .map(u => u.nom_complet),
    [users]
  )
  const grid = useMemo(() => getCalendarGrid(viewDate.year, viewDate.month), [viewDate.year, viewDate.month])
  const title = `${MONTH_NAMES[viewDate.month - 1]} ${viewDate.year}`

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAssignment[]>()
    assignments.forEach(a => {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    })
    return map
  }, [assignments])

  const selectedDayAssignments = useMemo(
    () => (selectedDate ? (assignmentsByDate.get(selectedDate) ?? []) : []),
    [selectedDate, assignmentsByDate]
  )

  const goPrev = () => {
    if (viewDate.month === 1) setViewDate({ year: viewDate.year - 1, month: 12 })
    else setViewDate({ year: viewDate.year, month: viewDate.month - 1 })
  }
  const goNext = () => {
    if (viewDate.month === 12) setViewDate({ year: viewDate.year + 1, month: 1 })
    else setViewDate({ year: viewDate.year, month: viewDate.month + 1 })
  }
  const goToday = () => {
    const t = new Date()
    setViewDate({ year: t.getFullYear(), month: t.getMonth() + 1 })
  }

  const openDay = (date: string) => {
    setSelectedDate(date)
    setNewAssign(prev => ({ ...prev, date }))
  }

  const openAddForDate = (date: string) => {
    setSelectedDate(date)
    setEditingId(null)
    setNewAssign({
      date,
      memberName: memberNames[0] ?? '',
      vehicleId: vehicules[0]?.id ?? null,
      vehicleLabel: vehicules[0] ? `${vehicules[0].modele} (${vehicules[0].immatriculation})` : '',
      description: '',
      clientName: '',
      clientTelephone: '',
      members: [],
    })
    setShowAddModal(true)
  }

  const openEditAssignment = (a: CalendarAssignment) => {
    setSelectedDate(a.date)
    setEditingId(a.id)
    setNewAssign({
      date: a.date,
      memberName: a.memberName,
      vehicleId: a.vehicleId,
      vehicleLabel: a.vehicleLabel,
      description: a.description,
      clientName: a.clientName ?? '',
      clientTelephone: a.clientTelephone ?? '',
      members: [],
    })
    setShowAddModal(true)
  }

  const handleAddAssignment = async () => {
    if (!newAssign.date || !newAssign.memberName.trim()) return
    const memberName = newAssign.memberName.trim()
    const clientName = newAssign.clientName?.trim()
    const clientTelephone = newAssign.clientTelephone?.trim()

    if (clientName && clientTelephone) {
      const exists = clients.some(c => c.telephone === clientTelephone || c.nom.toLowerCase() === clientName.toLowerCase())
      if (!exists) {
        try {
          await addClient({ nom: clientName, telephone: clientTelephone })
          toast.success('Client enregistré dans la liste et affectation ajoutée')
        } catch {
          toast.error('Erreur lors de l\'ajout du client')
        }
      } else {
        toast.success('Affectation ajoutée (client déjà dans la liste)')
      }
    } else {
      toast.success('Affectation ajoutée avec succès')
    }

    const allMembers = [
      memberName,
      ...(newAssign.members ?? []),
    ]
      .map(n => n.trim())
      .filter(Boolean)

    const uniqueMembers = Array.from(new Set(allMembers.map(n => n.toLowerCase()))).map(lower =>
      allMembers.find(n => n.toLowerCase() === lower)!
    )

    if (editingId) {
      // mode édition : on met à jour uniquement cette affectation
      await updateAssignment(editingId, {
        date: newAssign.date,
        memberName,
        vehicleId: newAssign.vehicleId ?? null,
        vehicleLabel: newAssign.vehicleLabel.trim() || 'Véhicule',
        description: newAssign.description.trim(),
        clientName: clientName || undefined,
        clientTelephone: clientTelephone || undefined,
      })
    } else {
      // mode création : une affectation par membre sélectionné
      for (const name of uniqueMembers) {
        await addAssignment({
          date: newAssign.date,
          memberName: name,
          vehicleId: newAssign.vehicleId ?? null,
          vehicleLabel: newAssign.vehicleLabel.trim() || 'Véhicule',
          description: newAssign.description.trim(),
          clientName: clientName || undefined,
          clientTelephone: clientTelephone || undefined,
        })

        const tech = users.find(u => u.nom_complet.toLowerCase() === name.toLowerCase())
        if (tech) {
          addNotification(
            tech.id,
            `Vous avez été assigné au calendrier le ${new Date(newAssign.date).toLocaleDateString('fr-FR')} : ${
              newAssign.vehicleLabel.trim() || 'Véhicule'
            } - ${newAssign.description.trim() || 'Travail'}`
          )
        }
      }
    }
    setShowAddModal(false)
    setSelectedDate(newAssign.date)
    setEditingId(null)
  }

  const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === '' || val === '_autre') {
      setNewAssign(prev => ({ ...prev, vehicleId: null, vehicleLabel: val === '_autre' ? prev.vehicleLabel : '' }))
      return
    }
    const id = Number(val)
    const v = vehicules.find(v => v.id === id)
    if (v) setNewAssign(prev => ({ ...prev, vehicleId: id, vehicleLabel: `${v.modele} (${v.immatriculation})` }))
  }

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Calendrier
          </h1>
          <p className="text-sm text-gray-500 mt-1">Affectation travail · Équipe et véhicules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goToday}>
            Aujourd'hui
          </Button>
          <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button onClick={goPrev} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois précédent">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-gray-800 min-w-[160px] text-center">{title}</span>
            <button onClick={goNext} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois suivant">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grille du mois */}
        <div className="lg:col-span-2">
          <Card padding="none" className="overflow-hidden shadow-lg border border-gray-100">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr min-h-[380px]">
              {grid.map((cell, i) => {
                const dayAssignments = assignmentsByDate.get(cell.date) ?? []
                const isSelected = selectedDate === cell.date
                return (
                  <button
                    key={cell.date + i}
                    type="button"
                    onClick={() => openDay(cell.date)}
                    className={cn(
                      'relative flex flex-col items-stretch p-1.5 sm:p-2 border-b border-r border-gray-100 text-left min-h-[64px] sm:min-h-[88px] transition-colors',
                      cell.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/80',
                      isSelected && 'ring-2 ring-indigo-500 ring-inset',
                      (i % 7) === 6 && 'border-r-0',
                      i >= 35 && 'border-b-0'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums flex-shrink-0',
                        cell.isToday && 'bg-indigo-600 text-white',
                        cell.isCurrentMonth && !cell.isToday && 'text-gray-800',
                        !cell.isCurrentMonth && 'text-gray-400'
                      )}
                    >
                      {cell.day}
                    </span>
                    <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                      {dayAssignments.slice(0, 3).map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            openEditAssignment(a)
                          }}
                          className="w-full text-left text-[10px] sm:text-xs truncate px-1 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium hover:bg-indigo-100"
                          title={`${a.memberName} · ${a.vehicleLabel} · ${a.description}`}
                        >
                          {a.memberName} – {a.vehicleLabel}
                        </button>
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-[10px] text-gray-500 px-1">+{dayAssignments.length - 3}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Panneau du jour sélectionné */}
        <div className="lg:col-span-1">
          <Card padding="md" className="sticky top-4">
            {selectedDate ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">{formatDate(selectedDate)}</h3>
                  <Button size="sm" onClick={() => openAddForDate(selectedDate)} icon={<Plus className="w-4 h-4" />}>
                    Affecter
                  </Button>
                </div>
                {selectedDayAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">Aucune affectation ce jour.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedDayAssignments.map(a => (
                      <li
                        key={a.id}
                        className="flex gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            {a.memberName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {a.vehicleLabel}
                          </p>
                          {a.description && (
                            <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                              <Briefcase className="w-3 h-3 flex-shrink-0 mt-0.25" />
                              {a.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await removeAssignment(a.id)
                            if (ok) toast.success('Affectation supprimée')
                            else toast.error('Erreur lors de la suppression')
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Supprimer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Cliquez sur un jour pour voir les affectations.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Modal Ajouter affectation */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nouvelle affectation"
        subtitle={newAssign.date ? formatDate(newAssign.date) : ''}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={newAssign.date} onChange={e => setNewAssign(prev => ({ ...prev, date: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Membre équipe</label>
            <select
              value={newAssign.memberName}
              onChange={e => setNewAssign(prev => ({ ...prev, memberName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {memberNames.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Autres membres</label>
            <div className="flex flex-wrap gap-2">
              {memberNames.map(n => {
                const selected = newAssign.members.includes(n)
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setNewAssign(prev => {
                        const exists = prev.members.includes(n)
                        return {
                          ...prev,
                          members: exists
                            ? prev.members.filter(m => m !== n)
                            : [...prev.members, n],
                        }
                      })
                    }
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    )}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom client"
              placeholder="Ex. M. Ben Salem"
              value={newAssign.clientName}
              onChange={e => setNewAssign(prev => ({ ...prev, clientName: e.target.value }))}
            />
            <Input
              label="Numéro téléphone client"
              type="tel"
              placeholder="Ex. 58118291"
              value={newAssign.clientTelephone}
              onChange={e => setNewAssign(prev => ({ ...prev, clientTelephone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
            <select
              value={newAssign.vehicleId ?? '_autre'}
              onChange={handleVehicleSelect}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">— Aucun —</option>
              {vehicules.map(v => (
                <option key={v.id} value={v.id}>{v.modele} ({v.immatriculation})</option>
              ))}
              <option value="_autre">Autre (saisir ci-dessous)</option>
            </select>
            {newAssign.vehicleId === null && (
              <Input
                className="mt-2"
                placeholder="Modèle ou immat (ex. MEGANE 3, SKODA)"
                value={newAssign.vehicleLabel}
                onChange={e => setNewAssign(prev => ({ ...prev, vehicleLabel: e.target.value }))}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Travail à faire</label>
            <textarea
              value={newAssign.description}
              onChange={e => setNewAssign(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ex. JOINT CULASSE, DIAG, 4 AMORTISSEURS..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleAddAssignment} className="flex-1" disabled={!newAssign.memberName.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
