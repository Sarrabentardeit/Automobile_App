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
import { useCaisse } from '@/contexts/CaisseContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Wallet, Plus, ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600" />
            Caisse
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Suivi quotidien par membre</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800 min-w-[88px] text-center">{periodLabel}</span>
          <button
            onClick={nextPeriod}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Résumé */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{filteredDays.length}</p>
            <p className="text-xs text-gray-500">Jours enregistrés ce mois</p>
          </div>
        </div>
      </Card>

      {/* Section 1: Par jour — cartes de dates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Suivi par jour
          </h2>
          <Button size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
            Nouveau jour
          </Button>
        </div>
        {filteredDays.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun jour enregistré ce mois</p>
              <p className="text-sm text-gray-400 mt-1">Cliquez sur « Nouveau jour » pour commencer</p>
              <Button className="mt-4" size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
                Nouveau jour
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDays.map(day => {
              const filled = countFilledMembers(day)
              return (
                <button
                  key={day.id}
                  onClick={() => setEditingDay(day)}
                  className="text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all"
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
            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setEditingDay(null)} className="flex-1">
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveDay} className="flex-1">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
