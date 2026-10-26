import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveProfile } from '@/lib/db'
import { generateId, MEAL_LABELS, MEAL_ICONS, getMonday, getWeekDays } from '@/lib/utils'
import {
  FOOD_CATEGORY_INFO,
  DEFAULT_WEEKLY_RULES,
  detectFoodCategory,
  evaluateWeeklyPlan,
  checkRecipeRecommendation,
} from '@/lib/foodRules'
import type {
  WeeklyTemplate,
  WeeklyTemplateMeal,
  MealType,
  Recipe,
  PlannedMeal,
} from '@/types'

const DAYS_CONFIG = [
  { dayOffset: 0, name: 'Lunedì', short: 'Lun', emoji: '🌅' },
  { dayOffset: 1, name: 'Martedì', short: 'Mar', emoji: '☀️' },
  { dayOffset: 2, name: 'Mercoledì', short: 'Mer', emoji: '🌿' },
  { dayOffset: 3, name: 'Giovedì', short: 'Gio', emoji: '⚡' },
  { dayOffset: 4, name: 'Venerdì', short: 'Ven', emoji: '🎉' },
  { dayOffset: 5, name: 'Sabato', short: 'Sab', emoji: '🍕' },
  { dayOffset: 6, name: 'Domenica', short: 'Dom', emoji: '☕' },
]

const MEAL_SLOTS: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']

export default function CreateTemplateWizardPage() {
  const navigate = useNavigate()
  const activeProfile = useLiveQuery(() => getActiveProfile(), [])
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), [])

  const recipesMap = useMemo(() => {
    const map: Record<string, Recipe> = {}
    ;(allRecipes || []).forEach(r => {
      map[r.id] = r
    })
    return map
  }, [allRecipes])

  // Current day index in focus (0 = Lunedì, ..., 6 = Domenica, 7 = Riepilogo Finale)
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0)
  const [templateMeals, setTemplateMeals] = useState<WeeklyTemplateMeal[]>([])

  // Template metadata
  const [templateName, setTemplateName] = useState('Settimana Standard')
  const [templateDesc, setTemplateDesc] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Picker modal state
  const [pickerSlot, setPickerSlot] = useState<{ dayOffset: number; mealType: MealType } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<string>('all')
  const [customMealInput, setCustomMealInput] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)

  // Lock background scroll when picker is open
  useEffect(() => {
    if (!pickerSlot) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [pickerSlot])

  // Rules from active profile or default
  const rules = activeProfile?.weeklyFrequencies || DEFAULT_WEEKLY_RULES

  // Real-time evaluation of the plan
  const evaluation = useMemo(() => {
    return evaluateWeeklyPlan(templateMeals, recipesMap, rules, currentDayIndex)
  }, [templateMeals, recipesMap, rules, currentDayIndex])

  // Active day meals
  const currentDayMeals = useMemo(() => {
    return templateMeals.filter(m => m.dayOffset === currentDayIndex)
  }, [templateMeals, currentDayIndex])

  const setMealForSlot = (
    dayOffset: number,
    mealType: MealType,
    recipeId?: string,
    variantId?: string,
    variantLabel?: string,
    customLabel?: string,
    isCheatMeal?: boolean
  ) => {
    setTemplateMeals(prev => {
      // Remove any existing meal in this slot
      const filtered = prev.filter(m => !(m.dayOffset === dayOffset && m.mealType === mealType))
      return [
        ...filtered,
        {
          dayOffset,
          mealType,
          recipeId,
          variantId,
          variantLabel,
          customLabel,
          isCheatMeal,
        },
      ]
    })
    setPickerSlot(null)
    setCustomMealInput('')
    setIsCustomMode(false)
  }

  const removeMealFromSlot = (dayOffset: number, mealType: MealType) => {
    setTemplateMeals(prev =>
      prev.filter(m => !(m.dayOffset === dayOffset && m.mealType === mealType))
    )
  }

  // Quick 1-click cheat meal setter for dinner
  const handleQuickSetCheat = (dayOffset: number) => {
    setMealForSlot(dayOffset, 'dinner', undefined, undefined, undefined, 'Pasto Libero / Sgarro 🍕', true)
  }

  // Save template to DB
  const handleSave = async (applyToCurrentWeek: boolean = false) => {
    if (!templateName.trim()) return
    setIsSaving(true)
    try {
      const newTemplate: WeeklyTemplate = {
        id: generateId(),
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        meals: templateMeals,
        createdAt: new Date(),
      }

      await db.weeklyTemplates.add(newTemplate)

      if (applyToCurrentWeek) {
        const weekDays = getWeekDays(getMonday())
        const planned: PlannedMeal[] = templateMeals.map(tm => ({
          id: generateId(),
          date: weekDays[tm.dayOffset] ?? weekDays[0],
          mealType: tm.mealType,
          recipeId: tm.recipeId,
          variantId: tm.variantId,
          variantLabel: tm.variantLabel,
          customLabel: tm.customLabel,
          isCheatMeal: tm.isCheatMeal,
          isCompleted: false,
        }))

        // Replace current week planned meals
        const existingWeekMeals = await db.plannedMeals
          .where('date')
          .between(weekDays[0], weekDays[6], true, true)
          .toArray()

        if (existingWeekMeals.length > 0) {
          await db.plannedMeals.bulkDelete(existingWeekMeals.map(m => m.id))
        }

        if (planned.length > 0) {
          await db.plannedMeals.bulkAdd(planned)
        }
      }

      navigate('/planner')
    } catch (err) {
      console.error('Error saving weekly template:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const currentDayInfo = DAYS_CONFIG[currentDayIndex] || DAYS_CONFIG[0]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-28">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (confirm('Vuoi uscire dalla creazione della settimana standard? Le modifiche non salvate andranno perse.')) {
                  navigate('/planner')
                }
              }}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                Crea Settimana Standard
              </h1>
              <p className="text-[11px] text-gray-400">
                Pianificazione guidata con frequenze nutrizionali
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentDayIndex(7)}
            className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition-all shadow-xs"
          >
            📋 Riepilogo ({templateMeals.length})
          </button>
        </div>

        {/* Days Step Navigator */}
        <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
          {DAYS_CONFIG.map((day, idx) => {
            const count = templateMeals.filter(m => m.dayOffset === idx).length
            const isSelected = currentDayIndex === idx

            return (
              <button
                key={day.dayOffset}
                type="button"
                onClick={() => setCurrentDayIndex(idx)}
                className={`flex-1 min-w-[3.4rem] py-1.5 px-1 rounded-xl text-center border transition-all ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200/80'
                }`}
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-[11px]">{day.emoji}</span>
                  <span className="text-xs font-bold">{day.short}</span>
                </div>
                <span
                  className={`text-[9px] font-semibold block mt-0.5 ${
                    isSelected ? 'text-primary-100' : count > 0 ? 'text-primary-600' : 'text-gray-400'
                  }`}
                >
                  {count > 0 ? `${count} pasti` : 'vuoto'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {currentDayIndex < 7 ? (
          <>
            {/* Focused Day Title */}
            <div className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary-200">
                  Giorno {currentDayIndex + 1} di 7
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
                  Cosa vuoi mangiare {currentDayInfo.name}? {currentDayInfo.emoji}
                </h2>
                <p className="text-xs text-primary-100 mt-1">
                  Scegli le ricette per colazione, pranzo e cena rispettando le tue frequenze.
                </p>
              </div>
              <div className="text-3xl opacity-90 hidden sm:block">
                {currentDayInfo.emoji}
              </div>
            </div>

            {/* Smart Nutrition Advisor Bar & Frequency Trackers */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span>📊</span>
                  <span>Frequenze Settimana finora</span>
                </span>
                <span className="text-[10px] text-gray-400">Aggiornato in tempo reale</span>
              </div>

              {/* Category Badges Counter */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                {rules.map(rule => {
                  const info = FOOD_CATEGORY_INFO[rule.category as keyof typeof FOOD_CATEGORY_INFO] || FOOD_CATEGORY_INFO.other
                  const count = evaluation.counts[rule.category as keyof typeof evaluation.counts] || 0
                  const max = rule.maxPerWeek
                  const target = rule.targetPerWeek
                  const isOver = max !== undefined && count >= max

                  return (
                    <div
                      key={rule.id}
                      className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs ${
                        isOver
                          ? 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-400'
                          : count > 0
                          ? 'bg-primary-50 border-primary-200 text-primary-900'
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className="text-sm">{info.icon}</span>
                      <div className="leading-tight">
                        <span className="font-bold block text-[11px]">{rule.label}</span>
                        <span className="text-[10px] font-semibold opacity-80">
                          {count}{max ? `/${max} max` : target ? `/${target}` : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Contextual Notices (Cheat Meal Reminder & Limit Warnings) */}
              {evaluation.notices.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  {evaluation.notices.map(notice => (
                    <div
                      key={notice.id}
                      className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                        notice.type === 'cheat_reminder'
                          ? 'bg-purple-50 border-purple-200 text-purple-900'
                          : notice.type === 'limit_warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-sky-50 border-sky-200 text-sky-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-xs">{notice.title}</p>
                          <p className="text-[11px] mt-0.5 opacity-90">{notice.message}</p>
                        </div>
                      </div>

                      {notice.actionType === 'set_cheat' && (
                        <button
                          type="button"
                          onClick={() => handleQuickSetCheat(currentDayIndex)}
                          className="mt-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl self-start shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <span>🍕 Imposta Cena di {currentDayInfo.name} come Pasto Libero</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meal Slots for Current Day */}
            <div className="space-y-3">
              {MEAL_SLOTS.map(mealType => {
                const assigned = currentDayMeals.find(m => m.mealType === mealType)
                const recipe = assigned?.recipeId ? recipesMap[assigned.recipeId] : null

                const foodCat = assigned
                  ? detectFoodCategory({
                      title: recipe?.title,
                      tags: recipe?.tags,
                      adaptedIngredients: recipe?.adaptedIngredients,
                      originalIngredients: recipe?.originalIngredients,
                      customLabel: assigned.customLabel,
                      isCheatMeal: assigned.isCheatMeal,
                    })
                  : null

                const catInfo = foodCat ? FOOD_CATEGORY_INFO[foodCat] : null

                return (
                  <div
                    key={mealType}
                    className="bg-white rounded-2xl border border-gray-200/80 p-3.5 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{MEAL_ICONS[mealType]}</span>
                        <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm">
                          {MEAL_LABELS[mealType]}
                        </h3>
                      </div>

                      {assigned && (
                        <div className="flex items-center gap-1.5">
                          {catInfo && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.badgeColor}`}>
                              {catInfo.icon} {catInfo.label}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMealFromSlot(currentDayIndex, mealType)}
                            className="text-gray-300 hover:text-red-500 text-xs p-1"
                            title="Rimuovi pasto"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {assigned ? (
                      /* Assigned Meal View */
                      <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {recipe?.thumbnailUrl ? (
                            <img
                              src={recipe.thumbnailUrl}
                              alt={recipe.title}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">
                              {assigned.isCheatMeal ? '🍕' : MEAL_ICONS[mealType]}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                              {recipe?.title || assigned.customLabel || 'Pasto personalizzato'}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                              {assigned.variantLabel && (
                                <span className="bg-primary-100 text-primary-800 font-bold px-1.5 py-0.5 rounded">
                                  {assigned.variantLabel}
                                </span>
                              )}
                              {recipe?.nutritionalValues && (
                                <span>
                                  {recipe.nutritionalValues.calories} kcal • {recipe.nutritionalValues.proteins}g P
                                </span>
                              )}
                              {assigned.isCheatMeal && (
                                <span className="text-purple-700 font-bold">Pasto Libero ✓</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPickerSlot({ dayOffset: currentDayIndex, mealType })}
                          className="btn-secondary py-1.5 px-3 text-xs font-bold flex-shrink-0"
                        >
                          Cambia
                        </button>
                      </div>
                    ) : (
                      /* Empty Slot View with Fast Actions */
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPickerSlot({ dayOffset: currentDayIndex, mealType })}
                          className="flex-1 py-2.5 px-3 border border-dashed border-gray-300 hover:border-primary-400 rounded-xl text-xs font-bold text-gray-600 hover:text-primary-700 flex items-center justify-center gap-1.5 bg-gray-50/50 hover:bg-primary-50/50 transition-all"
                        >
                          <span>➕</span>
                          <span>Scegli cosa mangiare</span>
                        </button>

                        {(mealType === 'lunch' || mealType === 'dinner') && (
                          <button
                            type="button"
                            onClick={() => handleQuickSetCheat(currentDayIndex)}
                            className="py-2.5 px-3 rounded-xl border border-purple-200 hover:border-purple-300 bg-purple-50/80 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center gap-1 transition-all flex-shrink-0"
                            title="Imposta come Pasto Libero / Sgarro"
                          >
                            <span>🍕</span>
                            <span className="hidden sm:inline">Pasto Libero</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          /* Step 7 / Riepilogo Finale & Salvataggio Modello */
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                    Riepilogo Settimana Standard
                  </h2>
                  <p className="text-xs text-gray-500">
                    Controlla il bilanciamento nutrizionale prima di salvare il modello.
                  </p>
                </div>
              </div>

              {/* Weekly Frequency Scorecard */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">
                  Bilanciamento Nutrizionale
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {rules.map(rule => {
                    const info = FOOD_CATEGORY_INFO[rule.category as keyof typeof FOOD_CATEGORY_INFO] || FOOD_CATEGORY_INFO.other
                    const count = evaluation.counts[rule.category as keyof typeof evaluation.counts] || 0
                    const max = rule.maxPerWeek
                    const target = rule.targetPerWeek
                    const isOver = max !== undefined && count > max
                    const isGood = (max && count <= max && count > 0) || (target && count >= target)

                    return (
                      <div
                        key={rule.id}
                        className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between ${
                          isOver
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : isGood
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base">{info.icon}</span>
                          <span className="font-bold truncate text-[11px]">{rule.label}</span>
                        </div>
                        <span className="font-extrabold text-xs ml-1 flex-shrink-0">
                          {count}{max ? `/${max}` : target ? `/${target}` : ''} {isOver ? '⚠️' : isGood ? '✓' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 7-Day Matrix Summary */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-gray-800 uppercase tracking-wide block">
                  Pasti per Giorno ({templateMeals.length} totali)
                </span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {DAYS_CONFIG.map((day, idx) => {
                    const dayMeals = templateMeals.filter(m => m.dayOffset === idx)
                    return (
                      <div
                        key={day.dayOffset}
                        onClick={() => setCurrentDayIndex(idx)}
                        className="p-2.5 rounded-xl border border-gray-200 hover:border-primary-400 bg-gray-50/70 hover:bg-white flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{day.emoji}</span>
                          <span className="font-bold text-xs text-gray-900">{day.name}</span>
                          <span className="text-[10px] text-gray-400">({dayMeals.length} pasti)</span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-gray-600">
                          {dayMeals.map(m => (
                            <span key={m.mealType} title={MEAL_LABELS[m.mealType]}>
                              {m.isCheatMeal ? '🍕' : MEAL_ICONS[m.mealType]}
                            </span>
                          ))}
                          <span className="text-primary-600 font-bold ml-1 text-xs">Modifica →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Metadata Form */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1">
                    Nome del Modello *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="es. Settimana Standard, Definizione Pesce, Equilibrata..."
                    className="input-field text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block mb-1">
                    Note / Descrizione (opzionale)
                  </label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={e => setTemplateDesc(e.target.value)}
                    placeholder="es. Sabato sera pasto libero, pesce a pranzo mercoledì e venerdì"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={isSaving || !templateName.trim() || templateMeals.length === 0}
                  onClick={() => handleSave(false)}
                  className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
                >
                  <span>💾</span>
                  <span>Salva solo nei Modelli</span>
                </button>
                <button
                  type="button"
                  disabled={isSaving || !templateName.trim() || templateMeals.length === 0}
                  onClick={() => handleSave(true)}
                  className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-lg flex items-center justify-center gap-1.5"
                >
                  <span>📅</span>
                  <span>Salva ed Applica a Questa Settimana ✓</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {currentDayIndex > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentDayIndex(prev => prev - 1)}
              className="btn-secondary py-2.5 px-4 text-xs font-bold flex items-center gap-1"
            >
              <span>←</span>
              <span>{DAYS_CONFIG[currentDayIndex - 1]?.short || 'Precedente'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (confirm('Vuoi annullare e tornare al Meal Planner?')) navigate('/planner')
              }}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3 py-2"
            >
              Annulla
            </button>
          )}

          <div className="text-center">
            {currentDayIndex < 7 ? (
              <p className="text-xs font-extrabold text-gray-900">
                {currentDayInfo.name} • {currentDayMeals.length}/5 pasti
              </p>
            ) : (
              <p className="text-xs font-extrabold text-primary-700">
                Riepilogo Finale
              </p>
            )}
          </div>

          {currentDayIndex < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentDayIndex(prev => prev + 1)}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1 shadow-md"
            >
              <span>{DAYS_CONFIG[currentDayIndex + 1]?.short}</span>
              <span>→</span>
            </button>
          ) : currentDayIndex === 6 ? (
            <button
              type="button"
              onClick={() => setCurrentDayIndex(7)}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1 shadow-md"
            >
              <span>Riepilogo ✓</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving || templateMeals.length === 0}
              onClick={() => handleSave(true)}
              className="btn-primary py-2.5 px-4 text-xs font-bold shadow-md"
            >
              <span>Salva ed Esci ✓</span>
            </button>
          )}
        </div>
      </div>

      {/* Recipe Picker Drawer / Modal */}
      {pickerSlot && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in touch-none"
          onClick={() => setPickerSlot(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[82dvh] sm:max-h-[85dvh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{MEAL_ICONS[pickerSlot.mealType]}</span>
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                    {DAYS_CONFIG[pickerSlot.dayOffset]?.name} • {MEAL_LABELS[pickerSlot.mealType]}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Scegli dal ricettario o inserisci un pasto libero
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Switch: Ricettario vs Pasto Libero */}
            <div className="px-4 sm:px-5 pt-3 pb-1 flex-shrink-0 bg-white">
              <div className="flex bg-gray-100 p-1 rounded-xl">
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
                  🍕 Pasto Libero / Testo
                </button>
              </div>
            </div>

            {isCustomMode ? (
              /* Custom or Free Meal Form */
              <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMealForSlot(
                        pickerSlot.dayOffset,
                        pickerSlot.mealType,
                        undefined,
                        undefined,
                        undefined,
                        'Pasto Libero / Sgarro 🍕',
                        true
                      )
                    }}
                    className="w-full p-4 rounded-2xl border-2 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                  >
                    <span>🍕</span>
                    <span>Imposta come Pasto Libero / Cheat Meal</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Oppure inserisci un pasto libero personalizzato
                  </label>
                  <input
                    type="text"
                    value={customMealInput}
                    onChange={e => setCustomMealInput(e.target.value)}
                    placeholder="es. Pizza margherita, Sushi, Cena con amici..."
                    className="input-field text-sm font-semibold"
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                  >
                    Torna al ricettario
                  </button>
                  <button
                    type="button"
                    disabled={!customMealInput.trim()}
                    onClick={() => {
                      setMealForSlot(
                        pickerSlot.dayOffset,
                        pickerSlot.mealType,
                        undefined,
                        undefined,
                        undefined,
                        customMealInput.trim(),
                        false
                      )
                    }}
                    className="btn-primary flex-1 py-2.5 text-xs font-bold shadow-md"
                  >
                    Salva Pasto ✓
                  </button>
                </div>
              </div>
            ) : (
              /* Cookbook Recipe Picker with Intelligent Frequency Guidance */
              <>
                <div className="px-4 sm:px-5 py-2 space-y-2 flex-shrink-0 bg-white">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      placeholder="Cerca ricetta o ingrediente..."
                      className="input-field pl-9 py-2 text-xs"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPickerCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        pickerCategoryFilter === 'all'
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Tutte ({allRecipes?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerCategoryFilter('fish')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        pickerCategoryFilter === 'fish'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🐟 Pesce
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerCategoryFilter('white_meat')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        pickerCategoryFilter === 'white_meat'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🍗 Bianca
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerCategoryFilter('legumes')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        pickerCategoryFilter === 'legumes'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🫘 Legumi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerCategoryFilter('red_meat')}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                        pickerCategoryFilter === 'red_meat'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🥩 Rossa
                    </button>
                  </div>
                </div>

                {/* Recipe List */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pt-1 space-y-2.5 [-webkit-overflow-scrolling:touch]">
                  {(allRecipes || [])
                    .filter(recipe => {
                      if (pickerSearch) {
                        const q = pickerSearch.toLowerCase()
                        const match =
                          recipe.title.toLowerCase().includes(q) ||
                          recipe.tags.some(t => t.toLowerCase().includes(q))
                        if (!match) return false
                      }

                      if (pickerCategoryFilter !== 'all') {
                        const cat = detectFoodCategory({
                          title: recipe.title,
                          tags: recipe.tags,
                          adaptedIngredients: recipe.adaptedIngredients,
                          originalIngredients: recipe.originalIngredients,
                        })
                        if (cat !== pickerCategoryFilter) return false
                      }

                      return true
                    })
                    .map(recipe => {
                      const recCheck = checkRecipeRecommendation(
                        recipe,
                        evaluation.counts,
                        rules
                      )
                      const catInfo = FOOD_CATEGORY_INFO[recCheck.category]

                      return (
                        <div
                          key={recipe.id}
                          className="bg-gray-50 hover:bg-primary-50/70 border border-gray-200/80 hover:border-primary-300 rounded-2xl p-3 flex flex-col gap-2 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {recipe.thumbnailUrl ? (
                                <img
                                  src={recipe.thumbnailUrl}
                                  alt={recipe.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl">{MEAL_ICONS[recipe.targetMeal] ?? '🍽️'}</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                                {recipe.title}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 flex-wrap">
                                <span className={`font-bold px-1.5 py-0.2 rounded border ${catInfo.badgeColor}`}>
                                  {catInfo.icon} {catInfo.label}
                                </span>
                                {recipe.nutritionalValues && (
                                  <span>{recipe.nutritionalValues.calories} kcal</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setMealForSlot(
                                  pickerSlot.dayOffset,
                                  pickerSlot.mealType,
                                  recipe.id,
                                  recipe.variants?.[0]?.id,
                                  recipe.variants?.[0]?.label
                                )
                              }}
                              className="btn-primary py-1.5 px-3 text-xs font-bold shadow-xs active:scale-95 flex-shrink-0"
                            >
                              + Scegli
                            </button>
                          </div>

                          {/* Recommendation or Warning Badge */}
                          {recCheck.badge && (
                            <div
                              className={`text-[10px] font-bold p-1.5 rounded-lg flex items-center justify-between ${
                                recCheck.status === 'recommended'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : recCheck.status === 'discouraged'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span>{recCheck.badge}</span>
                              {recCheck.reason && (
                                <span className="font-normal opacity-90 hidden sm:inline">
                                  {recCheck.reason}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Variants if present */}
                          {recipe.variants && recipe.variants.length > 1 && (
                            <div className="pt-1 border-t border-gray-200/60 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-gray-500 uppercase">
                                Variante:
                              </span>
                              {recipe.variants.map(v => (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setMealForSlot(
                                      pickerSlot.dayOffset,
                                      pickerSlot.mealType,
                                      recipe.id,
                                      v.id,
                                      v.label
                                    )
                                  }}
                                  className="text-[10px] font-bold bg-white hover:bg-primary-100 border border-gray-200 px-2 py-0.5 rounded-lg text-gray-700 hover:text-primary-900 transition-colors"
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t border-gray-100 bg-white p-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <span>🍕</span>
                    <span>Imposta pasto libero invece</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerSlot(null)}
                    className="btn-secondary py-1.5 px-3 text-xs font-bold"
                  >
                    Chiudi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
