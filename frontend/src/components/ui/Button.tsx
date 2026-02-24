import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  icon?: ReactNode
}

export default function Button({ variant = 'primary', size = 'md', children, icon, className, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 sm:gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 focus:ring-orange-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 focus:ring-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-lg shadow-red-500/25 focus:ring-red-500',
    ghost: 'hover:bg-gray-100 active:bg-gray-200 text-gray-600 focus:ring-gray-400',
    outline: 'border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 focus:ring-gray-400',
  }
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5',
    lg: 'text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}{children}
    </button>
  )
}
