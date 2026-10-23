import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import { isOpenAIConfigured, isRapidAPIConfigured } from '@/config'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(() => {
      setLoading(false)
    })
  }, [])

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
          <h2 className="font-semibold text-gray-900">🥗 Piano Nutrizionale</h2>
          <button onClick={() => navigate('/setup')} className="btn-secondary w-full">
            Modifica piano nutrizionale
          </button>
        </div>

        {/* About */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">ℹ️ Informazioni</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Versione</span>
              <span className="font-medium">1.0.0</span>
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
    </div>
  )
}
