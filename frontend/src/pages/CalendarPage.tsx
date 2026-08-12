import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { useToast } from '@/contexts/ToastContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import type { CalendarAssignment, CalendarRdvStatut } from '@/types'
import { CALENDAR_RDV_STATUT_CONFIG, CALENDAR_RDV_STATUTS } from '@/types'
import { useCalendar } from '@/contexts/CalendarContext'
import { useClients } from '@/contexts/ClientsContext'
import { useUsers } from '@/contexts/UsersContext'
import { cn, formatDate } from '@/lib/utils'
import { BRAND_OPTIONS, buildModeleLabel, parseMarqueModele } from '@/lib/vehiculeBrands'
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
} from 'lucide-react'

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
  const { vehicules, fetchVehicules } = useVehiculesContext()
  const today = new Date()
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const { assignments, addAssignment, updateAssignment } = useCalendar()
  const { addNotification } = useNotifications()
  const { clients, addClient } = useClients()
  const toast = useToast()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  /** Filtre KPI : null = tout · today · statut RDV */
  const [kpiFocus, setKpiFocus] = useState<'all' | 'today' | CalendarRdvStatut>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newAssign, setNewAssign] = useState({
    date: '',
    memberName: '',
    vehicleId: null as number | null,
    vehicleLabel: '',
    vehicleMarque: '',
    vehicleModele: '',
    description: '',
    clientName: '',
    clientTelephone: '',
    members: [] as string[],
    statut: 'prevu' as CalendarRdvStatut,
  })
  const canManageCalendar = user?.role !== 'technicien'

  const rdvChipClass = (statut?: CalendarRdvStatut) => {
    const s = statut && CALENDAR_RDV_STATUT_CONFIG[statut] ? statut : 'prevu'
    const cfg = CALENDAR_RDV_STATUT_CONFIG[s]
    return cn('w-full text-left text-[10px] sm:text-xs truncate px-1 py-0.5 rounded font-medium border', cfg.bg, cfg.text, cfg.border)
  }

  const memberNames = useMemo(
    () =>
      users
        .filter(u => u.statut === 'actif' && (u.role === 'technicien' || u.role === 'responsable'))
        .map(u => u.nom_complet),
    [users]
  )
  const grid = useMemo(() => getCalendarGrid(viewDate.year, viewDate.month), [viewDate.year, viewDate.month])
  const title = `${MONTH_NAMES[viewDate.month - 1]} ${viewDate.year}`
  const monthPrefix = `${viewDate.year}-${String(viewDate.month).padStart(2, '0')}`
  const todayStr = useMemo(() => {
    const t = new Date()
    return (
      t.getFullYear() +
      '-' +
      String(t.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(t.getDate()).padStart(2, '0')
    )
  }, [])

  const monthAssignments = useMemo(
    () => assignments.filter(a => a.date.startsWith(monthPrefix)),
    [assignments, monthPrefix]
  )

  const kpiStats = useMemo(() => {
    const byStatut = (s: CalendarRdvStatut) =>
      monthAssignments.filter(a => (a.statut ?? 'prevu') === s).length
    return {
      total: monthAssignments.length,
      today: assignments.filter(a => a.date === todayStr).length,
      prevu: byStatut('prevu'),
      honore: byStatut('honore'),
      non_honore: byStatut('non_honore'),
      annule: byStatut('annule'),
    }
  }, [monthAssignments, assignments, todayStr])

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAssignment[]>()
    assignments.forEach(a => {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    })
    return map
  }, [assignments])

  const selectedDayAssignments = useMemo(() => {
    const list = selectedDate ? (assignmentsByDate.get(selectedDate) ?? []) : []
    if (kpiFocus === 'all' || kpiFocus === 'today') return list
    return list.filter(a => (a.statut ?? 'prevu') === kpiFocus)
  }, [selectedDate, assignmentsByDate, kpiFocus])

  const kpiListAssignments = useMemo(() => {
    if (kpiFocus === 'all') return []
    if (kpiFocus === 'today') return assignments.filter(a => a.date === todayStr)
    return monthAssignments.filter(a => (a.statut ?? 'prevu') === kpiFocus)
  }, [kpiFocus, assignments, todayStr, monthAssignments])

  const goPrev = () => {
    if (viewDate.month === 1) setViewDate({ year: viewDate.year - 1, month: 12 })
    else setViewDate({ year: viewDate.year, month: viewDate.month - 1 })
  }
  const goNext = () => {
    if (viewDate.month === 12) setViewDate({ year: viewDate.year + 1, month: 1 })
    else setViewDate({ year: viewDate.year, month: viewDate.month + 1 })
  }

  /** Sélectionne le jour et affiche toutes les affectations dans le panneau (sans limite). */
  const openDay = (date: string) => {
    setSelectedDate(date)
    setKpiFocus('all')
    setNewAssign(prev => ({ ...prev, date }))
  }

  const selectKpi = (focus: 'all' | 'today' | CalendarRdvStatut) => {
    setKpiFocus(prev => (prev === focus ? 'all' : focus))
    if (focus === 'today') {
      const t = new Date()
      setViewDate({ year: t.getFullYear(), month: t.getMonth() + 1 })
      setSelectedDate(todayStr)
    }
  }

  const openAddForDate = (date: string) => {
    setSelectedDate(date)
    setEditingId(null)
    setNewAssign({
      date,
      memberName: memberNames[0] ?? '',
      vehicleId: null,
      vehicleLabel: '',
      vehicleMarque: '',
      vehicleModele: '',
      description: '',
      clientName: '',
      clientTelephone: '',
      members: [],
      statut: 'prevu',
    })
    setShowAddModal(true)
  }

  const openEditAssignment = (a: CalendarAssignment) => {
    setSelectedDate(a.date)
    setEditingId(a.id)
    const parsed = a.vehicleId == null ? parseMarqueModele(a.vehicleLabel) : { marque: '', modele: '' }
    setNewAssign({
      date: a.date,
      memberName: a.memberName,
      vehicleId: a.vehicleId,
      vehicleLabel: a.vehicleLabel,
      vehicleMarque: parsed.marque,
      vehicleModele: parsed.modele,
      description: a.description,
      clientName: a.clientName ?? '',
      clientTelephone: a.clientTelephone ?? '',
      members: [],
      statut: a.statut ?? 'prevu',
    })
    setShowAddModal(true)
  }

  const setAssignmentStatut = async (a: CalendarAssignment, statut: CalendarRdvStatut) => {
    try {
      await updateAssignment(a.id, { statut })
      if (statut === 'honore') {
        toast.success('RDV honoré — véhicule ajouté automatiquement')
        void fetchVehicules()
      } else if (statut === 'annule') {
        toast.success('RDV annulé (conservé pour les stats)')
      } else if (statut === 'non_honore') {
        toast.success('Marqué non honoré (pas d’appel / absent)')
      } else {
        toast.success('Statut mis à jour')
      }
    } catch {
      toast.error('Impossible de changer le statut')
    }
  }

  const handleAddAssignment = async () => {
    if (!newAssign.date || !newAssign.memberName.trim()) return
    const memberName = newAssign.memberName.trim()
    const clientName = newAssign.clientName?.trim()
    const clientTelephone = newAssign.clientTelephone?.trim()

    const resolvedVehicleLabel =
      newAssign.vehicleId != null
        ? (newAssign.vehicleLabel.trim() || 'Véhicule')
        : buildModeleLabel(newAssign.vehicleMarque, newAssign.vehicleModele)

    if (newAssign.vehicleId == null && !newAssign.vehicleMarque.trim()) {
      toast.error('Sélectionnez la marque du véhicule')
      return
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

    if (clientName && clientTelephone) {
      const exists = clients.some(c => c.telephone === clientTelephone || c.nom.toLowerCase() === clientName.toLowerCase())
      if (!exists) {
        try {
          await addClient({ nom: clientName, telephone: clientTelephone })
          toast.success('Client enregistré et affectation ajoutée')
        } catch {
          toast.error('Erreur lors de l\'ajout du client')
        }
      } else {
        toast.success('Affectation ajoutée (client déjà dans la liste)')
      }
    } else if (clientName) {
      toast.success('Affectation ajoutée — client enregistré')
    } else {
      toast.success('Affectation ajoutée avec succès')
    }

    if (editingId) {
      // mode édition : on met à jour uniquement cette affectation
      const prev = assignments.find(x => x.id === editingId)
      await updateAssignment(editingId, {
        date: newAssign.date,
        memberName,
        vehicleId: newAssign.vehicleId ?? null,
        vehicleLabel: resolvedVehicleLabel,
        description: newAssign.description.trim(),
        clientName: clientName || undefined,
        clientTelephone: clientTelephone || undefined,
        statut: newAssign.statut,
      })
      if (newAssign.statut === 'honore' && prev?.statut !== 'honore') {
        toast.success('RDV honoré — véhicule créé automatiquement')
        void fetchVehicules()
      }
    } else {
      // mode création : une affectation par membre sélectionné
      for (const name of uniqueMembers) {
        const created = await addAssignment({
          date: newAssign.date,
          memberName: name,
          vehicleId: newAssign.vehicleId ?? null,
          vehicleLabel: resolvedVehicleLabel,
          description: newAssign.description.trim(),
          clientName: clientName || undefined,
          clientTelephone: clientTelephone || undefined,
          statut: newAssign.statut,
        })

        if (created.statut === 'honore') {
          void fetchVehicules()
        }

        const tech = users.find(u => u.nom_complet.toLowerCase() === name.toLowerCase())
        if (tech) {
          addNotification(
            tech.id,
            `Vous avez été assigné au calendrier le ${new Date(newAssign.date).toLocaleDateString('fr-FR')} : ${
              resolvedVehicleLabel
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
      setNewAssign(prev => ({
        ...prev,
        vehicleId: null,
        vehicleLabel: '',
        vehicleMarque: '',
        vehicleModele: '',
      }))
      return
    }
    const id = Number(val)
    const v = vehicules.find(v => v.id === id)
    if (v) {
      setNewAssign(prev => ({
        ...prev,
        vehicleId: id,
        vehicleLabel: `${v.modele} (${v.immatriculation})`,
        vehicleMarque: '',
        vehicleModele: '',
      }))
    }
  }

  const updateFreeVehicle = (patch: { vehicleMarque?: string; vehicleModele?: string }) => {
    setNewAssign(prev => {
      const vehicleMarque = patch.vehicleMarque ?? prev.vehicleMarque
      const vehicleModele = patch.vehicleModele ?? prev.vehicleModele
      return {
        ...prev,
        vehicleId: null,
        vehicleMarque,
        vehicleModele,
        vehicleLabel: buildModeleLabel(vehicleMarque, vehicleModele),
      }
    })
  }

  if (!user) return null

  const monthTotal = Math.max(kpiStats.total, 1)
  const statusKpis: {
    key: CalendarRdvStatut
    label: string
    value: number
    color: string
  }[] = [
    { key: 'prevu', label: 'Prévus', value: kpiStats.prevu, color: CALENDAR_RDV_STATUT_CONFIG.prevu.color },
    {
      key: 'non_honore',
      label: 'Non honorés',
      value: kpiStats.non_honore,
      color: CALENDAR_RDV_STATUT_CONFIG.non_honore.color,
    },
    { key: 'honore', label: 'Honorés', value: kpiStats.honore, color: CALENDAR_RDV_STATUT_CONFIG.honore.color },
    { key: 'annule', label: 'Annulés', value: kpiStats.annule, color: CALENDAR_RDV_STATUT_CONFIG.annule.color },
  ]

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25">
                <CalendarIcon className="w-5 h-5" />
              </span>
              Calendrier
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {canManageCalendar
                ? 'Affectation travail · Équipe et véhicules'
                : 'Vos affectations planifiées (lecture seule)'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
            {/* Contexte période — compteurs info uniquement */}
            <div className="inline-flex items-stretch rounded-2xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/60 shadow-sm overflow-hidden">
              <div className="px-3.5 py-2 min-w-[5.5rem] bg-indigo-600 text-white">
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-100">RDV mois</p>
                <p className="text-lg font-extrabold tabular-nums leading-none mt-0.5">{kpiStats.total}</p>
              </div>
              <div className="w-px bg-indigo-100" />
              <div className="px-3.5 py-2 min-w-[5.5rem]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Aujourd’hui</p>
                <p className="text-lg font-extrabold tabular-nums leading-none mt-0.5 text-slate-900">
                  {kpiStats.today}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button onClick={goPrev} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois précédent">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-gray-800 min-w-[160px] text-center">
                  {title}
                </span>
                <button onClick={goNext} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois suivant">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* KPI statut uniquement — couleurs existantes */}
      <section className="mb-5">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Statuts · {title}
            </p>
            {kpiFocus !== 'all' && kpiFocus !== 'today' ? (
              <button
                type="button"
                onClick={() => setKpiFocus('all')}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Effacer
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 hidden sm:inline">Filtrer la grille</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusKpis.map(card => {
              const active = kpiFocus === card.key
              const pct = Math.min(100, Math.round((card.value / monthTotal) * 100))
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => selectKpi(card.key)}
                  className={cn(
                    'relative text-left rounded-xl border px-3 py-2.5 transition-all duration-200',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    active ? 'shadow-md' : 'shadow-sm'
                  )}
                  style={{
                    borderColor: active ? card.color : `${card.color}99`,
                    borderWidth: active ? 2 : 1,
                    background: `linear-gradient(165deg, ${card.color}28 0%, #ffffff 58%)`,
                    boxShadow: active ? `0 8px 22px ${card.color}33` : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2 ring-white"
                      style={{ backgroundColor: card.color, boxShadow: `0 0 0 3px ${card.color}35` }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide truncate"
                      style={{ color: card.color }}
                    >
                      {card.label}
                    </span>
                  </div>
                  <p
                    className="text-2xl font-extrabold tabular-nums tracking-tight leading-none"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${card.color}18` }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: card.color,
                        opacity: card.value > 0 ? 1 : 0.35,
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

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
                const rawDay = assignmentsByDate.get(cell.date) ?? []
                const dayAssignments =
                  kpiFocus === 'all' || kpiFocus === 'today'
                    ? rawDay
                    : rawDay.filter(a => (a.statut ?? 'prevu') === kpiFocus)
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
                            if (canManageCalendar) openEditAssignment(a)
                            else openDay(cell.date)
                          }}
                          className={rdvChipClass(a.statut)}
                          title={`${a.memberName} · ${a.vehicleLabel} · ${CALENDAR_RDV_STATUT_CONFIG[a.statut ?? 'prevu'].label}`}
                        >
                          {a.memberName} – {a.vehicleLabel}
                        </button>
                      ))}
                      {dayAssignments.length > 3 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => {
                            e.stopPropagation()
                            openDay(cell.date)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.stopPropagation()
                              openDay(cell.date)
                            }
                          }}
                          className="block w-full text-left text-[10px] font-medium text-indigo-600 px-1 py-0.5 rounded hover:bg-indigo-50"
                          title="Voir et modifier toutes les affectations"
                        >
                          +{dayAssignments.length - 3} — voir tout
                        </span>
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
            {kpiFocus !== 'all' && kpiListAssignments.length >= 0 ? (
              <div className="mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {kpiFocus === 'today'
                        ? 'Aujourd’hui'
                        : CALENDAR_RDV_STATUT_CONFIG[kpiFocus].label}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {kpiListAssignments.length} affectation(s)
                      {kpiFocus !== 'today' ? ` · ${title}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKpiFocus('all')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Tout
                  </button>
                </div>
                {kpiListAssignments.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">Aucune affectation.</p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {kpiListAssignments
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(a => {
                        const statut = a.statut ?? 'prevu'
                        const cfg = CALENDAR_RDV_STATUT_CONFIG[statut]
                        return (
                          <li key={`kpi-${a.id}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDate(a.date)
                                if (canManageCalendar) openEditAssignment(a)
                              }}
                              className="w-full text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-800 truncate">{a.memberName}</p>
                                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {formatDate(a.date)} · {a.vehicleLabel || '—'}
                              </p>
                            </button>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </div>
            ) : null}

            {selectedDate ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{formatDate(selectedDate)}</h3>
                    {selectedDayAssignments.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedDayAssignments.length} affectation(s) — cliquez une ligne pour modifier
                      </p>
                    )}
                  </div>
                  {canManageCalendar && (
                    <Button size="sm" onClick={() => openAddForDate(selectedDate)} icon={<Plus className="w-4 h-4" />}>
                      Affecter
                    </Button>
                  )}
                </div>
                {selectedDayAssignments.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">Aucune affectation ce jour.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedDayAssignments.map(a => {
                      const statut = a.statut ?? 'prevu'
                      const cfg = CALENDAR_RDV_STATUT_CONFIG[statut]
                      return (
                      <li
                        key={a.id}
                        className={cn(
                          'flex flex-col gap-2 p-3 rounded-xl border group text-left w-full',
                          cfg.bg,
                          cfg.border
                        )}
                      >
                        <div
                          role={canManageCalendar ? 'button' : undefined}
                          tabIndex={canManageCalendar ? 0 : undefined}
                          onClick={() => {
                            if (canManageCalendar) openEditAssignment(a)
                          }}
                          onKeyDown={e => {
                            if (!canManageCalendar) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openEditAssignment(a)
                            }
                          }}
                          className={cn(
                            'flex gap-2 w-full',
                            canManageCalendar && 'cursor-pointer'
                          )}
                        >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn('font-semibold text-sm flex items-center gap-1.5', cfg.text)}>
                              <User className="w-3.5 h-3.5" />
                              {a.memberName}
                            </p>
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.text, 'border', cfg.border)}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            {a.vehicleLabel}
                          </p>
                          {(a.clientName || a.clientTelephone) && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[a.clientName, a.clientTelephone].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {a.description && (
                            <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                              <Briefcase className="w-3 h-3 flex-shrink-0 mt-0.25" />
                              {a.description}
                            </p>
                          )}
                        </div>
                        </div>
                        {canManageCalendar && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-black/5">
                            {CALENDAR_RDV_STATUTS.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  void setAssignmentStatut(a, s)
                                }}
                                className={cn(
                                  'text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors',
                                  statut === s
                                    ? cn(CALENDAR_RDV_STATUT_CONFIG[s].bg, CALENDAR_RDV_STATUT_CONFIG[s].text, CALENDAR_RDV_STATUT_CONFIG[s].border)
                                    : 'bg-white/70 text-gray-600 border-gray-200 hover:bg-white'
                                )}
                                title={
                                  s === 'honore'
                                    ? 'Honoré → crée le véhicule automatiquement'
                                    : s === 'annule'
                                      ? 'Annulé (gardé pour les stats)'
                                      : s === 'non_honore'
                                        ? 'Absent / pas d’appel'
                                        : 'Prévu'
                                }
                              >
                                {CALENDAR_RDV_STATUT_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                      )
                    })}
                  </ul>
                )}
              </>
            ) : kpiFocus === 'all' ? (
              <p className="text-sm text-gray-500">Cliquez sur un jour pour voir les affectations.</p>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Modal Ajouter affectation */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingId ? 'Modifier affectation' : 'Nouvelle affectation'}
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
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marque</label>
                  <select
                    value={newAssign.vehicleMarque}
                    onChange={e => updateFreeVehicle({ vehicleMarque: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">Sélectionner une marque</option>
                    {BRAND_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Modèle</label>
                  <Input
                    placeholder="Ex. Prado, Clio 4…"
                    value={newAssign.vehicleModele}
                    onChange={e => updateFreeVehicle({ vehicleModele: e.target.value })}
                  />
                </div>
              </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut du rendez-vous</label>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_RDV_STATUTS.map(s => {
                const cfg = CALENDAR_RDV_STATUT_CONFIG[s]
                const selected = newAssign.statut === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewAssign(prev => ({ ...prev, statut: s }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                      selected ? cn(cfg.bg, cfg.text, cfg.border, 'ring-2 ring-offset-1') : 'bg-white text-gray-600 border-gray-200'
                    )}
                    style={selected ? { ['--tw-ring-color' as string]: cfg.color } : undefined}
                    title={
                      s === 'honore'
                        ? 'Crée automatiquement le véhicule atelier'
                        : s === 'annule'
                          ? 'Conservé pour les statistiques'
                          : undefined
                    }
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
              Fermer
            </Button>
            <Button onClick={handleAddAssignment} className="flex-1" disabled={!newAssign.memberName.trim()}>
              {editingId ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
