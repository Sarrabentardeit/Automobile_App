import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** En-tête de section unifié pour le dashboard. */
export function DashboardSection({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden',
        className
      )}
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  )
}
