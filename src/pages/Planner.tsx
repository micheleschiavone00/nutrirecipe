import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, generateShoppingList as createShoppingList } from '@/lib/db'
import { getMonday, getWeekDays, formatDayLabel, MEAL_LABELS, MEAL_ICONS, generateId, cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui'
import SelectRecipeModal from '@/components/SelectRecipeModal'
import WeeklyTemplatesModal from '@/components/WeeklyTemplatesModal'
import type { MealType, PlannedMeal, Recipe } from '@/types'

const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']

export default function PlannerPage() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(getMonday())
  const weekDays = getWeekDays(weekStart)
  const [slotToSelect, setSlotToSelect] = useState<{ date: string; mealType: MealType } | null>(null)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  const plannedMeals = useLiveQuery(
    () => db.plannedMeals.where('date').between(weekDays[0], weekDays[6], true, true).toArray(),
    [weekStart]
  )

  const recipeIds = [...new Set((plannedMeals ?? []).map(m => m.recipeId).filter(Boolean) as string[])]
  const recipesMap = useLiveQuery(
    async () => {
      if (recipeIds.length === 0) return {}
      const recipes = await db.recipes.bulkGet(recipeIds)
      return Object.fromEntries(
        recipes.filter(Boolean).map(r => [r!.id, r!])
      )
    },
    [JSON.stringify(recipeIds)]
  )

  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  const removeMeal = (id: string) => db.plannedMeals.delete(id)

  const toggleComplete = (meal: PlannedMeal) =>
    db.plannedMeals.update(meal.id, { isCompleted: !meal.isCompleted })

  const handleGenerateShoppingList = async () => {
    await createShoppingList(weekStart)
    navigate('/shopping')
  }

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Meal Planner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              📋 Modelli
            </button>
            <button
              onClick={handleGenerateShoppingList}
              className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              🛒 Spesa
            </button>
          </div>
        }
      />

      {/* Week navigation */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-sm">
              {formatDayLabel(weekDays[0], true)} – {formatDayLabel(weekDays[6], true)}
            </p>
          </div>
          <button onClick={nextWeek} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            →
          </button>
        </div>

        {/* Day tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide">
          {weekDays.map(day => (
            <div
              key={day}
              className={cn(
                'flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-medium',
                isToday(day) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              <span>{new Date(day).toLocaleDateString('it-IT', { weekday: 'short' })}</span>
              <span className="font-bold text-sm">{new Date(day).getDate()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Planner grid */}
      <div className="px-4 pt-4 space-y-4">
        {weekDays.map(day => (
          <DayCard
            key={day}
            day={day}
            isToday={isToday(day)}
            plannedMeals={plannedMeals ?? []}
            recipesMap={recipesMap ?? {}}
            onRemove={removeMeal}
            onToggle={toggleComplete}
            onAdd={(mealType) => setSlotToSelect({ date: day, mealType })}
            onRecipeClick={(recipeId) => navigate(`/recipes/${recipeId}`)}
          />
        ))}
      </div>

      {/* Direct Recipe Add Modal */}
      {slotToSelect && (
        <SelectRecipeModal
          isOpen={Boolean(slotToSelect)}
          onClose={() => setSlotToSelect(null)}
          date={slotToSelect.date}
          mealType={slotToSelect.mealType}
          onSelectRecipe={async (recipeId) => {
            await db.plannedMeals.add({
              id: generateId(),
              date: slotToSelect.date,
              mealType: slotToSelect.mealType,
              recipeId,
              isCompleted: false,
            })
          }}
          onAddCustomMeal={async (customLabel) => {
            await db.plannedMeals.add({
              id: generateId(),
              date: slotToSelect.date,
              mealType: slotToSelect.mealType,
              customLabel,
              isCompleted: false,
            })
          }}
          onImportNew={() => {
            navigate(`/import?date=${slotToSelect.date}&meal=${slotToSelect.mealType}`)
          }}
        />
      )}

      {/* Weekly Standard Templates Modal */}
      <WeeklyTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        currentWeekDays={weekDays}
        currentWeekMeals={plannedMeals ?? []}
        recipesMap={recipesMap ?? {}}
        onApplied={() => {
          // Live query auto refreshes
        }}
      />

      <div className="h-6" />
    </div>
  )
}

function DayCard({
  day, isToday, plannedMeals, recipesMap, onRemove, onToggle, onAdd, onRecipeClick,
}: {
  day: string
  isToday: boolean
  plannedMeals: PlannedMeal[]
  recipesMap: Record<string, Recipe>
  onRemove: (id: string) => void
  onToggle: (meal: PlannedMeal) => void
  onAdd: (mealType: MealType) => void
  onRecipeClick: (recipeId: string) => void
}) {
  const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']
  const dayMeals = plannedMeals.filter(m => m.date === day)

  return (
    <div className={cn('card overflow-hidden', isToday && 'ring-2 ring-primary-400')}>
      <div className={cn(
        'px-4 py-2.5 flex items-center justify-between',
        isToday ? 'bg-primary-500' : 'bg-gray-50 border-b border-gray-100'
      )}>
        <p className={cn('font-semibold text-sm', isToday ? 'text-white' : 'text-gray-700')}>
          {isToday ? '📍 ' : ''}{formatDayLabel(day, true)}
        </p>
        {isToday && <span className="text-xs text-primary-100">Oggi</span>}
      </div>
      <div className="divide-y divide-gray-50">
        {MEAL_ORDER.map(mealType => {
          const slots = dayMeals.filter(m => m.mealType === mealType)
          return (
            <div key={mealType} className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500">{MEAL_LABELS[mealType]}</p>
                <button
                  onClick={() => onAdd(mealType)}
                  className="text-primary-500 text-xs font-medium"
                >
                  + Aggiungi
                </button>
              </div>
              {slots.length === 0 ? (
                <button
                  onClick={() => onAdd(mealType)}
                  className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs text-gray-300 hover:border-primary-300 hover:text-primary-400 transition-colors"
                >
                  Nessuna ricetta pianificata
                </button>
              ) : (
                <div className="space-y-1.5">
                  {slots.map(slot => {
                    const recipe = slot.recipeId ? recipesMap[slot.recipeId] : null
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl',
                          slot.isCompleted ? 'bg-green-50 opacity-60' : 'bg-gray-50'
                        )}
                      >
                        <button onClick={() => onToggle(slot)} className="flex-shrink-0">
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            slot.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                          )}>
                            {slot.isCompleted && <span className="text-xs">✓</span>}
                          </div>
                        </button>
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => recipe && onRecipeClick(recipe.id)}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={cn('text-sm font-medium', slot.isCompleted && 'line-through text-gray-400')}>
                              {recipe?.title ?? slot.customLabel ?? 'Pasto personalizzato'}
                            </p>
                            {slot.variantLabel && (
                              <span className="text-[10px] font-semibold bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded-md border border-primary-200/60">
                                {slot.variantLabel}
                              </span>
                            )}
                          </div>
                          {recipe?.nutritionalValues && (
                            <p className="text-xs text-gray-400">{recipe.nutritionalValues.calories} kcal</p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemove(slot.id)}
                          className="text-gray-300 hover:text-red-400 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
