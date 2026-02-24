import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ children, padding = 'md', className, ...props }: CardProps) {
  const paddings = { none: '', sm: 'p-3 sm:p-4', md: 'p-3.5 sm:p-5 md:p-6', lg: 'p-4 sm:p-6 md:p-8' }
  return (
    <div className={cn('bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100', paddings[padding], className)} {...props}>
      {children}
    </div>
  )
}
