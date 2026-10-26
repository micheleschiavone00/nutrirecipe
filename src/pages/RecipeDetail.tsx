import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, CATEGORY_LABELS, CATEGORY_ICONS, formatDate } from '@/lib/utils'
import { Badge, NutriBar, LoadingSpinner, EmptyState } from '@/components/ui'
import type { MealType, TargetMealType } from '@/types'

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch')
  const [ingredientView, setIngredientView] = useState<'category' | 'component' | 'list'>('category')

  const recipe = useLiveQuery(() => id ? db.recipes.get(id) : undefined, [id])

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
    if (recipe.targetMeal === 'dinner') {
      setSelectedMeal('dinner')
    } else if (recipe.targetMeal === 'breakfast') {
      setSelectedMeal('breakfast')
    } else if (recipe.targetMeal === 'snack_am') {
      setSelectedMeal('snack_am')
    } else if (recipe.targetMeal === 'snack_pm') {
      setSelectedMeal('snack_pm')
    } else {
      setSelectedMeal('lunch')
    }
    setShowAddToPlanner(true)
  }

  const addToPlanner = async () => {
    await db.plannedMeals.add({
      id: `pm-${Date.now()}`,
      date: selectedDate,
      mealType: selectedMeal,
      recipeId: recipe.id,
      isCompleted: false,
    })
    setShowAddToPlanner(false)
    navigate('/planner')
  }

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
          {recipe.nutritionalValues && (
            <div className="pt-2 border-t border-gray-100">
              <NutriBar
                calories={recipe.nutritionalValues.calories}
                proteins={recipe.nutritionalValues.proteins}
                carbs={recipe.nutritionalValues.carbs}
                fats={recipe.nutritionalValues.fats}
              />
            </div>
          )}
        </div>

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
          <div className="space-y-3 mb-4">
            {/* View Mode Switcher */}
            <div className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Organizzazione ingredienti
                </span>
                <span className="text-xs text-gray-400">
                  {recipe.adaptedIngredients.length} ingredienti
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

            {/* Mode 1: Grouped by Nutrition Macro Category */}
            {ingredientView === 'category' && (
              <div className="space-y-3">
                {(['proteins', 'carbs', 'vegetables', 'fats', 'dairy', 'fruits', 'other'] as const).map(cat => {
                  const items = recipe.adaptedIngredients.filter(ing => ing.category === cat)
                  if (items.length === 0) return null
                  const label = CATEGORY_LABELS[cat] || cat
                  const icon = CATEGORY_ICONS[cat] || '🍴'

                  return (
                    <div key={cat} className="card p-3.5 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{icon}</span>
                          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            {label}
                          </h4>
                          <span className="text-[11px] text-gray-400">
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

                      <div className="space-y-1.5">
                        {items.map((ing, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm text-gray-800 font-medium">{ing.name}</span>
                              {ing.component && ing.component !== 'Principale' && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                                  {ing.component}
                                </span>
                              )}
                              {ing.isOptional && <span className="text-xs text-gray-400">(opz.)</span>}
                            </div>
                            <span className="font-bold text-primary-700 text-sm">
                              {ing.adaptedQuantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Mode 2: Grouped by Culinary Component */}
            {ingredientView === 'component' && (
              <div className="space-y-3">
                {Array.from(
                  recipe.adaptedIngredients.reduce((map, ing) => {
                    const comp = ing.component || 'Preparazione principale'
                    if (!map.has(comp)) map.set(comp, [])
                    map.get(comp)!.push(ing)
                    return map
                  }, new Map<string, typeof recipe.adaptedIngredients>())
                ).map(([compName, items]) => (
                  <div key={compName} className="card p-3.5 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">🥪</span>
                        <h4 className="text-xs font-bold text-gray-900">{compName}</h4>
                        <span className="text-[11px] text-gray-400">({items.length} alimenti)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {items.map((ing, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Badge variant={ing.category as any} className="text-[10px] py-0.5">
                              {CATEGORY_LABELS[ing.category]}
                            </Badge>
                            <span className="text-sm text-gray-800 font-medium">{ing.name}</span>
                            {ing.isOptional && <span className="text-xs text-gray-400">(opz.)</span>}
                          </div>
                          <span className="font-bold text-primary-700 text-sm">
                            {ing.adaptedQuantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mode 3: Standard Flat List */}
            {ingredientView === 'list' && (
              <div className="card p-4 space-y-2">
                <div className="space-y-2">
                  {recipe.adaptedIngredients.map((ing, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant={ing.category as any} className="text-xs">
                          {CATEGORY_LABELS[ing.category]}
                        </Badge>
                        <span className="text-sm text-gray-800">{ing.name}</span>
                        {ing.component && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            {ing.component}
                          </span>
                        )}
                        {ing.isOptional && <span className="text-xs text-gray-400">(opz.)</span>}
                      </div>
                      <span className="font-bold text-primary-700 text-sm">
                        {ing.adaptedQuantity}
                      </span>
                    </div>
                  ))}
                </div>
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

        {/* ── Tab: Preparation / Steps (Clean, Natural, No Banners) ── */}
        {tab === 'steps' && (
          <div className="space-y-3 mb-4">
            {recipe.steps.map((step) => (
              <div key={step.order} className="card p-4 flex gap-3.5 items-start">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  {step.order}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-gray-800 leading-relaxed font-normal">
                    {step.description}
                  </p>
                  {step.duration && (
                    <p className="text-xs text-gray-400 pt-0.5">⏱ {step.duration}</p>
                  )}
                  {step.tip && (
                    <p className="text-xs text-primary-700 bg-primary-50 rounded-lg px-2.5 py-1 mt-1 font-medium">
                      💡 {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
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
      {showAddToPlanner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Aggiungi al Meal Planner</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Pasto</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedMeal(opt.value)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        selectedMeal === opt.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddToPlanner(false)} className="btn-secondary flex-1">
                  Annulla
                </button>
                <button onClick={addToPlanner} className="btn-primary flex-1">
                  Conferma ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
