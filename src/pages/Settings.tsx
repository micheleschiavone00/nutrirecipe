import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, saveSettings, getActiveProfile, db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import { isOpenAIConfigured, isRapidAPIConfigured } from '@/config'
import ChangelogModal from '@/components/ChangelogModal'
import { APP_VERSION } from '@/data/changelog'
import { reAdaptAllRecipes, type ReAdaptProgress } from '@/lib/recipeEnricher'
import { useTheme } from '@/lib/theme'
import { formatDate } from '@/lib/utils'
import {
  getUserAiConfig,
  saveUserAiConfig,
  testGeminiConnection,
  type AiProvider,
} from '@/lib/userAiSettings'
import { exportFullBackup, importFullBackup } from '@/lib/backup'
import { isAdminLoggedIn, logoutAdmin } from '@/lib/adminAuth'
import AdminLoginModal from '@/components/AdminLoginModal'

type SettingsSection =
  | 'main'
  | 'nutrition'
  | 'readapt'
  | 'vouchers'
  | 'appearance'
  | 'icons'
  | 'privacy'
  | 'about'
  | 'install'
  | 'api'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main')
  const [showChangelog, setShowChangelog] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState<ReAdaptProgress | null>(null)
  const [migrateStatus, setMigrateStatus] = useState('')

  const [voucherEnabled, setVoucherEnabled] = useState(false)
  const [voucherVal, setVoucherVal] = useState('8.00')

  // AI Configuration State (BYOK)
  const [aiConfig, setAiConfig] = useState(getUserAiConfig())
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success?: boolean; message?: string } | null>(null)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showOpenAiKey, setShowOpenAiKey] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)

  // Backup & Restore State
  const [backupStatus, setBackupStatus] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)

  const activeProfile = useLiveQuery(() => getActiveProfile(), [])

  useEffect(() => {
    getSettings().then(s => {
      setLoading(false)
      setVoucherEnabled(Boolean(s.mealVoucherEnabled))
      setVoucherVal(String(s.mealVoucherValue ?? 8.00))
    })
  }, [])

  const handleUpdateAiProvider = (provider: AiProvider) => {
    const updated = saveUserAiConfig({ provider })
    setAiConfig(updated)
  }

  const handleUpdateGeminiKey = (key: string) => {
    const updated = saveUserAiConfig({ geminiApiKey: key.trim() })
    setAiConfig(updated)
    setGeminiTestStatus(null)
  }

  const handleUpdateGeminiModel = (model: string) => {
    const updated = saveUserAiConfig({ geminiModel: model })
    setAiConfig(updated)
  }

  const handleUpdateOpenAiKey = (key: string) => {
    const updated = saveUserAiConfig({ openaiApiKey: key.trim() })
    setAiConfig(updated)
  }

  const handleUpdateOpenAiModel = (model: string) => {
    const updated = saveUserAiConfig({ openaiModel: model })
    setAiConfig(updated)
  }

  const handleTestGemini = async () => {
    if (!aiConfig.geminiApiKey) {
      setGeminiTestStatus({ success: false, message: 'Inserisci prima la tua chiave API Gemini' })
      return
    }
    setTestingGemini(true)
    setGeminiTestStatus(null)
    const res = await testGeminiConnection(aiConfig.geminiApiKey, aiConfig.geminiModel)
    setTestingGemini(false)
    setGeminiTestStatus(res)
  }

  const handleExportBackup = async () => {
    try {
      await exportFullBackup()
      setBackupStatus('✅ Backup scaricato con successo!')
      setTimeout(() => setBackupStatus(''), 5000)
    } catch {
      setBackupStatus('❌ Errore durante il salvataggio del backup')
    }
  }

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setBackupStatus('')
    const res = await importFullBackup(file)
    setIsImporting(false)
    if (res.success) {
      setBackupStatus(`✅ ${res.message}`)
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setBackupStatus(`❌ ${res.message}`)
    }
  }

  const handleToggleVouchers = async (checked: boolean) => {
    setVoucherEnabled(checked)
    const val = parseFloat(voucherVal) || 8.00
    await saveSettings({ mealVoucherEnabled: checked, mealVoucherValue: val })
  }

  const handleVoucherValueChange = async (valStr: string) => {
    setVoucherVal(valStr)
    const val = parseFloat(valStr) || 8.00
    await saveSettings({ mealVoucherValue: val })
  }

  const handleReAdaptAllRecipes = async () => {
    setMigrating(true)
    setProgress(null)
    setMigrateStatus('')
    try {
      const res = await reAdaptAllRecipes(p => {
        setProgress(p)
      })
      setMigrateStatus(`✅ ${res.updated} ricette su ${res.total} riadattate con successo al tuo piano nutrizionale!`)
    } catch {
      setMigrateStatus('❌ Errore durante il riadattamento delle ricette')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      {/* ── Sub-header se siamo in una sezione interna ── */}
      {currentSection !== 'main' ? (
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 safe-top">
          <div className="px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => setCurrentSection('main')}
              className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-bold text-xs sm:text-sm active:scale-95 transition-transform"
            >
              <span className="text-base">‹</span>
              <span>Impostazioni</span>
            </button>
            <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
              {currentSection === 'nutrition' && 'Piano Nutrizionale'}
              {currentSection === 'readapt' && 'Riadattamento Ricette'}
              {currentSection === 'vouchers' && 'Buoni Pasto & Spesa'}
              {currentSection === 'appearance' && 'Aspetto & Tema'}
              {currentSection === 'icons' && 'Icona App'}
              {currentSection === 'privacy' && 'Privacy & Dati'}
              {currentSection === 'about' && 'Informazioni App'}
              {currentSection === 'install' && 'Installazione PWA'}
              {currentSection === 'api' && 'Servizi & API'}
            </span>
            <div className="w-12" />
          </div>
        </div>
      ) : (
        <PageHeader title="Impostazioni" />
      )}

      <div className="px-4 pt-4 max-w-lg mx-auto space-y-5">
        {/* ═════════════════════════════════════════════════════════════════════
            1. VISTA PRINCIPALE (MENU CATEGORIZZATO A SEZIONI TAPPABILI)
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'main' && (
          <div className="space-y-5 animate-fade-in">
            {/* Banner Profilo Attivo */}
            {activeProfile && (
              <div
                onClick={() => setCurrentSection('nutrition')}
                className="card p-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-all active:scale-[0.99] shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
                    🥗
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Piano Nutrizionale Attivo
                    </p>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100 truncate">
                      {activeProfile.name}
                    </p>
                    <p className="text-[10.5px] text-gray-500 dark:text-gray-400">
                      {activeProfile.meals?.length || 0} pasti configurati
                    </p>
                  </div>
                </div>
                <span className="text-gray-400 dark:text-gray-500 font-bold text-sm ml-2">›</span>
              </div>
            )}

            {/* Admin Status Card (Accesso Sviluppatore Michele) */}
            <div className={`card p-3.5 flex items-center justify-between border transition-all ${
              isAdminLoggedIn()
                ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-800/80 shadow-xs'
                : 'bg-white dark:bg-gray-900 border-gray-200/80 dark:border-gray-800'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 ${
                  isAdminLoggedIn()
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {isAdminLoggedIn() ? '👑' : '👤'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                      {isAdminLoggedIn() ? 'Amministratore (Michele)' : 'Account Utente'}
                    </p>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      isAdminLoggedIn()
                        ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {isAdminLoggedIn() ? 'Vercel API Sbloccate ✓' : 'Utente Standard'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {isAdminLoggedIn()
                      ? 'Chiavi server Vercel attive: importazioni social e AI sbloccate'
                      : 'Chiavi server protette: usa Gemini gratis o accedi come Admin'}
                  </p>
                </div>
              </div>

              {isAdminLoggedIn() ? (
                <button
                  type="button"
                  onClick={() => {
                    logoutAdmin()
                    setAiConfig(getUserAiConfig())
                  }}
                  className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800/60 transition-all active:scale-95 flex-shrink-0 ml-2"
                >
                  Disconnetti
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="text-[11px] font-bold text-primary-700 dark:text-primary-300 hover:text-primary-800 bg-primary-50 dark:bg-primary-950/80 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800 transition-all active:scale-95 flex-shrink-0 ml-2"
                >
                  🔐 Login Admin
                </button>
              )}
            </div>

            {/* SEZIONE 1: ALIMENTAZIONE & PIANO */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                Piano Nutrizionale &amp; Ricette
              </h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-50 dark:divide-gray-800/60 overflow-hidden shadow-2xs">
                {/* Voce: Piano Nutrizionale */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('nutrition')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🥗</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Piano Nutrizionale
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {activeProfile ? `${activeProfile.name}` : 'Nessun piano attivo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Configurato
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Riadatta Ricette Esistenti */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('readapt')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">⚡</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Riadatta Ricette al Piano
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Ricalcola dosi, multi-proteine e verdure
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                      Algoritmo
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Buoni Pasto & Spesa */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('vouchers')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">💳</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Buoni Pasto &amp; Spesa
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {voucherEnabled ? `Attivi (${parseFloat(voucherVal || '8').toFixed(2)} €/buono)` : 'Non configurati'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      voucherEnabled
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                    }`}>
                      {voucherEnabled ? `${parseFloat(voucherVal || '8').toFixed(2)}€` : 'Off'}
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>
              </div>
            </div>

            {/* SEZIONE 2: PERSONALIZZAZIONE & GRAFICA */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                Personalizzazione &amp; Grafica
              </h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-50 dark:divide-gray-800/60 overflow-hidden shadow-2xs">
                {/* Voce: Aspetto & Tema */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('appearance')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🌗</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Aspetto &amp; Tema
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {theme === 'system' ? 'Automatico di sistema' : theme === 'dark' ? 'Modalità Scura' : 'Modalità Chiara'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {theme === 'system' ? 'Sistema' : theme === 'dark' ? 'Scuro' : 'Chiaro'}
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Icona App & Design */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('icons')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🎨</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Icona App &amp; Design
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Liquid Glass 3D, Material e Dark Mode
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                      3 Stili
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>
              </div>
            </div>

            {/* SEZIONE 3: INFORMAZIONI & PRIVACY */}
            <div className="space-y-1.5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                Informazioni &amp; Privacy
              </h3>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl divide-y divide-gray-50 dark:divide-gray-800/60 overflow-hidden shadow-2xs">
                {/* Voce: Privacy */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('privacy')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🔒</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Privacy &amp; Sicurezza Dati
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Tutti i dati risiedono solo sul tuo dispositivo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      100% Locale
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Altre Info */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('about')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">ℹ️</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Altre Info sull&apos;Applicazione
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Versione v{APP_VERSION}, crediti e specifiche
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      v{APP_VERSION}
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Novità & Changelog */}
                <button
                  type="button"
                  onClick={() => setShowChangelog(true)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🚀</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Novità &amp; Aggiornamenti
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Scopri cosa c&apos;è di nuovo nella versione {APP_VERSION}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-extrabold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-950 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                      Novità
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>

                {/* Voce: Guida Installazione PWA */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('install')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">📱</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Installazione su iPhone &amp; Android
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        Aggiungi a schermata Home e menu Condividi
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-bold text-gray-400 dark:text-gray-500">›</span>
                </button>

                {/* Voce: Servizi & API */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('api')}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">🔑</span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        Servizi Cloud &amp; API
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        OpenAI GPT-4o e Scraper Social
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {hasOpenAI && hasRapidAPI ? 'Attivi' : 'Configurati'}
                    </span>
                    <span className="text-base font-bold">›</span>
                  </div>
                </button>
              </div>
            </div>

            {/* SEZIONE 4: ZONA PERICOLOSA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={resetApp}
                className="w-full py-3 px-4 rounded-2xl border border-red-200 dark:border-red-950/80 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100/60 transition-colors flex items-center justify-center gap-2"
              >
                <span>⚠️</span>
                <span>Reimposta applicazione ed elimina dati</span>
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            2. SCHERMATA: PIANO NUTRIZIONALE
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'nutrition' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥗</span>
                  <div>
                    <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                      {activeProfile?.name || 'Piano Nutrizionale'}
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Aggiornato il {formatDate(activeProfile?.updatedAt || activeProfile?.createdAt || new Date())}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Attivo
                </span>
              </div>

              {activeProfile ? (
                <>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Pasti del Giorno</p>
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100">
                        {activeProfile.meals?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {activeProfile.meals?.map(m => m.label).join(', ')}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Frequenze Settimanali</p>
                      <p className="text-lg font-black text-gray-900 dark:text-gray-100">
                        {activeProfile.weeklyFrequencies?.length || 0}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {activeProfile.cheatMealsPerWeek ? `${activeProfile.cheatMealsPerWeek} pasto libero` : 'Regole attive'}
                      </p>
                    </div>
                  </div>

                  {activeProfile.nutritionistNotes && (
                    <div className="bg-primary-50/50 dark:bg-primary-950/40 p-3 rounded-xl border border-primary-100 dark:border-primary-900/60 text-xs text-primary-900 dark:text-primary-200">
                      <p className="font-bold mb-0.5">Note del nutrizionista:</p>
                      <p className="opacity-90">{activeProfile.nutritionistNotes}</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>👁️</span>
                      <span>Visualizza e Modifica Piano Completo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/setup')}
                      className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      + Crea un nuovo piano da zero (Carica PDF)
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-xs text-gray-500">Nessun piano nutrizionale attualmente configurato.</p>
                  <button onClick={() => navigate('/setup')} className="btn-primary w-full text-xs">
                    Crea piano nutrizionale
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            3. SCHERMATA: RIADATTAMENTO RICETTE
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'readapt' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h2 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                    Riadattamento Deterministico al Piano
                  </h2>
                </div>
                <span className="text-[10px] text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950 font-bold px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
                  v{APP_VERSION}
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Riesegue la ricalibrazione matematica di tutte le ricette presenti nel ricettario applicando le regole del tuo piano attivo:
              </p>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p>• <strong>Formaggi stagionati &amp; Feta:</strong> quota esatta calibrata a max 50g.</p>
                <p>• <strong>Multi-Proteina 50/50:</strong> divisione perfetta (es. 1 uovo + 25g feta, o legumi + feta).</p>
                <p>• <strong>Verdure al grammo:</strong> ripartizione equa sul totale previsto dal pasto.</p>
                <p>• <strong>Varianti Pranzo / Cena / Post-Workout:</strong> rigenerazione macro e dosi esatte.</p>
              </div>

              {/* Progress Bar & Status */}
              {migrating && progress && (
                <div className="bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 p-3.5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-primary-900 dark:text-primary-200 truncate max-w-[70%]">
                      {progress.title}
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
                    <span>Aggiornamento {progress.current} di {progress.total} ricette…</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleReAdaptAllRecipes}
                disabled={migrating}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
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
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            4. SCHERMATA: BUONI PASTO & SPESA
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'vouchers' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <h2 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                    Configurazione Buoni Pasto
                  </h2>
                </div>
                <input
                  type="checkbox"
                  checked={voucherEnabled}
                  onChange={e => handleToggleVouchers(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-500 accent-primary-500 cursor-pointer"
                />
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Quando sei al supermercato, l&apos;app calcola in tempo reale il totale degli ingredienti presi e ti indica quanti buoni pasto puoi scalare alla cassa e l&apos;eventuale differenza in contanti.
              </p>

              {voucherEnabled && (
                <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    Valore singolo Buono Pasto (€):
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={voucherVal}
                        onChange={e => handleVoucherValueChange(e.target.value)}
                        className="input-field text-sm font-black py-2.5 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        €
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {[7.0, 8.0, 9.5].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleVoucherValueChange(preset.toFixed(2))}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            parseFloat(voucherVal) === preset
                              ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {preset.toFixed(2)}€
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <p className="font-bold">Esempio di conteggio:</p>
                    <p>• Con spesa di 32.00 €: <strong>4 Buoni Pasto</strong> (esatti).</p>
                    <p>• Con spesa di 34.00 €: <strong>4 Buoni Pasto + 2.00 €</strong>.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            5. SCHERMATA: ASPETTO & TEMA
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'appearance' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4 space-y-3">
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>🌗</span>
                <span>Seleziona Tema Visivo</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Personalizza l&apos;esperienza visiva. La modalità scura adotta tonalità grafite morbide studiate per non affaticare la vista di sera.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                    theme === 'light'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">☀️</span>
                  <span>Chiaro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-primary-500 text-white ring-2 ring-primary-500 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">🌙</span>
                  <span>Scuro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                    theme === 'system'
                      ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-600 text-primary-900 dark:text-primary-200 ring-2 ring-primary-400'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span className="text-2xl">🌗</span>
                  <span>Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            6. SCHERMATA: ICONE APP & DESIGN
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'icons' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-4 space-y-3">
              <h2 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>🎨</span>
                <span>Icone App &amp; Stili Realizzati</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                L&apos;icona ufficiale ritrae l&apos;hamburger gourmet su bilancia digitale con dose calibrata (180g).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* 1. Liquid Glass 3D */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 mb-2">
                    <img src="/icons/icon-liquidglass.png" alt="Liquid Glass 3D" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-950/80 px-2 py-0.5 rounded-md mb-1">
                    Liquid Glass 3D
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Predefinita</h4>
                </div>

                {/* 2. Material Design */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 mb-2">
                    <img src="/icons/icon-material.png" alt="Material Design" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md mb-1">
                    Material 3
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">Vettoriale</h4>
                </div>

                {/* 3. Dark Mode */}
                <div className="bg-gray-900 dark:bg-gray-950 text-white border border-gray-800 rounded-2xl p-3 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-gray-700 mb-2">
                    <img src="/icons/icon-dark.png" alt="Dark Mode" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md mb-1">
                    Dark Mode
                  </span>
                  <h4 className="text-xs font-bold text-gray-100">Adattiva Sistema</h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            7. SCHERMATA: PRIVACY & DATI (ESPLICITAMENTE RICHIESTA DALL'UTENTE)
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'privacy' && (
          <div className="space-y-4 animate-fade-in">
            {/* 1. Salvataggio & Backup Anti-Perdita Dati */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xl">
                  💾
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Backup &amp; Anti-Perdita Dati
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Esporta e ripristina le tue ricette e il piano su qualsiasi dispositivo
                  </p>
                </div>
              </div>

              {backupStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold border ${
                  backupStatus.startsWith('✅')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                }`}>
                  {backupStatus}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="btn-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>Esporta Backup Completo (JSON)</span>
                </button>

                <label className="btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                  <span>📤</span>
                  <span>{isImporting ? 'Ripristino in corso…' : 'Ripristina da File Backup'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                    disabled={isImporting}
                  />
                </label>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-bold text-gray-900 dark:text-gray-200">
                  🛡️ Protezione garantita:
                </p>
                <p>
                  Il file JSON scaricato contiene tutti i tuoi dati: ricette salvate, piano nutrizionale completo, meal planner settimanale, lista spesa e dispensa.
                </p>
              </div>
            </div>

            {/* 2. Login con Google & Cloud Sync (Guida e Architettura) */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
                  ☁️
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Sincronizzazione Cloud &amp; Google
                  </h2>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                    Opzioni Cloud per non perdere mai i dati
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <p>
                  Attualmente NutriRecipe funziona in <strong>modalità 100% locale (offline-first)</strong> tramite IndexedDB, garantendo la massima velocità e totale privacy senza intermediari.
                </p>
                <div className="bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/50 space-y-1.5">
                  <p className="font-bold text-blue-950 dark:text-blue-200">
                    🔑 Due modalità possibili per il Login Google:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11.5px]">
                    <li>
                      <strong>Google Drive AppData (Consigliato, 0€ Server):</strong> L&apos;app si collega al tuo account Google e sincronizza il database nella cartella invisibile del tuo Google Drive personale, senza bisogno di server remoti a pagamento.
                    </li>
                    <li>
                      <strong>Firebase / Supabase Auth con Google:</strong> Accesso istantaneo con Google e sincronizzazione su database Firestore / Postgres con backup multi-dispositivo automatico.
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 3. Architettura e Privacy */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
                  🔒
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Privacy &amp; Protezione Dati
                  </h2>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    Architettura 100% Locale (Client-Side)
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                    📁 Dove risiedono i tuoi dati:
                  </p>
                  <p>
                    Tutti i piani nutrizionali, le ricette importate, il meal planner settimanale, la lista della spesa e la memoria dei prezzi risiedono <strong>esclusivamente nel database locale del tuo dispositivo (IndexedDB)</strong>.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1.5">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                    🚫 Zero tracciamento e zero server terzi:
                  </p>
                  <p>
                    Non esistono server proprietari di tracciamento o database remoti. Nessuno all&apos;infuori di te ha accesso ai tuoi dati sanitari o alimentari.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            8. SCHERMATA: ALTRE INFO (ESPLICITAMENTE RICHIESTA DALL'UTENTE)
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'about' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xl">
                  ℹ️
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    NutriRecipe PWA
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Versione {APP_VERSION} (Build produzione)
                  </p>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-gray-500">Versione applicazione</span>
                  <span className="font-black bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2.5 py-0.5 rounded-lg border border-primary-200 dark:border-primary-800">
                    v{APP_VERSION}
                  </span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-gray-500">Tecnologia</span>
                  <span className="font-bold">Progressive Web App (PWA)</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-gray-500">Database</span>
                  <span className="font-bold">Dexie.js IndexedDB v4</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-gray-500">Supporto Offline</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Attivo (Service Worker)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangelog(true)}
                  className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <span>📜</span>
                  <span>Visualizza Cronologia Aggiornamenti</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            9. SCHERMATA: GUIDA INSTALLAZIONE PWA
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'install' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📱</span>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Come Installare NutriRecipe
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Esperienza nativa a schermo intero
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="font-extrabold text-gray-900 dark:text-gray-100">
                    🍏 Su iPhone (Safari):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>Apri il sito in <strong>Safari</strong> su iPhone.</li>
                    <li>Tocca il pulsante <strong>Condividi</strong> (icona quadrato con freccia in su).</li>
                    <li>Scorri in basso e tocca <strong>"Aggiungi alla schermata Home"</strong>.</li>
                    <li>Conferma toccando <strong>"Aggiungi"</strong> in alto a destra.</li>
                  </ol>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="font-extrabold text-gray-900 dark:text-gray-100">
                    🤖 Su Android (Chrome):
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1">
                    <li>Apri il sito in <strong>Chrome</strong>.</li>
                    <li>Tocca i <strong>3 puntini in alto a destra</strong>.</li>
                    <li>Seleziona <strong>"Aggiungi a schermata Home"</strong> o "Installa App".</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            10. SCHERMATA: SERVIZI & API (GESTIONE AI PERSONALE / BYOK)
           ═════════════════════════════════════════════════════════════════════ */}
        {currentSection === 'api' && (
          <div className="space-y-4 animate-fade-in">
            {/* Status Accesso Amministratore (Michele) */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              isAdminLoggedIn()
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
                : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl">{isAdminLoggedIn() ? '👑' : '🔒'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    {isAdminLoggedIn() ? 'Autenticato come Amministratore (Michele)' : 'Accesso Amministratore (Server Vercel)'}
                  </p>
                  <p className="text-[10.5px] opacity-80 truncate">
                    {isAdminLoggedIn()
                      ? 'Tutte le chiamate AI utilizzano le chiavi centrali del tuo server Vercel'
                      : 'Accedi con la master password per usare le chiavi configurate su Vercel'}
                  </p>
                </div>
              </div>

              {isAdminLoggedIn() ? (
                <button
                  type="button"
                  onClick={() => {
                    logoutAdmin()
                    setAiConfig(getUserAiConfig())
                  }}
                  className="text-xs font-bold text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/60 transition-all active:scale-95 flex-shrink-0"
                >
                  Disconnetti
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminModal(true)}
                  className="text-xs font-bold text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 transition-all active:scale-95 flex-shrink-0"
                >
                  Accedi
                </button>
              )}
            </div>

            {/* 1. Centro di Controllo AI Personale (Zero Costi per lo Sviluppatore) */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤖</span>
                  <h2 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                    Motore AI &amp; Chiavi Personali
                  </h2>
                </div>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  BYOK
                </span>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
                <p className="font-bold text-gray-900 dark:text-gray-200">
                  💡 Autonomia &amp; Zero Costi Centralizzati:
                </p>
                <p>
                  Per non sostenere spese di API per tutti gli utenti dell&apos;app, puoi usare l&apos;algoritmo deterministico integrato a 0€, oppure collegare il tuo account <strong>Google Gemini (gratuito)</strong> o OpenAI.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block">
                  Seleziona Provider AI
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1: Deterministico Locale */}
                  <div
                    onClick={() => handleUpdateAiProvider('deterministic')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      aiConfig.provider === 'deterministic'
                        ? 'bg-primary-50/70 dark:bg-primary-950/40 border-primary-500 ring-1 ring-primary-500'
                        : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚡</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                          Algoritmo Deterministico Locale (Consigliato)
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        100% Gratis &amp; Offline
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
                      Elaborazione istantanea sul dispositivo, 0€ di costi, zero dipendenza da server esterni o chiavi API.
                    </p>
                  </div>

                  {/* Option 2: Google Gemini (Account Personale) */}
                  <div
                    onClick={() => handleUpdateAiProvider('gemini')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      aiConfig.provider === 'gemini'
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                          Google Gemini (Chiave Personale Gratuita)
                        </span>
                      </div>
                      <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        15 req/min Gratis
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
                      Utilizza il tuo account Google tramite Google AI Studio. 0€ di costi per lo sviluppatore.
                    </p>
                  </div>

                  {/* Option 3: OpenAI ChatGPT */}
                  <div
                    onClick={() => handleUpdateAiProvider('openai')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      aiConfig.provider === 'openai'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                          OpenAI ChatGPT (GPT-4o)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        Chiave Utente
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-6">
                      Inserisci la tua chiave API personale OpenAI per consumare il tuo credito.
                    </p>
                  </div>
                </div>
              </div>

              {/* Gemini Configuration Panel */}
              {aiConfig.provider === 'gemini' && (
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 space-y-3 animate-fade-in">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-1">
                      Chiave API Google Gemini personale
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        value={aiConfig.geminiApiKey}
                        onChange={e => handleUpdateGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full text-xs font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                      >
                        {showGeminiKey ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Modello:</label>
                      <select
                        value={aiConfig.geminiModel}
                        onChange={e => handleUpdateGeminiModel(e.target.value)}
                        className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                      >
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Gratuito &amp; Ultra-rapido)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Massima precisione)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testingGemini || !aiConfig.geminiApiKey}
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-xs"
                    >
                      {testingGemini ? 'Verifica in corso…' : '⚡ Verifica Chiave'}
                    </button>
                  </div>

                  {geminiTestStatus && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold border ${
                      geminiTestStatus.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}>
                      {geminiTestStatus.message}
                    </div>
                  )}

                  <div className="bg-white/80 dark:bg-gray-900/60 p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-gray-700 dark:text-gray-300 space-y-1">
                    <p className="font-bold text-blue-900 dark:text-blue-300">
                      🚀 Come ottenere la chiave Gemini 100% GRATIS (nessuna carta richiesta):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Apri <strong>aistudio.google.com</strong> con il tuo account Google normale.</li>
                      <li>Fai clic sul pulsante azzurro <strong>"Get API key"</strong> in alto a sinistra.</li>
                      <li>Clicca su <strong>"Create API key"</strong> e copiala.</li>
                      <li>Incolla la chiave nella casella qui sopra: Google ti riserva <strong>15 richieste al minuto gratuite per sempre</strong>!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* OpenAI Configuration Panel */}
              {aiConfig.provider === 'openai' && (
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-3 animate-fade-in">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-1">
                      Chiave API OpenAI personale
                    </label>
                    <div className="relative">
                      <input
                        type={showOpenAiKey ? 'text' : 'password'}
                        value={aiConfig.openaiApiKey}
                        onChange={e => handleUpdateOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full text-xs font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 pr-10 focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                      >
                        {showOpenAiKey ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Modello:</label>
                    <select
                      value={aiConfig.openaiModel}
                      onChange={e => handleUpdateOpenAiModel(e.target.value)}
                      className="text-xs font-bold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-800 dark:text-gray-200"
                    >
                      <option value="gpt-4o">GPT-4o (Massima qualità)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Economico)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Servizi Connessi (RapidAPI & Server Status) */}
            <div className="card p-5 space-y-3">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                Servizi Accessori
              </h3>

              <div className="space-y-2 pt-1">
                {/* RapidAPI */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📸</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        RapidAPI Social Scraper
                      </p>
                      <p className="text-[10px] text-gray-400">Instagram, TikTok &amp; YouTube</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {hasRapidAPI ? 'Attivo ✓' : 'Disattivato'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />

      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => setAiConfig(getUserAiConfig())}
      />
    </div>
  )
}
