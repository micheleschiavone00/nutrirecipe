import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db, getActiveProfile } from '@/lib/db'
import { extractVideoMetadata, detectSource } from '@/lib/social'
import { extractRecipeFromText, adaptRecipeToProfile } from '@/lib/ai'
import { generateId, MEAL_LABELS } from '@/lib/utils'
import { PageHeader, LoadingSpinner, Badge, NutriBar } from '@/components/ui'
import type { Recipe, MealType, ImportStatus, NutritionProfile } from '@/types'

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '🌅 Colazione' },
  { value: 'snack_am', label: '🍎 Spuntino mattina' },
  { value: 'lunch', label: '☀️ Pranzo' },
  { value: 'snack_pm', label: '🍪 Merenda' },
  { value: 'dinner', label: '🌙 Cena' },
]

const STATUS_MESSAGES: Record<ImportStatus, string> = {
  idle: '',
  extracting: '📡 Estraggo info dal video…',
  analyzing: '🤖 L\'AI analizza la ricetta…',
  adapting: '⚖️ Adatto al tuo piano nutrizionale…',
  done: '✅ Ricetta pronta!',
  error: '❌ Errore',
}

export default function ImportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [url, setUrl] = useState('')
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState('')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [profile, setProfile] = useState<NutritionProfile | null>(null)

  // Handle share target (URL comes from ?url=... query param)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sharedUrl = params.get('url') || params.get('text') || ''
    if (sharedUrl && sharedUrl.startsWith('http')) {
      setUrl(sharedUrl)
    }
    getActiveProfile().then(p => p && setProfile(p))
  }, [location])

  const handleImport = async () => {
    if (!url.trim()) { setError('Inserisci un link'); return }
    if (!profile) { setError('Nessun profilo configurato. Vai in Setup.'); return }

    setError('')
    setRecipe(null)

    try {
      setStatus('extracting')
      const source = detectSource(url)
      const metadata = await extractVideoMetadata(url)

      setStatus('analyzing')
      const rawText = [
        metadata.title,
        metadata.description,
        metadata.transcript ?? '',
        ...(metadata.ingredients ?? []),
      ].join('\n')

      const rawRecipe = await extractRecipeFromText(rawText, url)

      setStatus('adapting')
      const adapted = await adaptRecipeToProfile(
        {
          ...rawRecipe,
          thumbnailUrl: metadata.thumbnailUrl,
          sourceUrl: url,
          source,
        },
        profile,
        targetMeal,
      )

      const finalRecipe: Recipe = {
        ...adapted,
        id: generateId(),
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setRecipe(finalRecipe)
      setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
      setStatus('error')
    }
  }

  const saveRecipe = async () => {
    if (!recipe) return
    await db.recipes.add(recipe)
    navigate(`/recipes/${recipe.id}`)
  }

  const isLoading = ['extracting', 'analyzing', 'adapting'].includes(status)

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Importa Ricetta"
        subtitle="Da TikTok, Instagram o YouTube"
      />

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* URL input */}
        <div className="card p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Link del video 🔗
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://www.tiktok.com/@..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="input-field flex-1"
              disabled={isLoading}
            />
            {url && (
              <button
                onClick={() => setUrl('')}
                className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-xl bg-gray-100"
              >
                ✕
              </button>
            )}
          </div>

          {url && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Fonte rilevata:</span>
              <Badge variant="default">{detectSource(url)}</Badge>
            </div>
          )}
        </div>

        {/* Meal selector */}
        <div className="card p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Per quale pasto? 🍽️
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTargetMeal(opt.value)}
                className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  targetMeal === opt.value
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={isLoading || !url.trim()}
          className="btn-primary w-full"
        >
          {isLoading ? 'Elaborazione…' : '🤖 Importa e Adatta'}
        </button>

        {/* Status */}
        {isLoading && (
          <div className="card p-6 flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-medium text-gray-900">{STATUS_MESSAGES[status]}</p>
              <p className="text-xs text-gray-400 mt-1">Questo può richiedere 10-20 secondi</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-700"
                style={{
                  width: status === 'extracting' ? '33%' : status === 'analyzing' ? '66%' : '90%'
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="card p-4 border-red-200 bg-red-50">
            <p className="text-red-600 font-medium text-sm">❌ {error}</p>
            <p className="text-red-400 text-xs mt-1">Controlla l'API key nelle impostazioni e riprova.</p>
          </div>
        )}

        {/* Result preview */}
        {recipe && status === 'done' && (
          <div className="card overflow-hidden animate-slide-up">
            {recipe.thumbnailUrl && (
              <img
                src={recipe.thumbnailUrl}
                alt={recipe.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">{recipe.title}</h2>
                <span className="text-2xl">{MEAL_LABELS[recipe.targetMeal].split(' ')[0]}</span>
              </div>

              {recipe.nutritionalValues && (
                <NutriBar
                  calories={recipe.nutritionalValues.calories}
                  proteins={recipe.nutritionalValues.proteins}
                  carbs={recipe.nutritionalValues.carbs}
                  fats={recipe.nutritionalValues.fats}
                />
              )}

              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-primary-700 mb-1">📋 Note adattamento AI</p>
                <p className="text-sm text-primary-900">{recipe.adaptationNotes}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredienti adattati</p>
                <div className="space-y-1.5">
                  {recipe.adaptedIngredients.slice(0, 5).map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{ing.name}</span>
                      <span className="font-semibold text-primary-700">{ing.adaptedQuantity}</span>
                    </div>
                  ))}
                  {recipe.adaptedIngredients.length > 5 && (
                    <p className="text-xs text-gray-400">+{recipe.adaptedIngredients.length - 5} altri…</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setRecipe(null); setStatus('idle') }} className="btn-secondary flex-1">
                  Modifica
                </button>
                <button onClick={saveRecipe} className="btn-primary flex-1">
                  Salva Ricetta 💾
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tip box */}
        {status === 'idle' && !recipe && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">💡 Come usare</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Su TikTok/Instagram, tocca <strong>Condividi</strong></li>
              <li>Seleziona <strong>NutriRecipe</strong> dal menu</li>
              <li>L'app importa e adatta automaticamente la ricetta</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
