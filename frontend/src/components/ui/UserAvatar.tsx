import { resolveUploadUrl } from '@/lib/api'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  rounded?: 'full' | 'xl'
  fallbackClassName?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}

const sizes = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = 'md',
  className,
  rounded = 'full',
  fallbackClassName,
}: Props) {
  const url = resolveUploadUrl(avatarUrl)
  const radius = rounded === 'xl' ? 'rounded-xl' : 'rounded-full'

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn(
          sizes[size],
          radius,
          'object-cover flex-shrink-0 bg-gray-100',
          className
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        sizes[size],
        radius,
        'flex items-center justify-center font-bold flex-shrink-0',
        fallbackClassName ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
