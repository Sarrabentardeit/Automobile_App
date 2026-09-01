import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  size?: 'sm' | 'md'
  className?: string
}

export default function VipBadge({ size = 'sm', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide',
        'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-sm',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      VIP
    </span>
  )
}
