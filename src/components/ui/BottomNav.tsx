import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { hasUnseenUpdate } from '@/data/changelog'

const NAV_ITEMS = [
  { path: '/recipes', icon: '📚', label: 'Ricette' },
  { path: '/import', icon: '➕', label: 'Importa' },
  { path: '/planner', icon: '📅', label: 'Piano' },
  { path: '/shopping', icon: '🛒', label: 'Spesa' },
  { path: '/settings', icon: '⚙️', label: 'Settings', hasBadge: true },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const showUpdateBadge = hasUnseenUpdate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 safe-bottom z-50">
      <div className="flex items-center justify-around px-2 pt-2">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname.startsWith(item.path)
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'nav-item flex-1 relative',
                isActive ? 'text-primary-600' : 'text-gray-400',
              )}
            >
              <span className="relative inline-block">
                <span className={cn('text-2xl transition-transform block', isActive && 'scale-110')}>
                  {item.icon}
                </span>
                {item.hasBadge && showUpdateBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </span>
              <span className={cn('text-xs font-medium', isActive ? 'text-primary-600' : 'text-gray-400')}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
