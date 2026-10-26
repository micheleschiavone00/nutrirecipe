import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, getActiveProfile, db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import { isOpenAIConfigured, isRapidAPIConfigured } from '@/config'
import ChangelogModal from '@/components/ChangelogModal'
import { APP_VERSION } from '@/data/changelog'
import { migrateAllRecipesSteps } from '@/lib/recipeEnricher'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showChangelog, setShowChangelog] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrateStatus, setMigrateStatus] = useState('')

  const activeProfile = useLiveQuery(() => getActiveProfile(), [])

  useEffect(() => {
    getSettings().then(() => {
      setLoading(false)
    })
  }, [])

  const handleMigrateRecipes = async () => {
    setMigrating(true)
    setMigrateStatus('Aggiornamento ricette in corso…')
    try {
      const res = await migrateAllRecipesSteps()
      setMigrateStatus(`✅ ${res.updated} ricette su ${res.total} aggiornate con dosi!`)
    } catch {
      setMigrateStatus("❌ Errore durante l'aggiornamento")
    } finally {
      setMigrating(false)
      setTimeout(() => setMigrateStatus(''), 4500)
    }
  }

  const resetApp = async () => {
    if (confirm("Eliminare tutti i dati? Quest'operazione non è reversibile.")) {
      await db.recipes.clear()
      await db.profiles.clear()
      await db.plannedMeals.clear()
      await db.shoppingLists.clear()
      await db.settings.clear()
      localStorage.clear()
      navigate('/setup')
    }
  }

  if (loading) return null

  const hasOpenAI = isOpenAIConfigured()
  const hasRapidAPI = isRapidAPIConfigured()

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Impostazioni" />

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* API Services Status */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">🔑 Servizi & API</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              Uso Personale
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Le API key sono integrate nel codice dell'app per la massima comodità e privacy.
          </p>

          <div className="space-y-2 pt-1">
            {/* RapidAPI */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl">📸</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">RapidAPI Scraper</p>
                  <p className="text-xs text-gray-500">Instagram, TikTok & YouTube</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {hasRapidAPI ? 'Attiva' : 'Disattivata'}
              </span>
            </div>

            {/* OpenAI */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">OpenAI (GPT-4o)</p>
                  <p className="text-xs text-gray-500">Analisi PDF & adattamento ricette</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                  hasOpenAI
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasOpenAI ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                ></span>
                {hasOpenAI ? 'Attiva' : 'Configura in src/config.ts'}
              </span>
            </div>
          </div>
        </div>

        {/* Nutrition Profile */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>🥗</span>
              <span>Piano Nutrizionale</span>
            </h2>
            {activeProfile && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Attivo
              </span>
            )}
          </div>

          {activeProfile ? (
            <div className="space-y-2">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
                <p className="text-sm font-bold text-gray-900">{activeProfile.name}</p>
                <p className="text-xs text-gray-500">
                  {activeProfile.meals?.length || 0} pasti configurati • Aggiornato il{' '}
                  {formatDate(activeProfile.updatedAt || activeProfile.createdAt)}
                </p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>👁️</span>
                <span>Visualizza e Modifica Piano</span>
              </button>
              <button
                onClick={() => navigate('/setup')}
                className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                + Crea un nuovo piano da zero
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Nessun piano nutrizionale attualmente configurato.</p>
              <button onClick={() => navigate('/setup')} className="btn-primary w-full text-xs">
                Crea piano nutrizionale
              </button>
            </div>
          )}
        </div>

        {/* Ricettario & Dosi retroattive */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>⚖️</span>
              <span>Dosi nei Procedimenti</span>
            </h2>
            <span className="text-xs text-emerald-700 bg-emerald-50 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
              Automatico
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Inserisci retroattivamente le dosi esatte tra parentesi nei passaggi di tutte le ricette salvate in precedenza.
          </p>
          <button
            onClick={handleMigrateRecipes}
            disabled={migrating}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <span>🔄</span>
            <span>{migrating ? 'Aggiornamento in corso…' : 'Aggiorna dosi in tutte le ricette precedenti'}</span>
          </button>
          {migrateStatus && (
            <p className="text-xs font-semibold text-center text-primary-700 animate-fade-in">{migrateStatus}</p>
          )}
        </div>

        {/* Novità & Changelog */}
        <div className="card p-4 space-y-3 bg-gradient-to-br from-white to-primary-50/40 border-primary-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <h2 className="font-semibold text-gray-900">Novità & Aggiornamenti</h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 border border-primary-200">
              v{APP_VERSION}
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Scopri tutte le novità introdotte, come sono state migliorate le funzioni dell'app e cosa è cambiato.
          </p>
          <button
            onClick={() => setShowChangelog(true)}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-primary-700 border-primary-200 bg-white hover:bg-primary-50 transition-colors font-medium text-sm"
          >
            <span>📜</span>
            <span>Cosa c'è di nuovo in v{APP_VERSION}</span>
          </button>
        </div>

        {/* About */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">ℹ️ Informazioni</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Versione installata</span>
              <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-xs">v{APP_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span>I tuoi dati</span>
              <span className="font-medium text-green-600">Solo sul tuo dispositivo 🔒</span>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              <strong>Privacy:</strong> NutriRecipe non invia i tuoi dati personali ad alcun server esterno.
              Il piano nutrizionale, le ricette e il meal planner risiedono sul tuo dispositivo.
            </p>
          </div>
        </div>

        {/* How to install */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">📱 Installa su iPhone</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>Apri questa pagina in <strong>Safari</strong> su iPhone</li>
              <li>Tocca il pulsante <strong>Condividi</strong> (□↑)</li>
              <li>Scorri e tocca <strong>"Aggiungi a schermata Home"</strong></li>
              <li>Dai un nome e tocca <strong>Aggiungi</strong></li>
            </ol>
            <p className="text-xs text-gray-400 mt-2">
              Una volta installata, l'app apparirà nel menu Condividi di TikTok e Instagram.
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card p-4 border-red-100">
          <h2 className="font-semibold text-red-600 mb-3">⚠️ Zona pericolosa</h2>
          <button
            onClick={resetApp}
            className="w-full py-2.5 px-4 rounded-xl border-2 border-red-300 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors"
          >
            Reimposta app ed elimina tutti i dati
          </button>
        </div>

        <div className="h-4" />
      </div>

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />
    </div>
  )
}
