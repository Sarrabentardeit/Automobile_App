import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

interface Option { value: string; label: string }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Option[]
  placeholder?: string
  error?: string
}

export default function Select({ label, options, placeholder, error, className, id, ...props }: SelectProps) {
  return (
    <div className="space-y-1 sm:space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs sm:text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full border border-gray-300 rounded-xl text-gray-900 px-3 sm:px-4 py-2.5 sm:py-3 outline-none transition-all bg-white appearance-none',
          'focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
          error && 'border-red-400',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs sm:text-sm text-red-600">{error}</p>}
    </div>
  )
}
