import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, formatDayLabel } from '@/lib/utils'
import type { MealType, Recipe } from '@/types'

interface SelectRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  mealType: MealType
  onSelectRecipe: (recipeId: string) => Promise<void> | void
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

  const allRecipes = useLiveQuery(() => db.recipes.toArray(), [])

  if (!isOpen) return null

  // Filter recipes
  const filteredRecipes = (allRecipes ?? []).filter(recipe => {
    // Search query filter
    const matchesSearch =
      search.trim() === '' ||
      recipe.title.toLowerCase().includes(search.toLowerCase()) ||
      recipe.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      recipe.adaptedIngredients.some(i => i.name.toLowerCase().includes(search.toLowerCase()))

    if (!matchesSearch) return false

    // Filter mode
    if (filterMode === 'favorites') {
      return recipe.isFavorite
    }
    if (filterMode === 'recommended') {
      // Recommend matching targetMeal
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

  const handleSelect = async (recipe: Recipe) => {
    setSubmitting(true)
    try {
      await onSelectRecipe(recipe.id)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{MEAL_ICONS[mealType]}</span>
              <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                Aggiungi a {MEAL_LABELS[mealType]}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              📅 {formatDayLabel(date, true)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch: Scegli dal Ricettario vs Pasto Libero */}
        <div className="flex bg-gray-100 p-1 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsCustomMode(false)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              !isCustomMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📖 Dal Ricettario
          </button>
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isCustomMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✍️ Pasto Libero
          </button>
        </div>

        {isCustomMode ? (
          /* Custom Meal Input Form */
          <form onSubmit={handleCustomSubmit} className="space-y-4 py-2 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Nome o descrizione del pasto
              </label>
              <input
                type="text"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="es. Riso basmati 80g + Salmone 150g e zucchine"
                className="input-field text-sm"
                autoFocus
              />
              <p className="text-[11px] text-gray-400">
                Utile per pasti fuori casa o combinazioni veloci senza creare una ricetta completa.
              </p>
            </div>

            <div className="flex gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold"
              >
                Torna al ricettario
              </button>
              <button
                type="submit"
                disabled={!customText.trim() || submitting}
                className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md"
              >
                {submitting ? 'Aggiunta…' : 'Salva Pasto ✓'}
              </button>
            </div>
          </form>
        ) : (
          /* Recipe Picker from Cookbook */
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            {/* Search & Filter bar */}
            <div className="space-y-2 flex-shrink-0">
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
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ❤️ Preferite
                </button>
              </div>
            </div>

            {/* Recipes scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
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
                filteredRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSelect(recipe)}
                    className="w-full text-left bg-gray-50 hover:bg-primary-50/70 border border-gray-200/80 hover:border-primary-300 rounded-2xl p-2.5 flex items-center gap-3 transition-all group active:scale-[0.99]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {recipe.thumbnailUrl ? (
                        <img
                          src={recipe.thumbnailUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span className="text-2xl">{MEAL_ICONS[recipe.targetMeal] ?? '🍽️'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate leading-tight group-hover:text-primary-700">
                          {recipe.title}
                        </h4>
                        {recipe.isFavorite && <span className="text-[10px] text-red-500">❤️</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200/70 font-semibold text-gray-600">
                          {MEAL_LABELS[recipe.targetMeal]}
                        </span>
                        {recipe.nutritionalValues && (
                          <span className="font-medium">
                            {recipe.nutritionalValues.calories} kcal • {recipe.nutritionalValues.proteins}g P
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-white group-hover:bg-primary-600 group-hover:text-white border border-gray-200 group-hover:border-primary-600 text-gray-400 font-bold text-xs transition-colors shadow-xs">
                        +
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Quick Action Footer: Import New from Social */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onImportNew()
                }}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>Importa nuova ricetta da social</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
