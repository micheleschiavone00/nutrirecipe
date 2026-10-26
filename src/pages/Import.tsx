import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db, getActiveProfile } from '@/lib/db'
import { extractVideoMetadata, detectSource } from '@/lib/social'
import { extractRecipeFromText, adaptRecipeToProfile } from '@/lib/ai'
import { generateId, MEAL_LABELS, MEAL_ICONS } from '@/lib/utils'
import { PageHeader, LoadingSpinner, Badge, NutriBar } from '@/components/ui'
import type { Recipe, MealType, TargetMealType, ImportStatus, NutritionProfile } from '@/types'

const MEAL_OPTIONS: { value: TargetMealType; label: string }[] = [
  { value: 'lunch_dinner', label: '☀️🌙 Pranzo e Cena' },
  { value: 'lunch', label: '☀️ Pranzo' },
  { value: 'dinner', label: '🌙 Cena' },
  { value: 'breakfast', label: '🌅 Colazione' },
  { value: 'snack_am', label: '🍎 Spuntino mattina' },
  { value: 'snack_pm', label: '🍪 Merenda' },
]

const STATUS_MESSAGES: Record<ImportStatus, string> = {
  idle: '',
  extracting: '📡 Estraggo info dal video…',
  analyzing: '🤖 L\'AI analizza la ricetta…',
  adapting: '⚖️ Adatto al tuo piano nutrizionale…',
  done: '✅ Ricetta pronta!',
  error: '❌ Errore',
}

function cleanPastedUrl(text: string): string {
  if (!text) return ''
  const trimmed = text.trim()
  const match = trimmed.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : trimmed
}

export default function ImportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [url, setUrl] = useState('')
  const [targetMeal, setTargetMeal] = useState<TargetMealType>('lunch_dinner')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState('')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [profile, setProfile] = useState<NutritionProfile | null>(null)

  // Handle share target (URL comes from ?url=... query param)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sharedUrl = params.get('url') || params.get('text') || ''
    if (sharedUrl) {
      setUrl(cleanPastedUrl(sharedUrl))
    }
    const mealParam = params.get('meal') as TargetMealType | null
    if (mealParam && ['breakfast', 'snack_am', 'lunch', 'dinner', 'lunch_dinner', 'snack_pm'].includes(mealParam)) {
      setTargetMeal(mealParam)
    }
    getActiveProfile().then(p => p && setProfile(p))
  }, [location])

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(cleanPastedUrl(text))
      }
    } catch {
      // ignore clipboard permission error
    }
  }

  const handleImport = async () => {
    const cleanUrl = cleanPastedUrl(url)
    if (!cleanUrl) {
      setError('Inserisci o incolla un link valido (es. Instagram o TikTok)')
      return
    }

    setError('')
    setRecipe(null)

    try {
      setStatus('extracting')
      const source = detectSource(cleanUrl)
      const metadata = await extractVideoMetadata(cleanUrl)

      setStatus('analyzing')
      const rawText = [
        metadata.title,
        metadata.description,
        metadata.transcript ?? '',
        ...(metadata.ingredients ?? []),
      ].join('\n')

      const rawRecipe = await extractRecipeFromText(rawText, cleanUrl)

      // Se l'utente ha configurato il piano nutrizionale, adattiamo le porzioni!
      if (profile && profile.meals && profile.meals.length > 0) {
        setStatus('adapting')
        const adapted = await adaptRecipeToProfile(
          {
            ...rawRecipe,
            thumbnailUrl: metadata.thumbnailUrl,
            sourceUrl: cleanUrl,
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
      } else {
        // Nessun profilo nutrizionale configurato: mostra gli ingredienti originali estratti dal video
        const fallbackRecipe: Recipe = {
          id: generateId(),
          title: rawRecipe.title || metadata.title || 'Ricetta importata',
          description: rawRecipe.description || metadata.description || '',
          source,
          sourceUrl: cleanUrl,
          thumbnailUrl: metadata.thumbnailUrl,
          targetMeal,
          originalIngredients: rawRecipe.ingredients.map(ing => ({
            name: ing,
            originalQuantity: '',
            adaptedQuantity: '',
            unit: '',
            category: 'other',
            isOptional: false,
          })),
          adaptedIngredients: rawRecipe.ingredients.map(ing => ({
            name: ing,
            originalQuantity: '',
            adaptedQuantity: ing,
            unit: '',
            category: 'other',
            isOptional: false,
          })),
          steps: rawRecipe.steps.map((step, i) => ({
            order: i + 1,
            description: step,
          })),
          adaptationNotes:
            'Piano nutrizionale non ancora configurato: visualizzo gli ingredienti originali estratti dal video. Configura il piano in Setup per adattare automaticamente le porzioni.',
          tags: ['social', source],
          servings: 1,
          isFavorite: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setRecipe(fallbackRecipe)
      }

      setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore durante l\'importazione della ricetta')
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
        {/* Profile notification banner if no profile */}
        {!profile && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <p className="text-xs text-amber-800">
                Piano nutrizionale non configurato: la ricetta verrà importata con le quantità originali del video.
              </p>
            </div>
            <button
              onClick={() => navigate('/setup')}
              className="text-xs bg-amber-600 text-white font-semibold px-2.5 py-1.5 rounded-xl whitespace-nowrap hover:bg-amber-700"
            >
              Configura
            </button>
          </div>
        )}

        {/* URL input */}
        <div className="card p-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Link del video 🔗
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Incolla link Instagram o TikTok..."
              value={url}
              onChange={e => setUrl(cleanPastedUrl(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && handleImport()}
              className="input-field flex-1"
              disabled={isLoading}
            />
            {url ? (
              <button
                onClick={() => setUrl('')}
                className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-xl bg-gray-100 hover:bg-gray-200"
              >
                ✕
              </button>
            ) : (
              typeof navigator !== 'undefined' &&
              navigator.clipboard && (
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-3 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 whitespace-nowrap"
                >
                  📋 Incolla
                </button>
              )
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
          className="btn-primary w-full text-base py-3"
        >
          {isLoading ? 'Elaborazione in corso…' : '🤖 Importa Ricetta'}
        </button>

        {/* Status */}
        {isLoading && (
          <div className="card p-6 flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-medium text-gray-900">{STATUS_MESSAGES[status]}</p>
              <p className="text-xs text-gray-400 mt-1">Questo può richiedere 5-15 secondi</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-700"
                style={{
                  width: status === 'extracting' ? '33%' : status === 'analyzing' ? '66%' : '90%',
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="card p-4 border-red-200 bg-red-50">
            <p className="text-red-600 font-medium text-sm">❌ {error}</p>
            <p className="text-red-400 text-xs mt-1">Verifica che il link sia valido e riprova.</p>
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
                <span className="text-2xl">{MEAL_ICONS[recipe.targetMeal]}</span>
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
                <p className="text-xs font-semibold text-primary-700 mb-1">📋 Dettagli ricetta</p>
                <p className="text-sm text-primary-900">{recipe.adaptationNotes}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Ingredienti
                </p>
                <div className="space-y-1.5">
                  {recipe.adaptedIngredients.slice(0, 6).map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{ing.name}</span>
                      <span className="font-semibold text-primary-700">
                        {ing.adaptedQuantity || ing.originalQuantity}
                      </span>
                    </div>
                  ))}
                  {recipe.adaptedIngredients.length > 6 && (
                    <p className="text-xs text-gray-400">
                      +{recipe.adaptedIngredients.length - 6} altri…
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setRecipe(null)
                    setStatus('idle')
                  }}
                  className="btn-secondary flex-1"
                >
                  Importa un'altra
                </button>
                <button onClick={saveRecipe} className="btn-primary flex-1">
                  Salva nel Ricettario 💾
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
              <li>Copia il link del video da Instagram o TikTok</li>
              <li>Incolla il link qui sopra e tocca <strong>"Importa Ricetta"</strong></li>
              <li>L'AI estrarrà titolo, passaggi e tutti gli ingredienti</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
