import { CalendarDays, Crown, RotateCcw, Search, UserRound, Wrench } from 'lucide-react'
import { SERVICE_OPTIONS, type ServiceType } from '@/types'
import { cn } from '@/lib/utils'

export type DateFilterMode =
  | 'toutes'
  | 'aujourdhui'
  | 'hier'
  | 'semaine'
  | 'mois'
  | 'mois_choisi'
  | 'date'

const DATE_PRESETS: { mode: Exclude<DateFilterMode, 'mois_choisi' | 'date'>; label: string }[] = [
  { mode: 'toutes', label: 'Toutes' },
  { mode: 'aujourdhui', label: "Aujourd'hui" },
  { mode: 'hier', label: 'Hier' },
  { mode: 'semaine', label: 'Semaine' },
  { mode: 'mois', label: 'Ce mois' },
]

type TechOption = { id: number; nom_complet: string }

type Props = {
  recherche: string
  onRechercheChange: (value: string) => void
  dateFilterMode: DateFilterMode
  onDatePreset: (mode: DateFilterMode) => void
  monthFilter: string
  onMonthChange: (value: string) => void
  dateFilter: string
  onDateChange: (value: string) => void
  dateFieldLabel?: string
  serviceType?: ServiceType
  onServiceChange: (value: ServiceType | undefined) => void
  vipFilter?: 'all' | 'vip' | 'normal'
  onVipFilterChange?: (value: 'all' | 'vip' | 'normal') => void
  showTechnicien?: boolean
  techniciens?: TechOption[]
  technicienId?: number
  onTechnicienChange?: (value: number | undefined) => void
}

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500'
const fieldControlClass =
  'w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none transition-all focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500'

export default function VehiculesListFilters({
  recherche,
  onRechercheChange,
  dateFilterMode,
  onDatePreset,
  monthFilter,
  onMonthChange,
  dateFilter,
  onDateChange,
  dateFieldLabel = 'Jour précis',
  serviceType,
  onServiceChange,
  vipFilter = 'all',
  onVipFilterChange,
  showTechnicien = false,
  techniciens = [],
  technicienId,
  onTechnicienChange,
}: Props) {
  const hasActiveFilters =
    dateFilterMode !== 'toutes' ||
    Boolean(monthFilter) ||
    Boolean(dateFilter) ||
    Boolean(serviceType) ||
    vipFilter !== 'all' ||
    technicienId != null ||
    Boolean(recherche.trim())

  const handleReset = () => {
    onRechercheChange('')
    onMonthChange('')
    onDateChange('')
    onDatePreset('toutes')
    onServiceChange(undefined)
    onVipFilterChange?.('all')
    onTechnicienChange?.(undefined)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={recherche}
            onChange={e => onRechercheChange(e.target.value)}
            placeholder="Rechercher modèle, immatriculation..."
            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className={fieldLabelClass}>Période rapide</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-orange-600 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {DATE_PRESETS.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  onMonthChange('')
                  onDateChange('')
                  onDatePreset(mode)
                }}
                className={cn(
                  'h-9 px-2 rounded-lg text-xs font-semibold border transition-all',
                  dateFilterMode === mode
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {onVipFilterChange ? (
          <div className="space-y-2">
            <p className={cn(fieldLabelClass, 'inline-flex items-center gap-1')}>
              <Crown className="w-3 h-3" />
              VIP
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'vip', label: 'VIP' },
                  { id: 'normal', label: 'Normaux' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onVipFilterChange(id)}
                  className={cn(
                    'h-9 px-3 rounded-lg text-xs font-semibold border transition-all',
                    vipFilter === id
                      ? id === 'vip'
                        ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm'
                        : 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'grid gap-3',
            showTechnicien
              ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-3'
          )}
        >
          {showTechnicien && (
            <label className="space-y-1.5 block min-w-0">
              <span className={cn(fieldLabelClass, 'inline-flex items-center gap-1')}>
                <UserRound className="w-3 h-3" />
                Technicien
              </span>
              <select
                value={technicienId ?? ''}
                onChange={e =>
                  onTechnicienChange?.(e.target.value ? Number(e.target.value) : undefined)
                }
                className={fieldControlClass}
              >
                <option value="">Tous techniciens</option>
                {techniciens.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nom_complet}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1.5 block min-w-0">
            <span className={cn(fieldLabelClass, 'inline-flex items-center gap-1')}>
              <Wrench className="w-3 h-3" />
              Service
            </span>
            <select
              value={serviceType ?? ''}
              onChange={e =>
                onServiceChange((e.target.value || undefined) as ServiceType | undefined)
              }
              className={fieldControlClass}
            >
              <option value="">Tous services</option>
              {SERVICE_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 block min-w-0">
            <span className={cn(fieldLabelClass, 'inline-flex items-center gap-1')}>
              <CalendarDays className="w-3 h-3" />
              Mois
            </span>
            <input
              type="month"
              value={monthFilter}
              onChange={e => {
                const v = e.target.value
                onDateChange('')
                onMonthChange(v)
                onDatePreset(v ? 'mois_choisi' : 'toutes')
              }}
              className={cn(
                fieldControlClass,
                dateFilterMode === 'mois_choisi' && 'border-orange-500 ring-2 ring-orange-500/20'
              )}
            />
          </label>

          <label className="space-y-1.5 block min-w-0">
            <span className={cn(fieldLabelClass, 'inline-flex items-center gap-1')}>
              <CalendarDays className="w-3 h-3" />
              {dateFieldLabel}
            </span>
            <input
              type="date"
              value={dateFilter}
              onChange={e => {
                const v = e.target.value
                onMonthChange('')
                onDateChange(v)
                onDatePreset(v ? 'date' : 'toutes')
              }}
              className={cn(
                fieldControlClass,
                dateFilterMode === 'date' && 'border-orange-500 ring-2 ring-orange-500/20'
              )}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
