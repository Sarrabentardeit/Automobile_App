import { ETAT_CONFIG, type EtatVehicule } from '@/types'

interface EtatBadgeProps { etat: EtatVehicule; size?: 'sm' | 'md' | 'lg' }

export default function EtatBadge({ etat, size = 'md' }: EtatBadgeProps) {
  const cfg = ETAT_CONFIG[etat]
  const sizes = { sm: 'text-[10px] px-2 py-0.5 gap-1', md: 'text-xs px-2.5 py-1 gap-1.5', lg: 'text-sm px-3 py-1.5 gap-2' }
  const dots = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' }

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border-[1.5px] ${sizes[size]}`}
      style={{ backgroundColor: `${cfg.color}15`, color: cfg.color, borderColor: `${cfg.color}40` }}
    >
      <span className={`rounded-full ${dots[size]}`} style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  )
}
