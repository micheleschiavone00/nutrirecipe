import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('safe-top bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors', className)}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'carbs' | 'proteins' | 'vegetables' | 'fruits' | 'dairy' | 'fats' | 'other' | 'default'
  className?: string
}

const BADGE_VARIANTS = {
  carbs: 'bg-amber-100 text-amber-800',
  proteins: 'bg-red-100 text-red-800',
  vegetables: 'bg-green-100 text-green-800',
  fruits: 'bg-purple-100 text-purple-800',
  dairy: 'bg-blue-100 text-blue-800',
  fats: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-700',
  default: 'bg-primary-100 text-primary-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', BADGE_VARIANTS[variant], className)}>
      {children}
    </span>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn('rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin', sizes[size])} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
      <span className="text-6xl">{icon}</span>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface StepIndicatorProps {
  steps: string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
            i < current ? 'bg-primary-500 text-white' :
            i === current ? 'bg-primary-500 text-white ring-4 ring-primary-100' :
            'bg-gray-200 text-gray-500',
          )}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 transition-all',
              i < current ? 'bg-primary-500' : 'bg-gray-200',
            )} />
          )}
        </div>
      ))}
    </div>
  )
}

interface NutriBarProps {
  calories?: number
  proteins?: number
  carbs?: number
  fats?: number
  className?: string
}

export function NutriBar({ calories, proteins, carbs, fats, className }: NutriBarProps) {
  if (!calories && !proteins && !carbs && !fats) return null

  const items = [
    { label: 'Kcal', value: calories, color: 'text-orange-500' },
    { label: 'Proteine', value: proteins ? `${proteins}g` : undefined, color: 'text-red-500' },
    { label: 'Carbo', value: carbs ? `${carbs}g` : undefined, color: 'text-amber-500' },
    { label: 'Grassi', value: fats ? `${fats}g` : undefined, color: 'text-yellow-500' },
  ].filter(i => i.value !== undefined)

  return (
    <div className={cn('flex items-center gap-4 bg-gray-50 rounded-2xl p-3', className)}>
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center flex-1">
          <span className={cn('text-base font-bold', item.color)}>{item.value}</span>
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
