import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Shell section dashboard — bords doux, typo medium (style pro). */
export function DashboardSection({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  compact,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** En-tête plus compact (bandes action) */
  compact?: boolean
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-black/[0.06] bg-white overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'flex items-start sm:items-center justify-between gap-3 border-b border-black/[0.04]',
          compact ? 'px-5 py-3' : 'px-5 py-4'
        )}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-gray-900">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}
