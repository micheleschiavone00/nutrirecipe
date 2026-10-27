import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, getActiveProfile, db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import { isOpenAIConfigured, isRapidAPIConfigured } from '@/config'
import ChangelogModal from '@/components/ChangelogModal'
import { APP_VERSION } from '@/data/changelog'
import { reAdaptAllRecipes, type ReAdaptProgress } from '@/lib/recipeEnricher'
import { useTheme } from '@/lib/theme'
import { formatDate } from '@/lib/utils'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [showChangelog, setShowChangelog] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<ReAdaptProgress | null>(null)
  const [migrateStatus, setMigrateStatus] = useState('')

  const activeProfile = useLiveQuery(() => getActiveProfile(), [])

  useEffect(() => {
    getSettings().then(() => {
      setLoading(false)
    })
  }, [])

  const handleReAdaptAllRecipes = async () => {
    setMigrating(true)
    setProgress(null)
    setMigrateStatus('')
    try {
      const res = await reAdaptAllRecipes((p) => {
        setProgress(p)
      })
      setMigrateStatus(`✅ ${res.updated} ricette su ${res.total} riadattate con successo al tuo piano nutrizionale!`)
    } catch {
      setMigrateStatus("❌ Errore durante il riadattamento delle ricette")
    } finally {
      setMigrating(false)
      setTimeout(() => setMigrateStatus(''), 7000)
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

        {/* Icone App & Stili a Confronto */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <h2 className="font-semibold text-gray-900">Icona App & Stili a Confronto</h2>
            </div>
            <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-2 py-0.5 rounded-full border border-primary-200">
              Novità v1.4
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Abbiamo sostituito la precedente insalata con un sontuoso <strong>hamburger gourmet su bilancia digitale</strong> (180g). Confronta gli stili realizzati:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Liquid Glass 3D */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-200 mb-2">
                <img src="/icons/icon-liquidglass.png" alt="Liquid Glass 3D" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-100 px-2 py-0.5 rounded-md mb-1">
                Liquid Glass 3D
              </span>
              <h3 className="text-xs font-bold text-gray-900">Predefinita</h3>
              <p className="text-[10px] text-gray-500 mt-1">
                Effetto vetro smerigliato con riflessi liquidi e illuminazione studio su sfondo smeraldo.
              </p>
            </div>

            {/* 2. Material Design */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-200 mb-2">
                <img src="/icons/icon-material.png" alt="Material Design" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mb-1">
                Material 3
              </span>
              <h3 className="text-xs font-bold text-gray-900">Grafica Vettoriale</h3>
              <p className="text-[10px] text-gray-500 mt-1">
                Design piatto geometrico con ombre di elevazione e colori saturi in stile Google Material.
              </p>
            </div>

            {/* 3. Dark Mode */}
            <div className="bg-gray-900 text-white border border-gray-800 rounded-2xl p-3 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-700 mb-2">
                <img src="/icons/icon-dark.png" alt="Dark Mode" className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md mb-1">
                Dark Mode
              </span>
              <h3 className="text-xs font-bold text-gray-100">Adattiva Sistema</h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Fondo grafite/ossidiana con bilancia titanio e display verde neon brillante. Si attiva col tema scuro.
              </p>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5">
            <span className="text-base">🌗</span>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              <strong>Adattamento Automatico:</strong> NutriRecipe rileva le impostazioni del tuo telefono (iOS / Android / Mac) e serve automaticamente l&apos;icona Dark Mode quando il dispositivo è in modalità scura.
            </p>
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

        {/* Aspetto & Tema */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>🌗</span>
              <span>Aspetto &amp; Tema</span>
            </h2>
            <span className="text-xs bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-semibold px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
              {theme === 'system' ? 'Automatico' : theme === 'dark' ? 'Scuro' : 'Chiaro'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Scegli il tema visivo dell&apos;applicazione. In modalità automatica, l&apos;interfaccia si adatta alle impostazioni del tuo telefono.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                theme === 'light'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">☀️</span>
              <span>Chiaro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                theme === 'dark'
                  ? 'bg-gray-900 border-primary-500 text-white ring-2 ring-primary-500 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🌙</span>
              <span>Scuro</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                theme === 'system'
                  ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-600 text-primary-900 dark:text-primary-200 ring-2 ring-primary-400'
                  : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">🌗</span>
              <span>Sistema</span>
            </button>
          </div>
        </div>

        {/* Riadattamento Completo Ricette al Piano Nutrizionale */}
        <div className="card p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>⚡</span>
              <span>Riadatta Ricette Esistenti al Piano</span>
            </h2>
            <span className="text-xs text-primary-700 bg-primary-50 dark:bg-primary-950 dark:text-primary-300 font-semibold px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
              Algoritmo v1.7.1
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Rifai tutto il procedimento di adattamento deterministico su tutte le ricette salvate:
            ricalibra dosi esatte dal tuo piano ({activeProfile?.name || 'Piano attivo'}), divide correttamente le proteine
            (es. <strong>Uova + Lenticchie al 50%</strong> = 1 uovo + 40g lenticchie, <strong>Uova + Parmigiano</strong>),
            ripartisce le verdure e rigenera le varianti Pranzo / Cena / Post-Workout con macro precisi.
          </p>

          {/* Progress Bar & Status */}
          {migrating && progress && (
            <div className="bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-primary-900 dark:text-primary-200 truncate max-w-[70%]">
                  Ricetta {progress.current} di {progress.total}: {progress.title}
                </span>
                <span className="font-extrabold text-primary-700 dark:text-primary-400">
                  {progress.percent}%
                </span>
              </div>
              <div className="w-full bg-primary-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-primary-600 dark:text-primary-400 flex items-center gap-1">
                <span className="animate-spin inline-block">⚙️</span>
                <span>Ricalibrazione grammature, varianti e macro in corso…</span>
              </p>
            </div>
          )}

          <button
            onClick={handleReAdaptAllRecipes}
            disabled={migrating}
            className="btn-primary w-full flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
          >
            <span>{migrating ? '⏳' : '⚡'}</span>
            <span>{migrating ? 'Riadattamento in corso…' : 'Riadatta tutte le ricette precedenti'}</span>
          </button>

          {migrateStatus && !migrating && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{migrateStatus}</p>
            </div>
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
