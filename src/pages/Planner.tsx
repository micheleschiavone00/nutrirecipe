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
  const [selectedDayFocus, setSelectedDayFocus] = useState<string | null>(null)

  const scrollToDay = (day: string) => {
    setSelectedDayFocus(day)
    const element = document.getElementById(`day-card-${day}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

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

  const handleQuickCheat = async (date: string, mealType: MealType) => {
    await db.plannedMeals.add({
      id: generateId(),
      date,
      mealType,
      customLabel: 'Pasto Libero / Sgarro 🍕',
      isCheatMeal: true,
      isCompleted: false,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Meal Planner"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
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

      {/* Sticky Week Navigation & Interactive Tappable Days Bar */}
      <div className="sticky top-14 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-2.5 transition-colors shadow-2xs">
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">
            ←
          </button>
          <div className="text-center">
            <p className="font-extrabold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
              {formatDayLabel(weekDays[0], true)} – {formatDayLabel(weekDays[6], true)}
            </p>
          </div>
          <button onClick={nextWeek} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">
            →
          </button>
        </div>

        {/* Day tabs - Interactive and Smooth Scrollable */}
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide py-0.5">
          {weekDays.map(day => {
            const isDayToday = isToday(day)
            const isFocused = selectedDayFocus === day
            return (
              <button
                key={day}
                type="button"
                onClick={() => scrollToDay(day)}
                className={cn(
                  'flex-1 min-w-[42px] flex flex-col items-center px-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer',
                  isFocused
                    ? 'bg-primary-600 text-white ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-gray-900 shadow-xs'
                    : isDayToday
                    ? 'bg-primary-500 text-white shadow-2xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
                title={`Scorri fino a ${formatDayLabel(day)}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  {new Date(day).toLocaleDateString('it-IT', { weekday: 'short' })}
                </span>
                <span className="font-extrabold text-xs sm:text-sm">{new Date(day).getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Planner grid */}
      <div className="px-4 pt-4 space-y-4">
        {weekDays.map(day => (
          <DayCard
            key={day}
            day={day}
            isToday={isToday(day)}
            isFocused={selectedDayFocus === day}
            plannedMeals={plannedMeals ?? []}
            recipesMap={recipesMap ?? {}}
            onRemove={removeMeal}
            onToggle={toggleComplete}
            onAdd={(mealType) => setSlotToSelect({ date: day, mealType })}
            onQuickCheat={(mealType) => handleQuickCheat(day, mealType)}
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
          onSelectRecipe={async (recipeId, variantId, variantLabel) => {
            await db.plannedMeals.add({
              id: generateId(),
              date: slotToSelect.date,
              mealType: slotToSelect.mealType,
              recipeId,
              variantId,
              variantLabel,
              isCompleted: false,
            })
          }}
          onAddCustomMeal={async (customLabel) => {
            const isCheat =
              customLabel.toLowerCase().includes('pasto libero') ||
              customLabel.toLowerCase().includes('sgarro') ||
              customLabel.toLowerCase().includes('cheat')
            await db.plannedMeals.add({
              id: generateId(),
              date: slotToSelect.date,
              mealType: slotToSelect.mealType,
              customLabel,
              isCheatMeal: isCheat,
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
  day, isToday, isFocused, plannedMeals, recipesMap, onRemove, onToggle, onAdd, onQuickCheat, onRecipeClick,
}: {
  day: string
  isToday: boolean
  isFocused?: boolean
  plannedMeals: PlannedMeal[]
  recipesMap: Record<string, Recipe>
  onRemove: (id: string) => void
  onToggle: (meal: PlannedMeal) => void
  onAdd: (mealType: MealType) => void
  onQuickCheat: (mealType: MealType) => void
  onRecipeClick: (recipeId: string) => void
}) {
  const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']
  const dayMeals = plannedMeals.filter(m => m.date === day)

  return (
    <div
      id={`day-card-${day}`}
      className={cn(
        'card overflow-hidden scroll-mt-36 transition-all duration-300',
        isToday && 'ring-2 ring-primary-400',
        isFocused && 'ring-2 ring-primary-500 shadow-md'
      )}
    >
      <div className={cn(
        'px-4 py-2.5 flex items-center justify-between',
        isToday ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200'
      )}>
        <p className="font-semibold text-sm">
          {isToday ? '📍 ' : ''}{formatDayLabel(day, true)}
        </p>
        {isToday && <span className="text-xs text-primary-100 font-bold">Oggi</span>}
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {MEAL_ORDER.map(mealType => {
          const slots = dayMeals.filter(m => m.mealType === mealType)
          return (
            <div key={mealType} className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{MEAL_LABELS[mealType]}</p>
                <button
                  onClick={() => onAdd(mealType)}
                  className="text-primary-600 dark:text-primary-400 text-xs font-semibold hover:underline"
                >
                  + Aggiungi
                </button>
              </div>
              {slots.length === 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAdd(mealType)}
                    className="flex-1 py-2 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
                  >
                    Nessuna ricetta pianificata
                  </button>
                  {(mealType === 'lunch' || mealType === 'dinner') && (
                    <button
                      type="button"
                      onClick={() => onQuickCheat(mealType)}
                      title={`Imposta ${mealType === 'lunch' ? 'Pranzo' : 'Cena'} come Pasto Libero / Sgarro`}
                      className="px-2.5 py-2 border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all flex-shrink-0 active:scale-95 shadow-2xs"
                    >
                      <span>🍕</span>
                      <span className="hidden sm:inline">Pasto Libero</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {slots.length > 1 && (
                    <div className="px-2.5 py-1 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-[10px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>🥗</span>
                        <span>Pasto Composto ({slots.length} pietanze)</span>
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-gray-800 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-700">
                        Verdure &amp; Dosi Ripartite ✓
                      </span>
                    </div>
                  )}
                  {slots.map(slot => {
                    const recipe = slot.recipeId ? recipesMap[slot.recipeId] : null
                    const isCheat =
                      slot.isCheatMeal ||
                      slot.customLabel?.toLowerCase().includes('pasto libero') ||
                      slot.customLabel?.toLowerCase().includes('sgarro')

                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-xl border border-transparent transition-all',
                          slot.isCompleted
                            ? 'bg-green-50 dark:bg-green-950/30 opacity-60'
                            : isCheat
                            ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-800/60'
                            : 'bg-gray-50 dark:bg-gray-800/50'
                        )}
                      >
                        <button onClick={() => onToggle(slot)} className="flex-shrink-0">
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            slot.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'
                          )}>
                            {slot.isCompleted && <span className="text-xs">✓</span>}
                          </div>
                        </button>
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => recipe && onRecipeClick(recipe.id)}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={cn('text-sm font-medium', slot.isCompleted && 'line-through text-gray-400 dark:text-gray-500')}>
                              {recipe?.title ?? slot.customLabel ?? 'Pasto personalizzato'}
                            </p>
                            {isCheat && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                                <span>🍕</span>
                                <span>Pasto Libero</span>
                              </span>
                            )}
                            {slot.variantLabel && (
                              <span className="text-[10px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 px-1.5 py-0.5 rounded-md border border-primary-200/60 dark:border-primary-800">
                                {slot.variantLabel}
                              </span>
                            )}
                          </div>
                          {recipe?.nutritionalValues && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{recipe.nutritionalValues.calories} kcal</p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemove(slot.id)}
                          className="text-gray-300 dark:text-gray-600 hover:text-red-400 text-sm p-1"
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
