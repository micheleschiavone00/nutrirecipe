import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, formatDayLabel, cn } from '@/lib/utils'
import { detectRecipeIcon } from '@/lib/recipeIcons'
import type { MealType, Recipe } from '@/types'

interface SelectRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  mealType: MealType
  onSelectRecipe: (recipeId: string, variantId?: string, variantLabel?: string) => Promise<void> | void
  onAddCustomMeal: (customLabel: string) => Promise<void> | void
  onImportNew: () => void
}

export default function SelectRecipeModal({
  isOpen,
  onClose,
  date,
  mealType,
  onSelectRecipe,
  onAddCustomMeal,
  onImportNew,
}: SelectRecipeModalProps) {
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'recommended' | 'all' | 'favorites'>('recommended')
  const [customText, setCustomText] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)

  const allRecipes = useLiveQuery(() => db.recipes.toArray(), [])

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [isOpen])

  // Reset selected recipe when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRecipeId(null)
      setSelectedVariantId(null)
      setSearch('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Filter recipes
  const filteredRecipes = (allRecipes ?? []).filter(recipe => {
    const matchesSearch =
      search.trim() === '' ||
      recipe.title.toLowerCase().includes(search.toLowerCase()) ||
      recipe.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      recipe.adaptedIngredients.some(i => i.name.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    if (filterMode === 'favorites') {
      return recipe.isFavorite
    }
    if (filterMode === 'recommended') {
      if (mealType === 'lunch' || mealType === 'dinner') {
        return (
          recipe.targetMeal === mealType ||
          recipe.targetMeal === 'lunch_dinner'
        )
      }
      return recipe.targetMeal === mealType
    }
    return true
  })

  const selectedRecipe = (allRecipes ?? []).find(r => r.id === selectedRecipeId) || null
  const selectedRecipeVariants = selectedRecipe?.variants || []

  // Auto-select variant matching mealType if available
  const handleSelectCard = (recipe: Recipe) => {
    if (selectedRecipeId === recipe.id) {
      // Toggle selection or keep it
      return
    }
    setSelectedRecipeId(recipe.id)
    if (recipe.variants && recipe.variants.length > 0) {
      const match = recipe.variants.find(v => v.mealType === mealType)
      setSelectedVariantId(match ? match.id : recipe.variants[0].id)
    } else {
      setSelectedVariantId(null)
    }
  }

  const handleConfirmRecipe = async (recipe: Recipe, variantIdOverride?: string) => {
    setSubmitting(true)
    try {
      const vId = variantIdOverride ?? selectedVariantId
      const chosenVariant = recipe.variants?.find(v => v.id === vId)
      await onSelectRecipe(recipe.id, chosenVariant?.id, chosenVariant?.label)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customText.trim()) return
    setSubmitting(true)
    try {
      await onAddCustomMeal(customText.trim())
      setCustomText('')
      setIsCustomMode(false)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in touch-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[82dvh] sm:max-h-[85dvh] overflow-hidden border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{MEAL_ICONS[mealType]}</span>
              <h3 className="font-extrabold text-gray-900 dark:text-gray-100 text-base leading-tight">
                Aggiungi a {MEAL_LABELS[mealType]}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              📅 {formatDayLabel(date, true)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch: Scegli dal Ricettario vs Pasto Libero */}
        <div className="px-4 sm:px-5 pt-3 pb-1 flex-shrink-0 bg-white dark:bg-gray-900">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !isCustomMode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📖 Dal Ricettario
            </button>
            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isCustomMode
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              ✍️ Pasto Libero
            </button>
          </div>
        </div>

        {isCustomMode ? (
          /* Custom Meal Input Form */
          <>
            <form onSubmit={handleCustomSubmit} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
                {/* 1-Click Fast Cheat Meal Action */}
                <button
                  type="button"
                  onClick={() => {
                    onAddCustomMeal('Pasto Libero / Sgarro 🍕')
                    onClose()
                  }}
                  className="w-full p-3.5 rounded-2xl border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
                >
                  <span className="text-xl">🍕</span>
                  <span>Imposta come Pasto Libero / Cheat Meal</span>
                </button>

                {/* Popular Cheat Meal Quick Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Oppure seleziona un&apos;idea veloce:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '🍕 Pizza e Birra',
                      '🍔 Hamburger Gourmet',
                      '🍣 Sushi All-you-can-eat',
                      '🍝 Pranzo al Ristorante',
                      '🍦 Gelato o Dessert',
                    ].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCustomText(tag)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Nome o descrizione del pasto
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="es. Riso basmati 80g + Salmone 150g e zucchine"
                    className="input-field text-sm font-medium"
                    autoFocus
                  />
                  <p className="text-[11px] text-gray-400">
                    Utile per pasti liberi, cene fuori casa o combinazioni veloci.
                  </p>
                </div>
              </div>

              {/* Fixed Footer for Custom Meal */}
              <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold"
                >
                  Torna al ricettario
                </button>
                <button
                  type="submit"
                  disabled={!customText.trim() || submitting}
                  className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-md"
                >
                  {submitting ? 'Aggiunta…' : 'Aggiungi Pasto ✓'}
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Recipe Picker from Cookbook */
          <>
            {/* Search & Filter bar fixed */}
            <div className="px-4 sm:px-5 py-2 space-y-2 flex-shrink-0 bg-white dark:bg-gray-900">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca per titolo, ingrediente o tag..."
                  className="input-field pl-9 py-2 text-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterMode('recommended')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filterMode === 'recommended'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  ✨ Per {MEAL_LABELS[mealType]}
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filterMode === 'all'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Tutte ({allRecipes?.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('favorites')}
                  className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    filterMode === 'favorites'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  ❤️ Preferite
                </button>
              </div>
            </div>

            {/* Recipes scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pt-1 space-y-2.5 [-webkit-overflow-scrolling:touch]">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-2xl mb-1">🔍</p>
                  <p className="text-xs font-bold text-gray-700">Nessuna ricetta trovata</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {filterMode === 'recommended'
                      ? 'Nessuna ricetta specifica per questo pasto. Prova "Tutte" o importane una nuova.'
                      : 'Nessun risultato con i filtri attuali.'}
                  </p>
                  {filterMode === 'recommended' && (
                    <button
                      onClick={() => setFilterMode('all')}
                      className="mt-3 text-xs font-bold text-primary-600 hover:underline"
                    >
                      Mostra tutte le ricette ({allRecipes?.length ?? 0})
                    </button>
                  )}
                </div>
              ) : (
                filteredRecipes.map(recipe => {
                  const isSelected = selectedRecipeId === recipe.id
                  const hasVariants = recipe.variants && recipe.variants.length > 1

                  return (
                    <div
                      key={recipe.id}
                      onClick={() => handleSelectCard(recipe)}
                      className={cn(
                        'w-full text-left rounded-2xl p-3 flex flex-col gap-2 transition-all cursor-pointer border',
                        isSelected
                          ? 'bg-primary-50/90 dark:bg-primary-950/60 border-primary-500 ring-2 ring-primary-500/20 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-750 border-gray-200/80 dark:border-gray-700/80'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950/80 border border-primary-200/60 dark:border-primary-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {recipe.thumbnailUrl ? (
                            <img
                              src={recipe.thumbnailUrl}
                              alt={recipe.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">{recipe.customIcon || detectRecipeIcon(recipe.title, recipe.adaptedIngredients, recipe.targetMeal)}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm truncate leading-tight">
                              {recipe.title}
                            </h4>
                            {recipe.isFavorite && <span className="text-[10px] text-red-500">❤️</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                            <span className="bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200/70 dark:border-gray-600 font-semibold text-gray-600 dark:text-gray-300">
                              {MEAL_LABELS[recipe.targetMeal]}
                            </span>
                            {recipe.nutritionalValues && (
                              <span className="font-medium">
                                {recipe.nutritionalValues.calories} kcal • {recipe.nutritionalValues.proteins}g P
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct "+ Aggiungi" button on card */}
                        <div className="flex-shrink-0">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleConfirmRecipe(recipe)
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95',
                              isSelected
                                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md'
                                : 'bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-600 hover:text-white text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                            )}
                          >
                            <span>+ Aggiungi</span>
                          </button>
                        </div>
                      </div>

                      {/* Variant selector if recipe has variants and is selected */}
                      {isSelected && hasVariants && (
                        <div className="pt-2 border-t border-primary-200/60 dark:border-primary-800/60 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-primary-950 dark:text-primary-200 uppercase tracking-wide">
                            Variante:
                          </span>
                          {recipe.variants!.map(v => {
                            const isVSelected = selectedVariantId === v.id
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedVariantId(v.id)
                                }}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                                  isVSelected
                                    ? 'bg-primary-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-gray-800 hover:bg-primary-100 dark:hover:bg-primary-950 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                )}
                              >
                                {v.label} {isVSelected && '✓'}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Quick Action Footer: Big "Aggiungi" Confirmation or Social Import */}
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] flex flex-col gap-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
              {selectedRecipe ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleConfirmRecipe(selectedRecipe)}
                    className="btn-primary w-full py-3 text-xs sm:text-sm font-extrabold shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>➕</span>
                    <span>
                      {submitting
                        ? 'Aggiunta in corso…'
                        : `Aggiungi "${selectedRecipe.title}" a ${MEAL_LABELS[mealType]} ✓`}
                    </span>
                  </button>

                  <div className="flex items-center justify-between text-xs px-1">
                    <button
                      type="button"
                      onClick={() => setSelectedRecipeId(null)}
                      className="text-gray-400 hover:text-gray-600 text-[11px]"
                    >
                      Deseleziona
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-gray-500 font-semibold text-xs hover:text-gray-700"
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onImportNew()
                    }}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-primary-50 transition-colors"
                  >
                    <span>➕</span>
                    <span>Importa nuova da social</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary py-2 px-4 text-xs font-bold"
                  >
                    Chiudi
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
