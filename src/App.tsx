import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BottomNav from '@/components/ui/BottomNav'
import SetupPage from '@/pages/Setup'
import ImportPage from '@/pages/Import'
import RecipesPage from '@/pages/Recipes'
import RecipeDetailPage from '@/pages/RecipeDetail'
import PlannerPage from '@/pages/Planner'
import ShoppingPage from '@/pages/Shopping'
import SettingsPage from '@/pages/Settings'
import NutritionPlanPage from '@/pages/NutritionPlan'
import ShareHandler from '@/pages/ShareHandler'
import ChangelogModal from '@/components/ChangelogModal'
import { getSettings } from '@/lib/db'
import { hasUnseenUpdate } from '@/data/changelog'
import { migrateAllRecipesSteps } from '@/lib/recipeEnricher'

function AppContent() {
  const location = useLocation()
  const noNavRoutes = ['/setup', '/share']
  const showNav = !noNavRoutes.some(r => location.pathname.startsWith(r))

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className={`flex-1 ${showNav ? 'pb-nav' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/profile" element={<NutritionPlanPage />} />
          <Route path="/nutrition-plan" element={<Navigate to="/profile" replace />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/share" element={<ShareHandler />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null)
  const [showChangelog, setShowChangelog] = useState(false)

  useEffect(() => {
    // Run retroactive migration for existing recipe steps once
    if (!localStorage.getItem('nutrirecipe_steps_migrated_v1.2.0')) {
      migrateAllRecipesSteps().catch(console.error)
    }

    getSettings().then(s => {
      setInitialRoute(s.activeProfileId ? '/recipes' : '/setup')
      if (s.activeProfileId && hasUnseenUpdate()) {
        setShowChangelog(true)
      }
    })
  }, [])

  if (!initialRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-primary-500 rounded-3xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">🥗</span>
          </div>
          <p className="text-gray-500 text-sm">Caricamento…</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppContent />
      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </BrowserRouter>
  )
}
