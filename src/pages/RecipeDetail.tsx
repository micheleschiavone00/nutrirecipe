import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, CATEGORY_LABELS, formatDate } from '@/lib/utils'
import { enrichRecipeStepsWithDoses } from '@/lib/recipeEnricher'
import { reformatRecipeStepsWithAI } from '@/lib/ai'
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
  const [isReformatting, setIsReformatting] = useState(false)
  const [enrichMsg, setEnrichMsg] = useState('')

  const recipe = useLiveQuery(() => id ? db.recipes.get(id) : undefined, [id])

  if (recipe === undefined) return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (recipe === null) return (
    <div className="min-h-screen flex items-center justify-center">
      <EmptyState icon="😕" title="Ricetta non trovata" description="La ricetta potrebbe essere stata eliminata." />
    </div>
  )

  const toggleFavorite = () => db.recipes.update(recipe.id, { isFavorite: !recipe.isFavorite })

  const deleteRecipe = async () => {
    if (confirm('Eliminare questa ricetta?')) {
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

  const handleEnrichSteps = async () => {
    if (!recipe) return
    const { recipe: enriched, changed } = enrichRecipeStepsWithDoses(recipe)
    if (changed) {
      await db.recipes.put(enriched)
      setEnrichMsg('✅ Dosi aggiunte ai passaggi!')
    } else {
      setEnrichMsg('ℹ️ Le dosi sono già presenti nei passaggi')
    }
    setTimeout(() => setEnrichMsg(''), 3000)
  }

  const handleReformatWithAI = async () => {
    if (!recipe) return
    setIsReformatting(true)
    setEnrichMsg("🤖 L'AI sta integrando le dosi nei passaggi…")
    try {
      const updatedSteps = await reformatRecipeStepsWithAI(recipe.title, recipe.adaptedIngredients, recipe.steps)
      await db.recipes.update(recipe.id, { steps: updatedSteps, updatedAt: new Date() })
      setEnrichMsg('✅ Passaggi riformulati con successo!')
    } catch {
      setEnrichMsg('❌ Errore durante la riformulazione AI')
    } finally {
      setIsReformatting(false)
      setTimeout(() => setEnrichMsg(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero image / back button */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center">
          {recipe.thumbnailUrl ? (
            <img src={recipe.thumbnailUrl} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl opacity-50">{MEAL_ICONS[recipe.targetMeal] ?? '🍽️'}</span>
          )}
        </div>
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-safe left-4 mt-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          ←
        </button>
        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-safe right-4 mt-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md"
        >
          {recipe.isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6">
        <div className="card p-4 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{recipe.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative inline-flex items-center">
              <select
                value={recipe.targetMeal}
                onChange={async (e) => {
                  await db.recipes.update(recipe.id, { targetMeal: e.target.value as TargetMealType })
                }}
                className="appearance-none bg-primary-100 hover:bg-primary-200 text-primary-800 text-xs font-semibold px-3 py-1 pr-6 rounded-full border border-primary-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
                title="Cambia categoria pasto"
              >
                {TARGET_MEAL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="absolute right-2 pointer-events-none text-[9px] text-primary-600">▼</span>
            </div>
            {recipe.source !== 'manual' && (
              <Badge className="bg-gray-100 text-gray-600 capitalize">{recipe.source}</Badge>
            )}
            {recipe.prepTime && (
              <Badge className="bg-blue-50 text-blue-600">⏱ {recipe.prepTime + (recipe.cookTime ?? 0)} min</Badge>
            )}
            {recipe.tags.map(tag => (
              <Badge key={tag} className="bg-gray-50 text-gray-500">#{tag}</Badge>
            ))}
          </div>

          {recipe.nutritionalValues && (
            <NutriBar
              calories={recipe.nutritionalValues.calories}
              proteins={recipe.nutritionalValues.proteins}
              carbs={recipe.nutritionalValues.carbs}
              fats={recipe.nutritionalValues.fats}
            />
          )}
        </div>

        {/* Adaptation notes */}
        {recipe.adaptationNotes && (
          <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-primary-700 mb-1 uppercase tracking-wide">🤖 Note adattamento AI</p>
            <p className="text-sm text-primary-900 leading-relaxed">{recipe.adaptationNotes}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
          {(['ingredients', 'steps', 'notes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'ingredients' ? '🥗 Ingredienti' : t === 'steps' ? '👨‍🍳 Preparazione' : '📝 Note'}
            </button>
          ))}
        </div>

        {/* Ingredients tab */}
        {tab === 'ingredients' && (
          <div className="space-y-3 mb-4">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                ✅ Ingredienti adattati al tuo piano
              </h3>
              <div className="space-y-2">
                {recipe.adaptedIngredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 flex-1">
                      <Badge variant={ing.category as any} className="text-xs">
                        {CATEGORY_LABELS[ing.category]}
                      </Badge>
                      <span className="text-sm text-gray-800">{ing.name}</span>
                      {ing.isOptional && <span className="text-xs text-gray-400">(opz.)</span>}
                    </div>
                    <span className="font-bold text-primary-700 text-sm">{ing.adaptedQuantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {recipe.originalIngredients.some((ing, i) =>
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

        {/* Steps tab */}
        {tab === 'steps' && (
          <div className="space-y-3 mb-4">
            {/* Quick Actions for Doses */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <div>
                  <p className="text-xs font-bold text-emerald-900">Dosi nei procedimenti</p>
                  <p className="text-[11px] text-emerald-700">Le quantità adattate appaiono tra parentesi</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={handleEnrichSteps}
                  className="flex-1 sm:flex-initial text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-xl shadow-xs transition-colors"
                >
                  🔄 Inserisci dosi
                </button>
                <button
                  onClick={handleReformatWithAI}
                  disabled={isReformatting}
                  className="flex-1 sm:flex-initial text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-xl shadow-xs transition-colors"
                >
                  {isReformatting ? '⏳ Elaboro…' : '✨ Con AI'}
                </button>
              </div>
            </div>

            {enrichMsg && (
              <div className="bg-primary-100 text-primary-900 text-xs font-semibold px-3 py-2 rounded-xl text-center animate-fade-in">
                {enrichMsg}
              </div>
            )}

            {recipe.steps.map((step) => (
              <div key={step.order} className="card p-4 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {step.order}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed">{step.description}</p>
                  {step.duration && (
                    <p className="text-xs text-gray-400 mt-1">⏱ {step.duration}</p>
                  )}
                  {step.tip && (
                    <p className="text-xs text-primary-600 mt-1 bg-primary-50 rounded-lg px-2 py-1">
                      💡 {step.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes tab */}
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

        {/* Action buttons */}
        <div className="flex gap-3 pb-8">
          <button onClick={deleteRecipe} className="btn-secondary text-red-500 border-red-200 flex-1">
            🗑 Elimina
          </button>
          <button
            onClick={openAddToPlanner}
            className="btn-primary flex-1"
          >
            📅 Aggiungi al piano
          </button>
        </div>
      </div>

      {/* Add to planner modal */}
      {showAddToPlanner && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
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
              <div className="flex gap-3">
                <button onClick={() => setShowAddToPlanner(false)} className="btn-secondary flex-1">Annulla</button>
                <button onClick={addToPlanner} className="btn-primary flex-1">Conferma ✓</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
