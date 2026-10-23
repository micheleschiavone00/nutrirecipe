import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, saveSettings, db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import type { AppSettings } from '@/types'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AppSettings>({
    openAIApiKey: '',
    rapidApiKey: '',
    language: 'it',
    theme: 'system',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showRapidKey, setShowRapidKey] = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const save = async () => {
    await saveSettings(settings)
    // Also store in localStorage for direct API calls
    if (settings.openAIApiKey) {
      localStorage.setItem('openai_api_key', settings.openAIApiKey)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const resetApp = async () => {
    if (confirm('Eliminare tutti i dati? Quest\'operazione non è reversibile.')) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Impostazioni" />

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">

        {/* API Keys */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">🔑 API Keys</h2>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              OpenAI API Key
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-500 underline"
              >
                Ottienila qui →
              </a>
            </label>
            <div className="relative">
              <input
                type={showOpenAIKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={settings.openAIApiKey}
                onChange={e => setSettings(s => ({ ...s, openAIApiKey: e.target.value }))}
                className="input-field pr-10"
              />
              <button
                onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showOpenAIKey ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Usata per analizzare PDF e adattare le ricette. Costo stimato: ~€0.01 per ricetta.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              RapidAPI Key
              <a
                href="https://rapidapi.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-xs text-blue-500 underline"
              >
                Ottienila qui →
              </a>
            </label>
            <div className="relative">
              <input
                type={showRapidKey ? 'text' : 'password'}
                placeholder="La tua RapidAPI key..."
                value={settings.rapidApiKey}
                onChange={e => setSettings(s => ({ ...s, rapidApiKey: e.target.value }))}
                className="input-field pr-10"
              />
              <button
                onClick={() => setShowRapidKey(!showRapidKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showRapidKey ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Usata per estrarre dati da TikTok/Instagram. Piano gratuito: 100 richieste/mese.
            </p>
          </div>
        </div>

        {/* Nutrition Profile */}
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">🥗 Piano Nutrizionale</h2>
          <button
            onClick={() => navigate('/setup')}
            className="btn-secondary w-full"
          >
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
              <strong>Privacy:</strong> NutriRecipe non invia i tuoi dati a nessun server esterno.
              Il piano nutrizionale, le ricette e il meal planner vengono salvati solo nel browser del tuo iPhone.
              Le API key vengono usate direttamente dal tuo browser per chiamare OpenAI e RapidAPI.
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

        {/* Save button */}
        <button
          onClick={save}
          className={`btn-primary w-full ${saved ? 'bg-green-500' : ''} transition-colors`}
        >
          {saved ? '✓ Salvato!' : 'Salva impostazioni'}
        </button>

        <div className="h-4" />
      </div>
    </div>
  )
}
