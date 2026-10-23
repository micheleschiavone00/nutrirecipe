import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { path: '/recipes', icon: '📚', label: 'Ricette' },
  { path: '/import', icon: '➕', label: 'Importa' },
  { path: '/planner', icon: '📅', label: 'Piano' },
  { path: '/shopping', icon: '🛒', label: 'Spesa' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

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
                'nav-item flex-1',
                isActive ? 'text-primary-600' : 'text-gray-400',
              )}
            >
              <span className={cn('text-2xl transition-transform', isActive && 'scale-110')}>
                {item.icon}
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
