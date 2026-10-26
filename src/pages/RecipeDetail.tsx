import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveProfile } from '@/lib/db'
import { getRecipeVariants } from '@/lib/recipeVariants'
import { MEAL_LABELS, MEAL_ICONS, CATEGORY_LABELS, CATEGORY_ICONS, formatDate } from '@/lib/utils'
import { Badge, NutriBar, LoadingSpinner, EmptyState } from '@/components/ui'
import AddToPlannerModal from '@/components/AddToPlannerModal'
import type { MealType, TargetMealType, RecipeIngredient } from '@/types'

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: '🌅 Colazione' },
  { value: 'snack_am', label: '🍎 Spuntino mattina' },
  { value: 'lunch', label: '☀️ Pranzo' },
  { value: 'snack_pm', label: '🍪 Merenda' },
  { value: 'dinner', label: '🌙 Cena' },
]

const TARGET_MEAL_OPTIONS: { value: TargetMealType; label: string }[] = [
  { value: 'breakfast', label: '🌅 Colazione' },
  { value: 'lunch', label: '☀️ Pranzo' },
  { value: 'dinner', label: '🌙 Cena' },
  { value: 'lunch_dinner', label: '☀️🌙 Pranzo e Cena' },
  { value: 'snack_am', label: '🍎 Spuntino mattina' },
  { value: 'snack_pm', label: '🍪 Merenda' },
]

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'ingredients' | 'steps' | 'notes'>('ingredients')
  const [showAddToPlanner, setShowAddToPlanner] = useState(false)
  const [ingredientView, setIngredientView] = useState<'category' | 'component' | 'list'>('category')

  const recipe = useLiveQuery(() => id ? db.recipes.get(id) : undefined, [id])
  const activeProfile = useLiveQuery(() => getActiveProfile(), [])

  const variants = useMemo(() => {
    if (!recipe) return []
    return getRecipeVariants(recipe, activeProfile)
  }, [recipe, activeProfile])

  const [multiVariantView, setMultiVariantView] = useState<'boxes' | 'single'>('boxes')
  const [activeVariantId, setActiveVariantId] = useState<string>('')

  const activeVariant = useMemo(() => {
    if (variants.length === 0) {
      return {
        id: 'default',
        label: 'Standard',
        mealType: 'lunch' as MealType,
        adaptedIngredients: recipe?.adaptedIngredients || [],
        steps: recipe?.steps || [],
        nutritionalValues: recipe?.nutritionalValues,
        adaptationNotes: recipe?.adaptationNotes,
      }
    }
    return variants.find(v => v.id === activeVariantId) || variants[0]
  }, [variants, activeVariantId, recipe])

  if (recipe === undefined) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (recipe === null) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <EmptyState icon="😕" title="Ricetta non trovata" description="La ricetta potrebbe essere stata eliminata." />
    </div>
  )

  const toggleFavorite = () => db.recipes.update(recipe.id, { isFavorite: !recipe.isFavorite })

  const deleteRecipe = async () => {
    if (confirm('Eliminare questa ricetta dal ricettario?')) {
      await db.recipes.delete(recipe.id)
      navigate('/recipes')
    }
  }

  const openAddToPlanner = () => {
    setShowAddToPlanner(true)
  }

  const renderIngredientItems = (ingredients: RecipeIngredient[]) => {
    if (ingredientView === 'category') {
      return (
        <div className="space-y-3">
          {(['proteins', 'carbs', 'vegetables', 'fats', 'dairy', 'fruits', 'other'] as const).map(cat => {
            const items = ingredients.filter(ing => ing.category === cat)
            if (items.length === 0) return null
            const label = CATEGORY_LABELS[cat] || cat
            const icon = CATEGORY_ICONS[cat] || '🍴'

            return (
              <div key={cat} className="bg-white border border-gray-100 rounded-2xl p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{icon}</span>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      {label}
                    </h4>
                    <span className="text-[10px] text-gray-400">
                      ({items.length} {items.length === 1 ? 'alimento' : 'alimenti'})
                    </span>
                  </div>
                  {cat === 'vegetables' && items.length > 1 && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Ripartite equamente
                    </span>
                  )}
                  {cat === 'proteins' && items.length > 1 && (
                    <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                      Bilanciate 50/50
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {items.map((ing, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <span className="text-xs sm:text-sm text-gray-800 font-medium truncate">{ing.name}</span>
                        {ing.component && ing.component !== 'Principale' && (
                          <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {ing.component}
                          </span>
                        )}
                        {ing.isOptional && <span className="text-[10px] text-gray-400">(opz.)</span>}
                      </div>
                      <span className="font-extrabold text-primary-700 text-xs sm:text-sm whitespace-nowrap">
                        {ing.adaptedQuantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (ingredientView === 'component') {
      const compMap = Array.from(
        ingredients.reduce((map, ing) => {
          const comp = ing.component || 'Preparazione principale'
          if (!map.has(comp)) map.set(comp, [])
          map.get(comp)!.push(ing)
          return map
        }, new Map<string, RecipeIngredient[]>())
      )

      return (
        <div className="space-y-3">
          {compMap.map(([compName, items]) => (
            <div key={compName} className="bg-white border border-gray-100 rounded-2xl p-3 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🥪</span>
                  <h4 className="text-xs font-bold text-gray-900">{compName}</h4>
                  <span className="text-[10px] text-gray-400">({items.length} alimenti)</span>
                </div>
              </div>

              <div className="space-y-1">
                {items.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                      <Badge variant={ing.category as any} className="text-[9px] py-0.2">
                        {CATEGORY_LABELS[ing.category]}
                      </Badge>
                      <span className="text-xs sm:text-sm text-gray-800 font-medium truncate">{ing.name}</span>
                      {ing.isOptional && <span className="text-[10px] text-gray-400">(opz.)</span>}
                    </div>
                    <span className="font-extrabold text-primary-700 text-xs sm:text-sm whitespace-nowrap">
                      {ing.adaptedQuantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Flat list
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-3 space-y-1 shadow-2xs">
        {ingredients.map((ing, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
              <Badge variant={ing.category as any} className="text-[9px] py-0.2">
                {CATEGORY_LABELS[ing.category]}
              </Badge>
              <span className="text-xs sm:text-sm text-gray-800 truncate">{ing.name}</span>
              {ing.component && (
                <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  {ing.component}
                </span>
              )}
              {ing.isOptional && <span className="text-[10px] text-gray-400">(opz.)</span>}
            </div>
            <span className="font-extrabold text-primary-700 text-xs sm:text-sm whitespace-nowrap">
              {ing.adaptedQuantity}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderStepsList = (steps: typeof recipe.steps) => (
    <div className="space-y-2.5">
      {steps.map(step => (
        <div key={step.order} className="card p-3.5 flex gap-3.5 items-start">
          <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-xs">
            {step.order}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-normal">
              {step.description}
            </p>
            {step.duration && (
              <p className="text-[11px] text-gray-400">⏱ {step.duration}</p>
            )}
            {step.tip && (
              <p className="text-[11px] text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1 font-medium">
                💡 {step.tip}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* ── Top Framed Hero Image ─────────────────────────────────── */}
      <div className="p-4 pb-0 max-w-2xl mx-auto">
        <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-md bg-gray-900 border border-gray-200/80">
          {recipe.thumbnailUrl ? (
            <img
              src={recipe.thumbnailUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center">
              <span className="text-7xl">{MEAL_ICONS[recipe.targetMeal] ?? '🍽️'}</span>
            </div>
          )}

          {/* Contrast gradient overlay for buttons */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/35 pointer-events-none" />

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3.5 left-3.5 w-10 h-10 bg-white/90 hover:bg-white text-gray-800 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 z-10"
            aria-label="Indietro"
          >
            <span className="text-base font-bold">←</span>
          </button>

          {/* Favorite button */}
          <button
            onClick={toggleFavorite}
            className="absolute top-3.5 right-3.5 w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 z-10"
            aria-label="Preferito"
          >
            <span className="text-base">{recipe.isFavorite ? '❤️' : '🤍'}</span>
          </button>

          {/* Meal Pill in bottom left of image */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="bg-black/60 backdrop-blur-md text-white font-semibold text-xs px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
              <span>{MEAL_ICONS[recipe.targetMeal]}</span>
              <span>{MEAL_LABELS[recipe.targetMeal]}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Content Container ────────────────────────────────────────── */}
      <div className="px-4 pt-3 space-y-4 max-w-2xl mx-auto">
        {/* Title, Badges & NutriBar Card */}
        <div className="card p-4 sm:p-5 space-y-3.5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
              {recipe.title}
            </h1>
            {recipe.prepTime && (
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <span>⏱</span>
                <span>Tempo totale: {recipe.prepTime + (recipe.cookTime ?? 0)} minuti</span>
              </p>
            )}
          </div>

          {/* Meta & Category Selector */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
            {/* Quick Meal Re-categorizer */}
            <div className="relative inline-flex items-center">
              <select
                value={recipe.targetMeal}
                onChange={async (e) => {
                  await db.recipes.update(recipe.id, { targetMeal: e.target.value as TargetMealType })
                }}
                className="appearance-none bg-primary-50 hover:bg-primary-100 text-primary-800 text-xs font-semibold px-3 py-1.5 pr-7 rounded-xl border border-primary-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                title="Cambia categoria pasto"
              >
                {TARGET_MEAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="absolute right-2.5 pointer-events-none text-[9px] text-primary-600">▼</span>
            </div>

            {recipe.source !== 'manual' && (
              <Badge className="bg-gray-100 text-gray-700 capitalize font-medium text-xs px-2.5 py-1">
                {recipe.source}
              </Badge>
            )}

            {recipe.tags.map(tag => (
              <Badge key={tag} className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* NutriBar */}
          {(activeVariant?.nutritionalValues || recipe.nutritionalValues) && (
            <div className="pt-2 border-t border-gray-100">
              <NutriBar
                calories={(activeVariant?.nutritionalValues || recipe.nutritionalValues)!.calories}
                proteins={(activeVariant?.nutritionalValues || recipe.nutritionalValues)!.proteins}
                carbs={(activeVariant?.nutritionalValues || recipe.nutritionalValues)!.carbs}
                fats={(activeVariant?.nutritionalValues || recipe.nutritionalValues)!.fats}
              />
            </div>
          )}
        </div>

        {/* ── Multi-Variant Selector Bar (Pranzo / Cena / Post Workout) ── */}
        {variants.length > 1 && (
          <div className="card p-3.5 space-y-2.5 border-primary-200/80 bg-gradient-to-r from-primary-50/40 via-white to-primary-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">⚖️</span>
                <div>
                  <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">
                    Grammature per Pasto ({variants.length})
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    Adattamenti specifici per ogni momento della giornata
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMultiVariantView(multiVariantView === 'boxes' ? 'single' : 'boxes')
                }
                className="text-[11px] font-bold text-primary-700 bg-white hover:bg-primary-50 border border-primary-200 px-3 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1"
              >
                <span>{multiVariantView === 'boxes' ? '📑 Vista Singola' : '🔲 Riquadri Insieme'}</span>
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pt-0.5">
              <button
                type="button"
                onClick={() => setMultiVariantView('boxes')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  multiVariantView === 'boxes'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>🔲</span>
                <span>Riquadri Insieme ({variants.length})</span>
              </button>
              {variants.map(v => {
                const isSelected = multiVariantView === 'single' && activeVariant.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setActiveVariantId(v.id)
                      setMultiVariantView('single')
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{v.label}</span>
                    {v.nutritionalValues && (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-primary-700 text-primary-100'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {v.nutritionalValues.calories} kcal
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes on recipe / balance (clean, no robot label) */}
        {recipe.adaptationNotes && (
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
              <span>💡</span>
              <span>Note di preparazione e bilanciamento</span>
            </p>
            <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
              {recipe.adaptationNotes}
            </p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex bg-gray-200/80 rounded-2xl p-1 shadow-inner">
          {(['ingredients', 'steps', 'notes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'ingredients' ? '🥗 Ingredienti' : t === 'steps' ? '👨‍🍳 Preparazione' : '📝 Note'}
            </button>
          ))}
        </div>

        {/* ── Tab: Ingredients ────────────────────────────────────── */}
        {tab === 'ingredients' && (
          <div className="space-y-4 mb-4">
            {/* View Mode Switcher */}
            <div className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Organizzazione ingredienti
                </span>
                <span className="text-xs text-gray-400">
                  {multiVariantView === 'boxes' && variants.length > 1
                    ? `${variants.length} pasti a confronto`
                    : `${activeVariant.adaptedIngredients.length} ingredienti`}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setIngredientView('category')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    ingredientView === 'category'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🥩 Per Macro
                </button>
                <button
                  onClick={() => setIngredientView('component')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    ingredientView === 'component'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  🥪 Componenti
                </button>
                <button
                  onClick={() => setIngredientView('list')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    ingredientView === 'list'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📋 Lista
                </button>
              </div>
            </div>

            {/* Riquadri Separati Mostrati Insieme */}
            {multiVariantView === 'boxes' && variants.length > 1 ? (
              <div className="space-y-4">
                {variants.map(v => (
                  <div
                    key={v.id}
                    className={`card p-4 space-y-3 border-2 ${
                      v.mealType === 'lunch'
                        ? 'border-amber-200/90 bg-amber-50/10'
                        : v.isVariant
                        ? 'border-emerald-300/90 bg-emerald-50/15'
                        : 'border-indigo-200/90 bg-indigo-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/70 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                          {v.label}
                        </h3>
                        {v.isVariant && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                            Alternativa
                          </span>
                        )}
                      </div>
                      {v.nutritionalValues && (
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                          <span className="text-primary-700">{v.nutritionalValues.calories} kcal</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-red-600">{v.nutritionalValues.proteins}g P</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-amber-600">{v.nutritionalValues.carbs}g C</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500">{v.nutritionalValues.fats}g F</span>
                        </div>
                      )}
                    </div>

                    {v.adaptationNotes && (
                      <p className="text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-gray-200/60 leading-relaxed">
                        💡 {v.adaptationNotes}
                      </p>
                    )}

                    {renderIngredientItems(v.adaptedIngredients)}
                  </div>
                ))}
              </div>
            ) : (
              /* Single Variant View */
              <div className="space-y-3">
                {activeVariant.adaptationNotes && (
                  <p className="text-xs text-gray-600 bg-primary-50/50 p-2.5 rounded-xl border border-primary-200/60 leading-relaxed">
                    💡 {activeVariant.adaptationNotes}
                  </p>
                )}
                {renderIngredientItems(activeVariant.adaptedIngredients)}
              </div>
            )}

            {/* Original Recipe Comparison (if quantities were scaled) */}
            {recipe.originalIngredients.some(
              (ing, i) =>
                ing.originalQuantity !== recipe.adaptedIngredients[i]?.adaptedQuantity
            ) && (
              <div className="card p-4 opacity-60">
                <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                  📋 Ricetta originale (per confronto)
                </h3>
                <div className="space-y-1.5">
                  {recipe.originalIngredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{ing.name}</span>
                      <span className="text-gray-500 line-through">{ing.originalQuantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Preparation / Steps ── */}
        {tab === 'steps' && (
          <div className="space-y-4 mb-4">
            {multiVariantView === 'boxes' && variants.length > 1 ? (
              <div className="space-y-4">
                {variants.map(v => (
                  <div
                    key={v.id}
                    className={`card p-4 space-y-3 border-2 ${
                      v.mealType === 'lunch'
                        ? 'border-amber-200/90 bg-amber-50/10'
                        : v.isVariant
                        ? 'border-emerald-300/90 bg-emerald-50/15'
                        : 'border-indigo-200/90 bg-indigo-50/10'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200/70 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">👨‍🍳</span>
                        <h3 className="font-extrabold text-sm sm:text-base text-gray-900">
                          Preparazione per {v.label}
                        </h3>
                      </div>
                      {v.nutritionalValues && (
                        <span className="text-xs font-bold text-primary-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-xs">
                          {v.nutritionalValues.calories} kcal
                        </span>
                      )}
                    </div>

                    {renderStepsList(v.steps)}
                  </div>
                ))}
              </div>
            ) : (
              renderStepsList(activeVariant.steps)
            )}
          </div>
        )}

        {/* ── Tab: Notes ──────────────────────────────────────────── */}
        {tab === 'notes' && (
          <div className="space-y-3 mb-4">
            <div className="card p-4">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Le mie note</label>
              <textarea
                placeholder="Aggiungi note personali…"
                value={recipe.personalNotes ?? ''}
                onChange={e => db.recipes.update(recipe.id, { personalNotes: e.target.value })}
                rows={4}
                className="input-field resize-none"
              />
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">La mia valutazione</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => db.recipes.update(recipe.id, { rating: star })}
                      className="text-2xl"
                    >
                      {star <= (recipe.rating ?? 0) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline flex items-center gap-1"
                >
                  🔗 Video originale
                </a>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Aggiunta il {formatDate(recipe.createdAt)}
              </p>
            </div>
          </div>
        )}

        {/* ── Action Buttons ──────────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={deleteRecipe}
            className="btn-secondary text-red-500 border-red-200 flex-1 hover:bg-red-50 font-semibold"
          >
            🗑 Elimina
          </button>
          <button
            onClick={openAddToPlanner}
            className="btn-primary flex-1 font-bold shadow-md"
          >
            📅 Aggiungi al piano
          </button>
        </div>
      </div>

      {/* ── Add to Planner Modal ────────────────────────────────────── */}
      <AddToPlannerModal
        isOpen={showAddToPlanner}
        onClose={() => setShowAddToPlanner(false)}
        recipe={recipe}
        variants={variants}
        onSuccess={() => navigate('/planner')}
      />
    </div>
  )
}
