import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${widths[maxWidth]} max-h-full sm:max-h-[90vh] flex flex-col shadow-2xl animate-in
        rounded-t-2xl sm:rounded-2xl sm:m-4`}>
        {/* Header - sticky on mobile */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Content - scrollable */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  )
}
