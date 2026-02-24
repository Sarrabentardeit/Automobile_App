import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export default function Input({ label, error, icon, className, id, ...props }: InputProps) {
  return (
    <div className="space-y-1 sm:space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs sm:text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          id={id}
          className={cn(
            'w-full border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 outline-none transition-all',
            'focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
            icon ? 'pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3' : 'px-3 sm:px-4 py-2.5 sm:py-3',
            error && 'border-red-400 focus:ring-red-500 focus:border-red-500',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs sm:text-sm text-red-600">{error}</p>}
    </div>
  )
}
