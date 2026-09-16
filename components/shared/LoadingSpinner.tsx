import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Loader2 className={cn('animate-spin text-gray-400', sizeClass)} />
    </div>
  )
}
