import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import {
  ALL_PRESENCE_STATUTS,
  PRESENCE_CONFIG,
  type TeamMoneyDayEntry,
  type TeamMemberSlots,
  type PresenceStatut,
} from '@/types'
import { cn } from '@/lib/utils'
import { useCaisse } from '@/contexts/CaisseContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Wallet, Plus, ChevronLeft, ChevronRight, Calendar, User, LayoutGrid, List } from 'lucide-react'

const emptySlots = (): TeamMemberSlots => ({ inHand: null, taken: null, note: '', presence: null })

function buildMembersRecord(
  partial: Partial<Record<string, Partial<TeamMemberSlots>>>,
  memberNames: string[]
): Record<string, TeamMemberSlots> {
  const members: Record<string, TeamMemberSlots> = {}
  memberNames.forEach(name => {
    const p = partial[name]
    members[name] = p
      ? { inHand: p.inHand ?? null, taken: p.taken ?? null, note: p.note ?? '', presence: p.presence ?? null }
      : emptySlots()
  })
  return members
}

function countFilledMembers(day: TeamMoneyDayEntry): number {
  return Object.values(day.members).filter(
    s =>
      s.inHand != null ||
      s.taken != null ||
      (s.note && s.note.trim() !== '') ||
      s.presence != null
  ).length
}

export default function CaissePage() {
  const { permissions } = useAuth()
  const { members } = useTeamMembers()
  const [period, setPeriod] = useState({ year: 2026, month: 2 })
  const { days, setDays } = useCaisse()
  const [editingDay, setEditingDay] = useState<TeamMoneyDayEntry | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const memberNames = useMemo(() => members.map(m => m.name), [members])

  const openAddDay = () => {
    const date = `${period.year}-${period.month.toString().padStart(2, '0')}-01`
    setEditingDay({ id: -1, date, members: buildMembersRecord({}, memberNames) })
  }

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Wallet className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès à la caisse.</p>
      </div>
    )
  }

  const periodLabel = `${period.month.toString().padStart(2, '0')}/${period.year}`
  const prevPeriod = () => {
    if (period.month === 1) setPeriod({ year: period.year - 1, month: 12 })
    else setPeriod({ year: period.year, month: period.month - 1 })
  }
  const nextPeriod = () => {
    if (period.month === 12) setPeriod({ year: period.year + 1, month: 1 })
    else setPeriod({ year: period.year, month: period.month + 1 })
  }

  const filteredDays = useMemo(() => {
    return days
      .filter(d => {
        const [y, m] = d.date.split('-').map(Number)
        return y === period.year && m === period.month
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [days, period])

  const handleSaveDay = () => {
    if (!editingDay) return
    if (editingDay.id === -1) {
      const nextId = Math.max(0, ...days.map(d => d.id)) + 1
      setDays(prev => [...prev, { ...editingDay, id: nextId }])
    } else {
      setDays(prev => prev.map(d => (d.id === editingDay.id ? editingDay : d)))
    }
    setEditingDay(null)
  }

  const updateEditingMember = (
    memberName: string,
    field: keyof TeamMemberSlots,
    value: number | string | PresenceStatut | null
  ) => {
    if (!editingDay) return
    const slot = editingDay.members[memberName] ?? emptySlots()
    const next = {
      ...slot,
      [field]:
        field === 'note'
          ? (value as string)
          : field === 'presence'
            ? (value as PresenceStatut | null)
            : (value as number | null),
    }
    setEditingDay({
      ...editingDay,
      members: { ...editingDay.members, [memberName]: next },
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 pb-6 max-w-full overflow-x-hidden">
      {/* Header — responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 shrink-0" />
            <span className="truncate">Caisse</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">Suivi quotidien par membre</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={prevPeriod}
            className="p-2.5 sm:p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800 min-w-[88px] text-center text-sm sm:text-base">{periodLabel}</span>
          <button
            onClick={nextPeriod}
            className="p-2.5 sm:p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Résumé + Vue tableau / cartes — responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Card padding="sm" className="w-full sm:max-w-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{filteredDays.length}</p>
              <p className="text-xs text-gray-500">Jours enregistrés ce mois</p>
            </div>
          </div>
        </Card>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm text-gray-500 shrink-0">Vue :</span>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-initial min-w-0',
                viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <List className="w-4 h-4 shrink-0" />
              <span className="truncate max-sm:hidden sm:inline">Tableau</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-initial min-w-0',
                viewMode === 'cards' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span className="truncate max-sm:hidden sm:inline">Par jour</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bouton nouveau jour */}
      <div className="flex justify-end">
        <Button size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
          Nouveau jour
        </Button>
      </div>

      {/* Vue tableau — responsive avec scroll horizontal */}
      {viewMode === 'table' && (
        <Card padding="none" className="overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
          <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2 tracking-tight">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              </div>
              <span className="truncate">Suivi argent équipe</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1 sm:mt-1.5 truncate">
              Tout le mois · Cliquez sur une ligne pour modifier
            </p>
          </div>
          {filteredDays.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-gray-500 px-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-700 text-sm sm:text-base">Aucun jour ce mois</p>
              <p className="text-xs sm:text-sm mt-1">Utilisez « Nouveau jour » pour commencer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible -mx-3 sm:mx-0">
              <table className="w-full min-w-[600px] sm:min-w-[800px] text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-3 sm:px-4 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 uppercase tracking-wider sticky left-0 z-20 min-w-[90px] sm:min-w-[108px] bg-gray-50/95 backdrop-blur border-b border-gray-200">
                      Date
                    </th>
                    {memberNames.map(name => (
                      <th
                        key={name}
                        className="text-left px-2 sm:px-3 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-semibold text-gray-600 whitespace-nowrap bg-gray-50/95 border-b border-l border-gray-100 first:border-l-0 min-w-[70px] sm:min-w-[80px]"
                      >
                        <span className="truncate block max-w-[70px] sm:max-w-[90px]" title={name}>{name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDays.map((day, rowIndex) => (
                    <tr
                      key={day.id}
                      onClick={() => setEditingDay(day)}
                      className={cn(
                        'border-b border-gray-50 transition-colors cursor-pointer',
                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                        'hover:bg-emerald-50/70'
                      )}
                    >
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-gray-900 sticky left-0 z-10 bg-inherit border-r border-gray-100 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] text-xs sm:text-sm">
                        {formatDate(day.date)}
                      </td>
                      {memberNames.map(memberName => {
                        const slot = day.members[memberName] ?? emptySlots()
                        const hasData =
                          slot.inHand != null ||
                          slot.taken != null ||
                          (slot.note && slot.note.trim() !== '') ||
                          slot.presence != null
                        return (
                          <td
                            key={memberName}
                            className="px-2 sm:px-3 py-2 sm:py-2.5 border-l border-gray-50 align-top min-w-[60px] sm:min-w-[72px]"
                            title={slot.note ? `Note: ${slot.note}` : undefined}
                          >
                            {!hasData ? (
                              <span className="text-gray-200 text-xs">—</span>
                            ) : (
                              <div className="flex flex-col gap-1 min-w-[56px] sm:min-w-[72px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {slot.inHand != null && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-xs tabular-nums">
                                      {slot.inHand}
                                    </span>
                                  )}
                                  {slot.taken != null && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-xs tabular-nums">
                                      {slot.taken}
                                    </span>
                                  )}
                                </div>
                                {slot.presence && (
                                  <span
                                    className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-sm"
                                    style={{ backgroundColor: PRESENCE_CONFIG[slot.presence].color }}
                                  >
                                    {PRESENCE_CONFIG[slot.presence].label}
                                  </span>
                                )}
                                {slot.note && (
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 truncate max-w-[80px] sm:max-w-[100px]" title={slot.note}>
                                    {slot.note}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Vue par jour : cartes — responsive */}
      {viewMode === 'cards' && (
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-600 shrink-0" />
            Suivi par jour
          </h2>
          {filteredDays.length === 0 ? (
            <Card padding="lg">
              <div className="text-center py-6 sm:py-8 px-4">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium text-sm sm:text-base">Aucun jour enregistré ce mois</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Cliquez sur « Nouveau jour » pour commencer</p>
                <Button className="mt-4 w-full sm:w-auto" size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
                  Nouveau jour
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDays.map(day => {
                const filled = countFilledMembers(day)
                return (
                  <button
                    key={day.id}
                    onClick={() => setEditingDay(day)}
                    className="text-left bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all w-full min-h-[44px]"
                  >
                    <p className="font-semibold text-gray-900">{formatDate(day.date)}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {filled === 0 ? 'Non renseigné' : `${filled} membre${filled > 1 ? 's' : ''} renseigné${filled > 1 ? 's' : ''}`}
                    </p>
                    <span className="inline-block mt-2 text-xs font-medium text-emerald-600">Modifier →</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Caisse du jour (édition / nouveau) */}
      <Modal
        open={editingDay !== null}
        onClose={() => setEditingDay(null)}
        title={editingDay ? `Caisse — ${formatDate(editingDay.date)}` : ''}
        subtitle={editingDay?.id === -1 ? 'Choisir la date puis renseigner les membres' : 'Modifier les montants et notes'}
        maxWidth="lg"
      >
        {editingDay && (
          <div className="space-y-4">
            {editingDay.id === -1 && (
              <Input
                label="Date du jour"
                type="date"
                value={editingDay.date}
                onChange={e => setEditingDay({ ...editingDay, date: e.target.value })}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {memberNames.length === 0 ? (
                <p className="text-gray-500 text-sm col-span-full py-4">
                  Aucun membre dans l'équipe. Ajoutez des membres dans Équipe → Membres équipe.
                </p>
              ) : (
              memberNames.map(memberName => {
                const slot = editingDay.members[memberName] ?? emptySlots()
                return (
                  <div
                    key={memberName}
                    className="bg-gray-50 rounded-xl p-3 border border-gray-100"
                  >
                    <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {memberName}
                    </p>
                    {/* Présence — choix dans la liste code couleurs */}
                    <div className="mb-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Présence
                      </label>
                      <select
                        value={slot.presence ?? ''}
                        onChange={e =>
                          updateEditingMember(
                            memberName,
                            'presence',
                            e.target.value === '' ? null : (e.target.value as PresenceStatut)
                          )
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      >
                        <option value="">— Choisir —</option>
                        {ALL_PRESENCE_STATUTS.map(statut => (
                          <option key={statut} value={statut}>
                            {PRESENCE_CONFIG[statut].label}
                          </option>
                        ))}
                      </select>
                      {slot.presence && (
                        <span
                          className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: PRESENCE_CONFIG[slot.presence].color }}
                        >
                          {PRESENCE_CONFIG[slot.presence].label}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">En main</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="0"
                          value={slot.inHand ?? ''}
                          onChange={e =>
                            updateEditingMember(memberName, 'inHand', e.target.value === '' ? null : Number(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Pris</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="0"
                          value={slot.taken ?? ''}
                          onChange={e =>
                            updateEditingMember(memberName, 'taken', e.target.value === '' ? null : Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Note</label>
                      <input
                        type="text"
                        className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Optionnel"
                        value={slot.note}
                        onChange={e => updateEditingMember(memberName, 'note', e.target.value)}
                      />
                    </div>
                  </div>
                )
              })
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setEditingDay(null)} className="flex-1 w-full sm:w-auto">
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveDay} className="flex-1 w-full sm:w-auto">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
