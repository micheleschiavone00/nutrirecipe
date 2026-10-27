import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { db, getActiveProfile } from '@/lib/db'
import { extractVideoMetadata, detectSource } from '@/lib/social'
import { extractRecipeFromText, adaptRecipeToProfile } from '@/lib/ai'
import { extractRecipeDeterministically } from '@/lib/deterministicSocialExtractor'
import { getUserAiConfig } from '@/lib/userAiSettings'
import { isAdminLoggedIn } from '@/lib/adminAuth'
import { generateId, MEAL_LABELS, MEAL_ICONS } from '@/lib/utils'
import { PageHeader, LoadingSpinner, Badge, NutriBar } from '@/components/ui'
import { detectRecipeIcon } from '@/lib/recipeIcons'
import RecipeIconPickerModal from '@/components/RecipeIconPickerModal'
import {
  adaptIngredientsDeterministically,
  generateVariantsDeterministically,
  suggestIngredientsFromTitle,
  detectDishType,
  classifyIngredientCategory,
  calculateNutritionalValues,
  getGroupAllowanceAndUsage,
  getMealSpecificIngredientSuggestions,
  parseFoodQuantityAndUnit,
  findFoodInNutritionPlan,
  isEgg,
  type GroupCapacityInfo,
} from '@/lib/deterministicRecipeAdapter'
import type {
  Recipe,
  TargetMealType,
  ImportStatus,
  NutritionProfile,
  DishType,
  RecipeIngredient,
} from '@/types'

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
  analyzing: '🤖 Analisi ingredienti ricetta…',
  adapting: '⚖️ Calibrazione dosi con algoritmo nutrizionale…',
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

  // Mode: 'create' (ad-hoc manual) vs 'social' (Instagram/TikTok URL)
  const [mode, setMode] = useState<'create' | 'social'>('create')

  // Shared state
  const [profile, setProfile] = useState<NutritionProfile | null>(null)
  const [targetMeal, setTargetMeal] = useState<TargetMealType>('lunch_dinner')

  // ── Ad-Hoc Creation State ──────────────────────────────────────────────────
  const [adHocTitle, setAdHocTitle] = useState('')
  const [adHocDishType, setAdHocDishType] = useState<DishType>('main')
  const [adHocIngredients, setAdHocIngredients] = useState<
    { name: string; category?: RecipeIngredient['category']; customQuantity?: string }[]
  >([])
  const [adHocIcon, setAdHocIcon] = useState('🍽️')
  const [isManualIcon, setIsManualIcon] = useState(false)
  const [isIconModalOpen, setIsIconModalOpen] = useState(false)
  const [newIngredientInput, setNewIngredientInput] = useState('')
  const [adHocNotes, setAdHocNotes] = useState('')
  const [isSavingAdHoc, setIsSavingAdHoc] = useState(false)
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null)

  // ── Social Import State ────────────────────────────────────────────────────
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [error, setError] = useState('')
  const [importedRecipe, setImportedRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sharedUrl = params.get('url') || params.get('text') || ''
    if (sharedUrl) {
      setUrl(cleanPastedUrl(sharedUrl))
      setMode('social')
    }
    const mealParam = params.get('meal') as TargetMealType | null
    if (mealParam && ['breakfast', 'snack_am', 'lunch', 'dinner', 'lunch_dinner', 'snack_pm'].includes(mealParam)) {
      setTargetMeal(mealParam)
    }
    getActiveProfile().then(p => p && setProfile(p))
  }, [location])

  // Applicable meals in profile for the current targetMeal (includes variants like "Cena Post Workout")
  const applicableMeals = useMemo(() => {
    if (!profile || !profile.meals) return []
    if (targetMeal === 'lunch_dinner') {
      return profile.meals.filter(m => m.mealType === 'lunch' || m.mealType === 'dinner')
    }
    return profile.meals.filter(m => m.mealType === targetMeal)
  }, [profile, targetMeal])

  // Active Meal Plan reference based on targetMeal or user-selected specific alternative
  const activeMealPlan = useMemo(() => {
    if (selectedMealPlanId) {
      const found = applicableMeals.find(m => m.id === selectedMealPlanId)
      if (found) return found
    }
    return applicableMeals[0] || profile?.meals[0]
  }, [applicableMeals, selectedMealPlanId, profile])

  // Reset selected variant if targetMeal changes to an incompatible meal
  useEffect(() => {
    if (selectedMealPlanId && !applicableMeals.some(m => m.id === selectedMealPlanId)) {
      setSelectedMealPlanId(null)
    }
  }, [targetMeal, applicableMeals, selectedMealPlanId])

  // Suggested ingredients based on meal type (colazione -> latte, yogurt, avena, cioccolato fondente 15g; pranzo -> salmone, patate 200g, ecc.)
  const suggestedIngredients = useMemo(() => {
    const all = getMealSpecificIngredientSuggestions(targetMeal, profile || undefined, adHocTitle)
    // Filter out already added ingredients
    return all.filter(
      s => !adHocIngredients.some(existing => existing.name.toLowerCase() === s.name.toLowerCase())
    )
  }, [targetMeal, profile, adHocTitle, adHocIngredients])

  // Auto-detect recipe icon from title or ingredients unless manually set
  useEffect(() => {
    if (!isManualIcon) {
      const detected = detectRecipeIcon(adHocTitle, adHocIngredients, targetMeal)
      setAdHocIcon(detected)
    }
  }, [adHocTitle, adHocIngredients, targetMeal, isManualIcon])

  // Deterministic live adaptation preview for Ad-Hoc creation
  const adHocAdaptedPreview = useMemo(() => {
    if (adHocIngredients.length === 0) return []

    const adapted = adaptIngredientsDeterministically(
      adHocIngredients.map(i => ({ name: i.name, category: i.category })),
      activeMealPlan,
      { sideDishMode: adHocDishType === 'side' }
    )

    // Se l'utente ha modificato manualmente la dose dell'ingrediente, applicala come override
    return adapted.map((item, idx) => {
      const custom = adHocIngredients[idx]?.customQuantity
      if (custom && custom.trim()) {
        return {
          ...item,
          adaptedQuantity: custom.trim(),
        }
      }
      return item
    })
  }, [adHocIngredients, activeMealPlan, adHocDishType])

  // Live accurate nutritional values calculation using centralized deterministic logic
  // (Prevents the 1023 kcal salmon bug caused by string regex concatenation)
  const adHocNutritionalValues = useMemo(() => {
    if (adHocAdaptedPreview.length === 0) {
      return { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    }
    return calculateNutritionalValues(adHocAdaptedPreview)
  }, [adHocAdaptedPreview])

  // Group allowance and capacity feedback for user awareness
  const adHocGroupCapacities = useMemo(() => {
    if (adHocAdaptedPreview.length === 0 || !activeMealPlan) return []
    const categoriesPresent = Array.from(
      new Set(adHocAdaptedPreview.map(i => i.category || 'other'))
    ).filter(c => c !== 'other')

    return categoriesPresent.map(cat =>
      getGroupAllowanceAndUsage(activeMealPlan, cat, adHocAdaptedPreview, {
        isVariantOrAlternative: Boolean(activeMealPlan.isVariant),
        suppressExceededBanner: Boolean(activeMealPlan.isVariant),
      })
    )
  }, [adHocAdaptedPreview, activeMealPlan])

  // Add ingredient to ad-hoc list (searches nutrition plan first!)
  const handleAddIngredient = (name: string, category?: RecipeIngredient['category'], customQuantity?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (adHocIngredients.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) return

    // 1. Cerca direttamente nel piano nutrizionale attivo dell'utente
    const planMatch = findFoodInNutritionPlan(trimmed, activeMealPlan, profile)
    const cat = category || planMatch?.category || classifyIngredientCategory(trimmed)
    const initialQty = customQuantity || (planMatch ? `${planMatch.quantity}${planMatch.unit || 'g'}` : undefined)

    setAdHocIngredients(prev => [
      ...prev,
      {
        name: trimmed,
        category: cat,
        customQuantity: initialQty,
      }
    ])
    setNewIngredientInput('')
  }

  const handleRemoveIngredient = (idx: number) => {
    setAdHocIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  // Modifica rapida della categoria di un ingrediente (es. da "other" a "carbs" per il cous cous)
  const handleIngredientCategoryChange = (idx: number, newCat: RecipeIngredient['category']) => {
    setAdHocIngredients(prev =>
      prev.map((ing, i) => (i === idx ? { ...ing, category: newCat } : ing))
    )
  }

  // Modifica manuale del testo della quantità
  const handleIngredientQtyChange = (idx: number, newQty: string) => {
    setAdHocIngredients(prev =>
      prev.map((ing, i) => (i === idx ? { ...ing, customQuantity: newQty } : ing))
    )
  }

  // Regolazione rapida dose con bottoni +/-
  const handleIngredientStepQty = (idx: number, delta: number) => {
    setAdHocIngredients(prev =>
      prev.map((ing, i) => {
        if (i !== idx) return ing
        const currentQtyStr = ing.customQuantity || adHocAdaptedPreview[idx]?.adaptedQuantity || '100g'
        const parsed = parseFoodQuantityAndUnit(ing.name, currentQtyStr)
        const isEggFood = isEgg(ing.name) || ing.name.toLowerCase().includes('uov')

        if (isEggFood && (parsed.unit.includes('uov') || !currentQtyStr.includes('g'))) {
          const stepDelta = delta > 0 ? 1 : -1
          const nextEggs = Math.max(1, parsed.eggCount + stepDelta)
          return { ...ing, customQuantity: nextEggs === 1 ? '1 uovo' : `${nextEggs} uova` }
        }

        const nextGrams = Math.max(5, parsed.grams + delta)
        return { ...ing, customQuantity: `${nextGrams}g` }
      })
    )
  }

  // Save Ad-Hoc Recipe
  const handleSaveAdHoc = async () => {
    if (!adHocTitle.trim()) {
      alert('Inserisci un titolo per la ricetta')
      return
    }
    if (adHocIngredients.length === 0) {
      alert('Aggiungi almeno un ingrediente')
      return
    }

    setIsSavingAdHoc(true)
    try {
      const detectedType = adHocDishType || detectDishType(adHocIngredients)

      const steps = adHocNotes.trim()
        ? adHocNotes
            .split('\n')
            .filter(Boolean)
            .map((line, idx) => ({ order: idx + 1, description: line.trim() }))
        : []

      const variants = profile
        ? generateVariantsDeterministically(
            adHocTitle.trim(),
            adHocIngredients,
            profile,
            targetMeal,
            steps
          )
        : []

      const newRecipe: Recipe = {
        id: generateId(),
        title: adHocTitle.trim(),
        customIcon: adHocIcon,
        description: adHocNotes.trim() || undefined,
        source: 'manual',
        targetMeal,
        dishType: detectedType,
        originalIngredients: adHocAdaptedPreview.map(i => ({
          ...i,
          originalQuantity: i.adaptedQuantity,
        })),
        adaptedIngredients: adHocAdaptedPreview,
        steps,
        nutritionalValues: adHocNutritionalValues,
        variants: variants.length > 0 ? variants : undefined,
        tags: [
          'manuale',
          detectedType === 'side' ? 'contorno' : 'piatto principale',
          ...(adHocIngredients.some(i => i.category === 'vegetables') ? ['verdure'] : []),
        ],
        servings: 1,
        isFavorite: false,
        adaptationNotes:
          detectedType === 'side'
            ? 'Contorno di verdure calibrato sul piano nutrizionale. Nel Meal Planner puoi abbinarlo a un secondo piatto.'
            : 'Ricetta calibrata con algoritmo deterministico (proteine e verdure bilanciate esattamente sul tuo piano).',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.recipes.add(newRecipe)
      navigate(`/recipes/${newRecipe.id}`)
    } catch (e: unknown) {
      console.error('Error saving ad hoc recipe:', e)
      alert('Errore durante il salvataggio della ricetta')
    } finally {
      setIsSavingAdHoc(false)
    }
  }

  // ── Social Import Handler ──────────────────────────────────────────────────
  const buildDeterministicImportedRecipe = (
    rawRecipe: { title: string; description: string; ingredients: string[]; steps: string[] },
    metadata: any,
    cleanUrl: string,
    source: any,
    applicableMeal: any,
    meal: TargetMealType
  ): Recipe => {
    const rawIngredientsList = rawRecipe.ingredients.map(ing => ({
      name: ing,
      category: classifyIngredientCategory(ing),
    }))

    const deterministicIngredients = adaptIngredientsDeterministically(
      rawIngredientsList,
      applicableMeal
    )

    const macros = calculateNutritionalValues(deterministicIngredients)

    return {
      id: generateId(),
      title: rawRecipe.title || metadata.title || 'Ricetta importata',
      customIcon: detectRecipeIcon(rawRecipe.title || metadata.title || '', deterministicIngredients, meal),
      description: rawRecipe.description || metadata.description || '',
      source,
      sourceUrl: cleanUrl,
      thumbnailUrl: metadata.thumbnailUrl,
      targetMeal: meal,
      dishType: detectDishType(deterministicIngredients),
      originalIngredients: deterministicIngredients.map(i => ({
        ...i,
        originalQuantity: i.adaptedQuantity,
      })),
      adaptedIngredients: deterministicIngredients,
      steps: rawRecipe.steps.map((step, i) => ({
        order: i + 1,
        description: step,
      })),
      nutritionalValues: macros,
      adaptationNotes:
        'Calibrata con algoritmo nutrizionale deterministico: grammature adattate fedelmente al tuo piano nutrizionale.',
      tags: ['social', source],
      servings: 1,
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setUrl(cleanPastedUrl(text))
    } catch {
      // ignore
    }
  }

  const handleImportSocial = async () => {
    const cleanUrl = cleanPastedUrl(url)
    if (!cleanUrl) {
      setError('Inserisci o incolla un link valido (Instagram, TikTok o YouTube)')
      return
    }

    setError('')
    setImportedRecipe(null)

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

      const userAiConfig = getUserAiConfig()
      const isAdmin = isAdminLoggedIn()
      const canUseAI = isAdmin || (userAiConfig.provider === 'gemini' && Boolean(userAiConfig.geminiApiKey)) || (userAiConfig.provider === 'openai' && Boolean(userAiConfig.openaiApiKey))

      let rawRecipe: {
        title: string
        description: string
        ingredients: string[]
        steps: string[]
      }

      if (canUseAI && userAiConfig.provider !== 'deterministic') {
        try {
          rawRecipe = await extractRecipeFromText(rawText, cleanUrl)
        } catch (aiErr) {
          console.warn('AI extraction failed or unavailable, using deterministic social extractor:', aiErr)
          rawRecipe = extractRecipeDeterministically(rawText, cleanUrl)
        }
      } else {
        // Pure Deterministic extraction from Instagram caption!
        rawRecipe = extractRecipeDeterministically(rawText, cleanUrl)
      }

      // Fallback if ingredients list is empty
      if (!rawRecipe.ingredients || rawRecipe.ingredients.length === 0) {
        const titleSuggestions = suggestIngredientsFromTitle(rawRecipe.title || metadata.title || '')
        if (titleSuggestions.length > 0) {
          rawRecipe.ingredients = titleSuggestions.map(s => s.defaultGrams ? `${s.defaultGrams} ${s.name}` : s.name)
        } else {
          rawRecipe.ingredients = ['Porzione secondo piano nutrizionale']
        }
      }

      setStatus('adapting')

      // Use AI adaptation with Deterministic Fallback & Validation
      let finalRecipe: Recipe
      const applicableMeal = profile?.meals.find(
        m => m.mealType === targetMeal || (targetMeal === 'lunch_dinner' && (m.mealType === 'lunch' || m.mealType === 'dinner'))
      ) || profile?.meals[0]

      if (canUseAI && userAiConfig.provider !== 'deterministic' && profile && profile.meals?.length > 0) {
        try {
          const adapted = await adaptRecipeToProfile(
            {
              ...rawRecipe,
              thumbnailUrl: metadata.thumbnailUrl,
              sourceUrl: cleanUrl,
              source,
            },
            profile,
            targetMeal
          )

          const strictlyAdapted = adaptIngredientsDeterministically(
            adapted.adaptedIngredients,
            applicableMeal
          )

          finalRecipe = {
            ...adapted,
            customIcon: detectRecipeIcon(rawRecipe.title || metadata.title || '', strictlyAdapted, targetMeal),
            adaptedIngredients: strictlyAdapted,
            id: generateId(),
            dishType: detectDishType(strictlyAdapted),
            isFavorite: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        } catch {
          // Fallback to Deterministic Adapter
          finalRecipe = buildDeterministicImportedRecipe(rawRecipe, metadata, cleanUrl, source, applicableMeal, targetMeal)
        }
      } else {
        // Pure Deterministic Adaptation
        finalRecipe = buildDeterministicImportedRecipe(rawRecipe, metadata, cleanUrl, source, applicableMeal, targetMeal)
      }

      setImportedRecipe(finalRecipe)
      setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore durante l\'importazione della ricetta')
      setStatus('error')
    }
  }

  const saveImportedRecipe = async () => {
    if (!importedRecipe) return
    await db.recipes.add(importedRecipe)
    navigate(`/recipes/${importedRecipe.id}`)
  }

  const isLoading = ['extracting', 'analyzing', 'adapting'].includes(status)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <PageHeader
        title="Aggiungi Ricetta"
        subtitle="Crea la tua ricetta ad hoc o importa da link social"
      />

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Mode Switcher Tabs */}
        <div className="flex bg-gray-200/90 dark:bg-gray-800/90 p-1 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>✍️</span>
            <span>Crea</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('social')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'social'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🔗</span>
            <span>Da Link Social</span>
          </button>
        </div>

        {/* ── Mode 1: Crea Ad-Hoc (Scrivi Tu) ─────────────────────────────── */}
        {mode === 'create' && (
          <div className="space-y-4 animate-fade-in">
            {/* Title & Idea Input */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block">
                  1. Cosa vuoi preparare? *
                </label>
                {/* Selettore Icona Ricetta */}
                <button
                  type="button"
                  onClick={() => setIsIconModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-extrabold flex items-center gap-1.5 transition-transform active:scale-95 border border-gray-200/80 dark:border-gray-700/80"
                  title="Personalizza l'icona del piatto"
                >
                  <span className="text-lg">{adHocIcon}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Cambia ✏️</span>
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setIsIconModalOpen(true)}
                  className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0 transition-transform active:scale-95 border border-gray-200/80 dark:border-gray-700/80 shadow-2xs"
                  title="Tocca per cambiare l'icona"
                >
                  {adHocIcon}
                </button>
                <input
                  type="text"
                  required
                  value={adHocTitle}
                  onChange={e => setAdHocTitle(e.target.value)}
                  placeholder="es. Salmone in friggitrice ad aria, Cous cous verdure..."
                  className="input-field text-sm font-bold flex-1 py-2.5"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Icona e ingredienti vengono rilevati automaticamente (es. salmone → 🐟). Tocca l&apos;icona per cambiarla.
              </p>
            </div>

            {/* Target Meal & Dish Type Selector */}
            <div className="card p-4 space-y-3">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block">
                2. Momento del giorno e tipologia
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTargetMeal(opt.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                      targetMeal === opt.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Seleziona variante pasto se ci sono alternative nel piano (es. Cena Post Workout) */}
              {applicableMeals.length > 1 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary-700 dark:text-primary-300">
                      Variante pasto specifica (fabbisogno dedicato):
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {activeMealPlan?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {applicableMeals.map(m => {
                      const isSelected = activeMealPlan?.id === m.id
                      return (
                        <button
                          key={m.id || m.label}
                          type="button"
                          onClick={() => setSelectedMealPlanId(m.id || null)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400'
                          }`}
                        >
                          {m.isVariant ? `💪 ${m.label}` : m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Dish Type: Main vs Side Dish (Contorno) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Tipo:</span>
                <button
                  type="button"
                  onClick={() => setAdHocDishType('main')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                    adHocDishType === 'main'
                      ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-900 dark:text-primary-200 ring-1 ring-primary-500'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🍽️ Piatto Principale
                </button>
                <button
                  type="button"
                  onClick={() => setAdHocDishType('side')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                    adHocDishType === 'side'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  🥗 Contorno (solo verdure)
                </button>
              </div>
            </div>

            {/* Ingredients Selection & Smart Suggestions */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                  3. Ingredienti della pietanza
                </label>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {adHocIngredients.length} aggiunti
                </span>
              </div>

              {/* Smart Suggestions Chips */}
              {suggestedIngredients.length > 0 && (
                <div className="bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200/70 dark:border-primary-800/80 rounded-2xl p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-primary-950 dark:text-primary-200 flex items-center gap-1">
                    <span>✨</span>
                    <span>Ingredienti suggeriti per {targetMeal === 'breakfast' ? 'la Colazione' : targetMeal === 'lunch' ? 'il Pranzo' : targetMeal === 'dinner' ? 'la Cena' : 'questo pasto'}:</span>
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {suggestedIngredients.map(sugg => (
                      <button
                        key={sugg.name}
                        type="button"
                        onClick={() => handleAddIngredient(sugg.name, sugg.category)}
                        className="bg-white dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-900 dark:text-primary-200 border border-primary-200 dark:border-primary-800 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>+ {sugg.name}</span>
                        {sugg.defaultGrams && (
                          <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">({sugg.defaultGrams})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Ingredients List */}
              {adHocIngredients.length > 0 ? (
                <div className="space-y-1.5">
                  {adHocIngredients.map((ing, idx) => {
                    const preview = adHocAdaptedPreview[idx]
                    const groupCap = adHocGroupCapacities.find(c => c.category === ing.category)
                    const itemCap = groupCap?.getItemCapacity(ing.name)

                    return (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                              {ing.name}
                            </span>

                            {/* Dropdown / Selettore Categoria Modificabile */}
                            <select
                              value={ing.category || 'other'}
                              onChange={e =>
                                handleIngredientCategoryChange(
                                  idx,
                                  e.target.value as RecipeIngredient['category']
                                )
                              }
                              className="text-[10px] font-bold py-0.5 px-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer focus:ring-1 focus:ring-primary-500"
                              title="Modifica categoria dell'ingrediente"
                            >
                              <option value="carbs">🌾 Carboidrati</option>
                              <option value="proteins">🥩 Proteine</option>
                              <option value="vegetables">🥦 Verdure</option>
                              <option value="fats">🥑 Grassi</option>
                              <option value="dairy">🧀 Latticini</option>
                              <option value="fruits">🍎 Frutta</option>
                              <option value="other">🍴 Altro</option>
                            </select>
                          </div>

                          {itemCap && (
                            <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 dark:text-gray-400 mt-1">
                              <span>Piano: <strong>{itemCap.baselineLabel}</strong></span>
                              {itemCap.otherItemsPercent > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                    Max con altri: <strong>{itemCap.maxAllowedLabel}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Modifica Quantità con bottoni +/- e input diretto */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleIngredientStepQty(idx, -5)}
                            className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-black text-xs flex items-center justify-center transition-all active:scale-90"
                            title="Diminuisci dose"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            value={ing.customQuantity ?? preview?.adaptedQuantity ?? '100g'}
                            onChange={e => handleIngredientQtyChange(idx, e.target.value)}
                            className="w-16 text-center font-extrabold text-xs text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800 border border-primary-300 dark:border-primary-700 rounded-lg px-1 py-0.5 focus:ring-1 focus:ring-primary-500"
                            title="Quantità modificabile"
                          />
                          <button
                            type="button"
                            onClick={() => handleIngredientStepQty(idx, 5)}
                            className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-black text-xs flex items-center justify-center transition-all active:scale-90"
                            title="Aumenta dose"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-xs p-1 ml-0.5"
                            title="Rimuovi ingrediente"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-2 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                  Nessun ingrediente ancora aggiunto. Usa i suggerimenti o scrivine uno qui sotto.
                </p>
              )}

              {/* Group Limits and Capacity Feedback */}
              {adHocGroupCapacities.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200/90 dark:border-gray-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <span>⚖️</span>
                      <span>Limiti Fabbisogno del tuo Piano Nutrizionale</span>
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      Auto-calibrati per {activeMealPlan?.label || 'il pasto'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {adHocGroupCapacities.map(cap => (
                      <div
                        key={cap.category}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                          cap.isExceeded
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                            : cap.isAlternativeVariant
                            ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-200/80 dark:border-primary-800/60 text-primary-900 dark:text-primary-200'
                            : 'bg-white dark:bg-gray-800 border-gray-200/70 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{cap.icon}</span>
                          <span className="font-bold truncate">{cap.categoryLabel}:</span>
                          <span className="text-[11px] opacity-90 truncate">{cap.hintText}</span>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            cap.isExceeded
                              ? 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100'
                              : cap.isAlternativeVariant
                              ? 'bg-primary-200 dark:bg-primary-900/80 text-primary-950 dark:text-primary-100'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {cap.percentUsed}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Ingredient Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newIngredientInput}
                  onChange={e => setNewIngredientInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddIngredient(newIngredientInput)
                    }
                  }}
                  placeholder="Scrivi altro ingrediente (es. Olio, Zucchine...)"
                  className="input-field text-xs flex-1"
                />
                <button
                  type="button"
                  disabled={!newIngredientInput.trim()}
                  onClick={() => handleAddIngredient(newIngredientInput)}
                  className="btn-primary text-xs py-2 px-3 font-bold flex-shrink-0"
                >
                  + Aggiungi
                </button>
              </div>

              {/* Quick Add from User Nutrition Plan */}
              {profile && profile.meals.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                    Oppure scegli direttamente dai cibi del tuo piano:
                  </p>
                  <div className="flex gap-1 overflow-x-auto scrollbar-hide py-0.5">
                    {profile.meals
                      .flatMap(m => m.groups)
                      .flatMap(g => g.options || [])
                      .slice(0, 10)
                      .map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAddIngredient(opt.name)}
                          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
                        >
                          + {opt.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Calibrated Macros & Dose Preview */}
            {adHocIngredients.length > 0 && (
              <div className="card p-4 space-y-3 bg-white dark:bg-gray-900 border-primary-200/80 dark:border-gray-800 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⚖️</span>
                    <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-xs uppercase tracking-wide">
                      Dosi Adattate al tuo Piano Nutrizionale
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
                    Algoritmo Deterministico ✓
                  </span>
                </div>

                <NutriBar
                  calories={adHocNutritionalValues.calories}
                  proteins={adHocNutritionalValues.proteins}
                  carbs={adHocNutritionalValues.carbs}
                  fats={adHocNutritionalValues.fats}
                />

                <div className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 space-y-1">
                  <p className="font-bold text-gray-800 dark:text-gray-200">Note di calibrazione automatica:</p>
                  <p>• Le proteine e i formaggi/uova sono bilanciati matematicamente (dimezzati se multi-fonte).</p>
                  <p>• Le verdure rispettano rigorosamente la quota totale prevista dal piano.</p>
                </div>
              </div>
            )}

            {/* Optional Cooking Notes (Clean, No Fake AI Procedures) */}
            <div className="card p-4 space-y-2">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide block">
                4. Procedimento o note di cottura (opzionale)
              </label>
              <textarea
                rows={3}
                value={adHocNotes}
                onChange={e => setAdHocNotes(e.target.value)}
                placeholder="es. Cuocere in friggitrice ad aria a 180°C per 15 minuti..."
                className="input-field text-xs resize-none"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Non vengono generati testi artificiali. Puoi scrivere le tue note o lasciarlo vuoto.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={isSavingAdHoc || !adHocTitle.trim() || adHocIngredients.length === 0}
              onClick={handleSaveAdHoc}
              className="btn-primary w-full text-sm py-3.5 font-bold shadow-lg flex items-center justify-center gap-2"
            >
              <span>{isSavingAdHoc ? 'Salvataggio…' : 'Salva Ricetta'}</span>
            </button>
          </div>
        )}

        {/* ── Mode 2: Da Link Social (Instagram, TikTok, YouTube) ─────────── */}
        {mode === 'social' && (
          <div className="space-y-4 animate-fade-in">
            {/* URL input */}
            <div className="card p-4">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 block">
                Link del video social 🔗
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Incolla link Instagram, TikTok o YouTube..."
                  value={url}
                  onChange={e => setUrl(cleanPastedUrl(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && handleImportSocial()}
                  className="input-field flex-1 text-xs sm:text-sm font-medium"
                  disabled={isLoading}
                  autoFocus
                />
                {url ? (
                  <button
                    onClick={() => setUrl('')}
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    ✕
                  </button>
                ) : (
                  typeof navigator !== 'undefined' &&
                  navigator.clipboard && (
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap"
                    >
                      📋 Incolla
                    </button>
                  )
                )}
              </div>

              {url && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">Fonte rilevata:</span>
                  <Badge variant="default">{detectSource(url)}</Badge>
                </div>
              )}
            </div>

            {/* Meal selector */}
            <div className="card p-4">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 block">
                Per quale pasto? 🍽️
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTargetMeal(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      targetMeal === opt.value
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Import button */}
            <button
              onClick={handleImportSocial}
              disabled={isLoading || !url.trim()}
              className="btn-primary w-full text-sm font-bold py-3.5 shadow-lg"
            >
              {isLoading ? 'Elaborazione in corso…' : '📥 Importa ed Adatta Ricetta'}
            </button>

            {/* Status */}
            {isLoading && (
              <div className="card p-6 flex flex-col items-center gap-4">
                <LoadingSpinner size="lg" />
                <div className="text-center">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{STATUS_MESSAGES[status]}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Questo può richiedere 5-15 secondi</p>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
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
              <div className="card p-4 border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40">
                <p className="text-red-600 dark:text-red-400 font-bold text-xs">❌ {error}</p>
                <p className="text-red-400 dark:text-red-500 text-[11px] mt-1">Verifica che il link sia valido e riprova.</p>
              </div>
            )}

            {/* Result preview */}
            {importedRecipe && status === 'done' && (
              <div className="card overflow-hidden animate-slide-up space-y-3">
                {importedRecipe.thumbnailUrl && (
                  <img
                    src={importedRecipe.thumbnailUrl}
                    alt={importedRecipe.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                        {importedRecipe.title}
                      </h2>
                      {importedRecipe.dishType === 'side' && (
                        <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 mt-1 inline-block">
                          🥗 Contorno (solo verdure)
                        </span>
                      )}
                    </div>
                    <span className="text-2xl">{MEAL_ICONS[importedRecipe.targetMeal]}</span>
                  </div>

                  {importedRecipe.nutritionalValues && (
                    <NutriBar
                      calories={importedRecipe.nutritionalValues.calories}
                      proteins={importedRecipe.nutritionalValues.proteins}
                      carbs={importedRecipe.nutritionalValues.carbs}
                      fats={importedRecipe.nutritionalValues.fats}
                    />
                  )}

                  <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Ingredienti Adattati al Piano
                    </p>
                    <div className="space-y-1.5">
                      {importedRecipe.adaptedIngredients.slice(0, 8).map((ing, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                          <span className="text-gray-800 dark:text-gray-200 font-medium">{ing.name}</span>
                          <span className="font-extrabold text-primary-700 dark:text-primary-400">
                            {ing.adaptedQuantity || ing.originalQuantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        setImportedRecipe(null)
                        setStatus('idle')
                      }}
                      className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                    >
                      Importa un&apos;altra
                    </button>
                    <button onClick={saveImportedRecipe} className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md">
                      Salva nel Ricettario 💾
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Scelta Icona Ricetta */}
      <RecipeIconPickerModal
        isOpen={isIconModalOpen}
        currentIcon={adHocIcon}
        recipeTitle={adHocTitle}
        onSelectIcon={icon => {
          setAdHocIcon(icon)
          setIsManualIcon(true)
        }}
        onClose={() => setIsIconModalOpen(false)}
      />
    </div>
  )
}
