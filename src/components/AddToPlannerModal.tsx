import { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, generateId } from '@/lib/utils'
import type { Recipe, MealType, RecipeMealVariant } from '@/types'

interface AddToPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe
  variants?: RecipeMealVariant[]
  defaultMeal?: MealType
  onSuccess?: () => void
}

const MEAL_SLOTS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Colazione', icon: '🌅' },
  { value: 'snack_am', label: 'Spuntino mattutino', icon: '🍎' },
  { value: 'lunch', label: 'Pranzo', icon: '☀️' },
  { value: 'snack_pm', label: 'Merenda', icon: '🍪' },
  { value: 'dinner', label: 'Cena', icon: '🌙' },
]

export default function AddToPlannerModal({
  isOpen,
  onClose,
  recipe,
  variants,
  defaultMeal,
  onSuccess,
}: AddToPlannerModalProps) {
  const recipeVariants = variants || recipe.variants || []

  // Generate next 14 days starting today
  const today = new Date()
  const daysList = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString('it-IT', { month: 'short' }),
      isToday: i === 0,
      isTomorrow: i === 1,
    }
  })

  const [selectedDate, setSelectedDate] = useState<string>(daysList[0].dateStr)
  const [selectedMeal, setSelectedMeal] = useState<MealType>(() => {
    if (defaultMeal) return defaultMeal
    if (recipe.targetMeal === 'dinner') return 'dinner'
    if (recipe.targetMeal === 'breakfast') return 'breakfast'
    if (recipe.targetMeal === 'snack_am') return 'snack_am'
    if (recipe.targetMeal === 'snack_pm') return 'snack_pm'
    return 'lunch'
  })

  const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
    if (recipeVariants.length > 0) {
      const match = recipeVariants.find(v => v.mealType === selectedMeal)
      return match ? match.id : recipeVariants[0].id
    }
    return ''
  })

  useEffect(() => {
    if (recipeVariants.length > 0) {
      const match = recipeVariants.find(v => v.mealType === selectedMeal)
      if (match) setSelectedVariantId(match.id)
    }
  }, [selectedMeal, recipeVariants])

  const [customDate, setCustomDate] = useState(false)
  const [saving, setSaving] = useState(false)

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

  if (!isOpen) return null

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const chosenVariant = recipeVariants.find(v => v.id === selectedVariantId)
      await db.plannedMeals.add({
        id: generateId(),
        date: selectedDate,
        mealType: selectedMeal,
        recipeId: recipe.id,
        variantId: chosenVariant?.id,
        variantLabel: chosenVariant?.label,
        isCompleted: false,
      })
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Error adding meal to planner:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in touch-none"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[82dvh] sm:max-h-[85dvh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                Aggiungi al Meal Planner
              </h3>
              <p className="text-xs text-gray-400">Pianifica quando gustare questa ricetta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
          {/* Recipe Summary Box */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {recipe.thumbnailUrl ? (
                <img src={recipe.thumbnailUrl} alt={recipe.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{MEAL_ICONS[recipe.targetMeal] ?? '🍽️'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate leading-tight">
                {recipe.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200/60">
                  {MEAL_LABELS[recipe.targetMeal]}
                </span>
                {recipe.nutritionalValues && (
                  <span>{recipe.nutritionalValues.calories} kcal • {recipe.nutritionalValues.proteins}g P</span>
                )}
              </div>
            </div>
          </div>

          {/* Step 1: Date Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>1. Scegli il giorno</span>
              </label>
              <button
                onClick={() => setCustomDate(!customDate)}
                className="text-[11px] font-semibold text-primary-600 hover:underline"
              >
                {customDate ? 'Visualizza prossimi giorni' : 'Altra data…'}
              </button>
            </div>

            {customDate ? (
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input-field text-sm font-semibold"
                min={new Date().toISOString().split('T')[0]}
              />
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
                {daysList.map(d => {
                  const isSelected = selectedDate === d.dateStr
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center w-16 py-2.5 px-1.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200/90'
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary-100' : 'text-gray-400'}`}>
                        {d.isToday ? 'Oggi' : d.isTomorrow ? 'Domani' : d.dayName}
                      </span>
                      <span className="text-base font-extrabold mt-0.5">{d.dayNumber}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-primary-200' : 'text-gray-400'}`}>
                        {d.monthName}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Step 2: Meal Slot Selection */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
              2. Scegli il pasto
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MEAL_SLOTS.map(opt => {
                const isSelected = selectedMeal === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedMeal(opt.value)}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                      isSelected
                        ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500/30'
                        : 'bg-white hover:bg-gray-50 border-gray-200/80 text-gray-700'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                        {opt.label}
                      </p>
                      {isSelected && (
                        <span className="text-[10px] text-primary-600 font-semibold">Selezionato ✓</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 3: Variant Selection (if recipe has variants) */}
          {recipeVariants.length > 1 && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                3. Grammatura / Variante
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipeVariants.map(v => {
                  const isSelected = selectedVariantId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id)
                        if (v.mealType) setSelectedMeal(v.mealType)
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500/20'
                          : 'bg-white hover:bg-gray-50 border-gray-200/80'
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? 'text-primary-950' : 'text-gray-900'}`}>
                          {v.label}
                        </p>
                        {v.nutritionalValues && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {v.nutritionalValues.calories} kcal • {v.nutritionalValues.proteins}g P • {v.nutritionalValues.carbs}g C
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-primary-600 font-bold text-xs ml-2">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer with Safe-Area Padding */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <span>📅</span>
            <span>{saving ? 'Aggiungo…' : 'Conferma nel Piano ✓'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
