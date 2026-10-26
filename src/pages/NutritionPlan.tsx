import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveProfile, getSettings } from '@/lib/db'
import { PageHeader, LoadingSpinner, EmptyState, Badge } from '@/components/ui'
import { analyzePDFText } from '@/lib/ai'
import { extractPDFText } from '@/lib/social'
import { generateId, formatDate } from '@/lib/utils'
import type { NutritionProfile, MealPlan, MealType, FoodGroup, FoodOption } from '@/types'

const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']

const MEAL_LABELS_MAP: Record<MealType, string> = {
  breakfast: '🌅 Colazione',
  snack_am: '🍎 Spuntino mattina',
  lunch: '☀️ Pranzo',
  snack_pm: '🍪 Merenda',
  dinner: '🌙 Cena',
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  carbs: { label: '🌾 Carboidrati', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  proteins: { label: '🥩 Proteine', color: 'bg-red-100 text-red-800 border-red-200' },
  vegetables: { label: '🥦 Verdure', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  fruits: { label: '🍎 Frutta', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  dairy: { label: '🥛 Latticini', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  fats: { label: '🥑 Grassi', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  other: { label: '🍴 Altro', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

interface QuantityStepperProps {
  quantity: number | undefined
  unit?: string
  onChange: (qty: number) => void
}

function QuantityStepper({ quantity, unit = 'g', onChange }: QuantityStepperProps) {
  const [val, setVal] = useState<string>(() =>
    quantity === undefined || quantity === 0 ? '' : String(quantity)
  )

  useEffect(() => {
    const qStr = quantity === undefined || quantity === 0 ? '' : String(quantity)
    setVal(prev => {
      if (prev === '' && (quantity === 0 || quantity === undefined)) return prev
      if (Number(prev) === quantity) return prev
      return qStr
    })
  }, [quantity])

  const step = unit === 'pieces' || unit === 'portions' ? 1 : 5

  const handlePlus = () => {
    const current = Number(val) || 0
    const next = current + step
    setVal(String(next))
    onChange(next)
  }

  const handleMinus = () => {
    const current = Number(val) || 0
    const next = Math.max(0, current - step)
    setVal(next === 0 ? '' : String(next))
    onChange(next)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    if (text === '') {
      setVal('')
      onChange(0)
      return
    }
    const num = parseFloat(text)
    if (!isNaN(num) && num >= 0) {
      setVal(text)
      onChange(num)
    }
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {/* Plus button on the LEFT (un più a sinistra) */}
      <button
        type="button"
        onClick={handlePlus}
        className="w-6 h-6 rounded-lg bg-primary-100 hover:bg-primary-200 active:scale-95 text-primary-800 font-extrabold text-xs flex items-center justify-center transition-all select-none border border-primary-200/60"
        title={`Aumenta (+${step}${unit})`}
      >
        +
      </button>

      {/* Input in the center */}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={val}
        onChange={handleChange}
        placeholder="0"
        className="w-12 text-center input-field text-xs py-1 px-0.5 font-extrabold text-primary-950 bg-white border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />

      {/* Minus button on the RIGHT (un meno a destra) */}
      <button
        type="button"
        onClick={handleMinus}
        className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-extrabold text-xs flex items-center justify-center transition-all select-none border border-gray-200"
        title={`Diminuisci (-${step}${unit})`}
      >
        –
      </button>

      {/* Unit */}
      <span className="text-gray-500 font-semibold text-xs min-w-[1.2rem] text-left">{unit}</span>
    </div>
  )
}

export default function NutritionPlanPage() {
  const navigate = useNavigate()
  const activeProfile = useLiveQuery(() => getActiveProfile(), [])

  const [activeTab, setActiveTab] = useState<MealType | 'all'>('all')
  const [profileName, setProfileName] = useState('')
  const [dailyCalories, setDailyCalories] = useState<number | ''>('')
  const [dailyProteins, setDailyProteins] = useState<number | ''>('')
  const [dailyCarbs, setDailyCarbs] = useState<number | ''>('')
  const [dailyFats, setDailyFats] = useState<number | ''>('')
  const [nutritionistNotes, setNutritionistNotes] = useState('')
  const [meals, setMeals] = useState<MealPlan[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')

  // Modal for re-uploading PDF or text
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiMethod, setAiMethod] = useState<'pdf' | 'text'>('text')
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Prevent background scroll while AI modal is open
  useEffect(() => {
    if (!showAiModal) return
    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [showAiModal])

  useEffect(() => {
    if (activeProfile) {
      setProfileName(activeProfile.name || '')
      setDailyCalories(activeProfile.dailyCalories ?? '')
      setDailyProteins(activeProfile.dailyProteins ?? '')
      setDailyCarbs(activeProfile.dailyCarbs ?? '')
      setDailyFats(activeProfile.dailyFats ?? '')
      setNutritionistNotes(activeProfile.nutritionistNotes || '')

      // Guarantee all standard meals are represented and preserve all variants (e.g. Cena Post Workout)
      const existingMeals = [...(activeProfile.meals || [])].map((m, i) => ({
        ...m,
        id: m.id || `meal-${m.mealType}-${i}-${Date.now()}`,
      }))

      const completeMeals: MealPlan[] = []
      MEAL_ORDER.forEach(mType => {
        const base =
          existingMeals.find(m => m.mealType === mType && !m.isVariant) ||
          existingMeals.find(m => m.mealType === mType)
        if (base) {
          completeMeals.push({
            ...base,
            isVariant: false,
          })
        } else {
          completeMeals.push({
            id: generateId(),
            mealType: mType,
            label: MEAL_LABELS_MAP[mType],
            isVariant: false,
            groups: [],
          })
        }
      })

      // Add all variant meals (e.g. Cena Post Workout, Pranzo Riposo)
      existingMeals.forEach(m => {
        if (m.isVariant || !completeMeals.some(cm => cm.id === m.id)) {
          if (!completeMeals.some(cm => cm.id === m.id)) {
            completeMeals.push({
              ...m,
              isVariant: true,
            })
          }
        }
      })

      setMeals(completeMeals)
    }
  }, [activeProfile])

  if (activeProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (activeProfile === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon="📋"
          title="Nessun piano nutrizionale trovato"
          description="Non hai ancora configurato un piano nutrizionale personale."
          action={
            <button onClick={() => navigate('/setup')} className="btn-primary">
              Crea piano nutrizionale
            </button>
          }
        />
      </div>
    )
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!profileName.trim()) {
      setSaveToast('⚠️ Inserisci un nome per il piano')
      return
    }

    setIsSaving(true)
    try {
      const updated: NutritionProfile = {
        ...activeProfile,
        name: profileName.trim(),
        dailyCalories: dailyCalories !== '' ? Number(dailyCalories) : undefined,
        dailyProteins: dailyProteins !== '' ? Number(dailyProteins) : undefined,
        dailyCarbs: dailyCarbs !== '' ? Number(dailyCarbs) : undefined,
        dailyFats: dailyFats !== '' ? Number(dailyFats) : undefined,
        nutritionistNotes: nutritionistNotes.trim() || undefined,
        meals: meals.filter(m => m.groups && m.groups.length > 0),
        updatedAt: new Date(),
      }

      await db.profiles.put(updated)
      setSaveToast('✅ Piano nutrizionale salvato con successo!')
      setTimeout(() => setSaveToast(''), 3500)
    } catch (e: unknown) {
      setSaveToast('❌ Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Modifying Groups & Options ─────────────────────────────────────────────

  const addMealVariant = (baseMealType: MealType, defaultLabel?: string) => {
    const baseMeal =
      meals.find(m => m.mealType === baseMealType && !m.isVariant) ||
      meals.find(m => m.mealType === baseMealType)
    const label =
      defaultLabel ||
      (baseMealType === 'dinner' ? 'Cena Post Workout' : 'Pranzo Alternativo')

    const clonedGroups: FoodGroup[] = (baseMeal?.groups || []).map(g => ({
      ...g,
      id: generateId(),
      options: (g.options || []).map(o => ({ ...o })),
    }))

    const newVariant: MealPlan = {
      id: generateId(),
      mealType: baseMealType,
      label,
      isVariant: true,
      variantName: label,
      groups: clonedGroups,
      notes:
        baseMealType === 'dinner'
          ? 'Quota proteica e calorica specifica per recupero allenamento'
          : undefined,
    }

    setMeals(prev => [...prev, newVariant])
    setSaveToast(`✨ Aggiunta alternativa "${label}"!`)
    setTimeout(() => setSaveToast(''), 3000)
  }

  const removeMealVariant = (mealId: string, label: string) => {
    if (confirm(`Eliminare l'alternativa "${label}"?`)) {
      setMeals(prev => prev.filter(m => (m.id || '') !== mealId))
    }
  }

  const updateMealLabel = (mealId: string, label: string) => {
    setMeals(prev =>
      prev.map(m => (m.id === mealId ? { ...m, label, variantName: label } : m))
    )
  }

  const addGroupToMeal = (mealId: string) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        const newGroup: FoodGroup = {
          id: generateId(),
          name: 'Nuovo Gruppo',
          category: 'proteins',
          unit: 'g',
          options: [{ name: 'Nuovo alimento', quantity: 100, unit: 'g' }],
        }
        return {
          ...m,
          groups: [...(m.groups || []), newGroup],
        }
      })
    )
  }

  const removeGroupFromMeal = (mealId: string, groupId: string) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        return {
          ...m,
          groups: m.groups.filter(g => g.id !== groupId),
        }
      })
    )
  }

  const updateGroup = (mealId: string, groupId: string, patch: Partial<FoodGroup>) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        return {
          ...m,
          groups: m.groups.map(g => (g.id === groupId ? { ...g, ...patch } : g)),
        }
      })
    )
  }

  const addOptionToGroup = (mealId: string, groupId: string) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        return {
          ...m,
          groups: m.groups.map(g => {
            if (g.id !== groupId) return g
            const newOption: FoodOption = {
              name: '',
              quantity: 100,
              unit: g.unit === 'portions' ? 'pieces' : (g.unit || 'g'),
            }
            return {
              ...g,
              options: [...(g.options || []), newOption],
            }
          }),
        }
      })
    )
  }

  const removeOptionFromGroup = (mealId: string, groupId: string, optionIdx: number) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        return {
          ...m,
          groups: m.groups.map(g => {
            if (g.id !== groupId) return g
            return {
              ...g,
              options: (g.options || []).filter((_, i) => i !== optionIdx),
            }
          }),
        }
      })
    )
  }

  const updateOptionInGroup = (
    mealId: string,
    groupId: string,
    optionIdx: number,
    patch: Partial<FoodOption>
  ) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.id !== mealId) return m
        return {
          ...m,
          groups: m.groups.map(g => {
            if (g.id !== groupId) return g
            const updatedOpts = [...(g.options || [])]
            updatedOpts[optionIdx] = { ...updatedOpts[optionIdx], ...patch }
            return { ...g, options: updatedOpts }
          }),
        }
      })
    )
  }

  // ── AI Re-analyze ─────────────────────────────────────────────────────────

  const handleAiAnalyzeText = async (textToAnalyze: string) => {
    if (!textToAnalyze || textToAnalyze.trim().length < 15) {
      setAiError('Inserisci o incolla il testo del piano nutrizionale')
      return
    }

    setAiLoading(true)
    setAiError('')
    try {
      const extractedMeals = await analyzePDFText(textToAnalyze)
      setMeals(prev => {
        const updated = [...prev]
        extractedMeals.forEach((m: MealPlan) => {
          const idx = updated.findIndex(p => p.mealType === m.mealType)
          if (idx !== -1) updated[idx] = m
          else updated.push(m)
        })
        return updated
      })
      setShowAiModal(false)
      setSaveToast('✨ Nuovi pasti estratti con AI! Ricordati di cliccare Salva.')
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Errore durante l'analisi del testo")
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiPDF = async (file: File) => {
    setAiLoading(true)
    setAiError('')
    try {
      const text = await extractPDFText(file)
      if (!text || text.trim().length < 20) {
        throw new Error('Il PDF non contiene testo selezionabile. Usa "Incolla testo" per incollarlo.')
      }
      await handleAiAnalyzeText(text)
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Errore nella lettura del PDF')
      setAiLoading(false)
    }
  }

  const filteredMeals = activeTab === 'all' ? meals : meals.filter(m => m.mealType === activeTab)

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <PageHeader
        title="Piano Nutrizionale"
        subtitle={`Ultimo agg: ${formatDate(activeProfile.updatedAt || activeProfile.createdAt)}`}
        action={
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95"
          >
            {isSaving ? 'Salvataggio…' : '💾 Salva'}
          </button>
        }
      />

      {/* Floating Save Toast */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white font-medium text-xs px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-slide-down">
          <span>{saveToast}</span>
        </div>
      )}

      <div className="px-4 pt-3 space-y-4 max-w-2xl mx-auto">
        {/* Profile Info & Macros Card */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥗</span>
              <h2 className="font-bold text-gray-900 text-sm">Dettagli del Piano</h2>
            </div>
            <button
              onClick={() => setShowAiModal(true)}
              className="text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <span>📄</span>
              <span>Ricarica con AI</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nome del profilo</label>
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="es. Piano Personalizzato Michele"
              className="input-field text-sm font-medium"
            />
          </div>

          {/* Daily Macros (Optional) */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Obiettivi giornalieri (opzionali)</p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block">Kcal</label>
                <input
                  type="number"
                  placeholder="2000"
                  value={dailyCalories}
                  onChange={e => setDailyCalories(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field text-xs px-2 py-1.5 text-center font-bold text-orange-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block">Proteine (g)</label>
                <input
                  type="number"
                  placeholder="140"
                  value={dailyProteins}
                  onChange={e => setDailyProteins(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field text-xs px-2 py-1.5 text-center font-bold text-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block">Carboidrati (g)</label>
                <input
                  type="number"
                  placeholder="220"
                  value={dailyCarbs}
                  onChange={e => setDailyCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field text-xs px-2 py-1.5 text-center font-bold text-amber-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block">Grassi (g)</label>
                <input
                  type="number"
                  placeholder="60"
                  value={dailyFats}
                  onChange={e => setDailyFats(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input-field text-xs px-2 py-1.5 text-center font-bold text-gray-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Meal Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Tutti i pasti
          </button>
          {MEAL_ORDER.map(mType => (
            <button
              key={mType}
              onClick={() => setActiveTab(mType)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === mType
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {MEAL_LABELS_MAP[mType]}
            </button>
          ))}
        </div>

        {/* Meals List */}
        <div className="space-y-4">
          {filteredMeals.map(meal => {
            const mealId = meal.id || `meal-${meal.mealType}`
            return (
              <div
                key={mealId}
                className={`card p-4 space-y-3 border ${
                  meal.isVariant
                    ? 'border-primary-300 ring-2 ring-primary-400/20 bg-primary-50/15'
                    : 'border-gray-200/80'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {meal.isVariant ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl">💪</span>
                        <input
                          type="text"
                          value={meal.label}
                          onChange={e => updateMealLabel(mealId, e.target.value)}
                          placeholder="es. Cena Post Workout"
                          className="input-field py-1 px-2.5 text-xs sm:text-sm font-extrabold text-primary-950 bg-white border-primary-300 max-w-xs"
                        />
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-800 px-2 py-0.5 rounded-md flex-shrink-0">
                          Alternativa {meal.mealType === 'dinner' ? 'Cena' : 'Pranzo'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-gray-900 text-base">
                          {MEAL_LABELS_MAP[meal.mealType]}
                        </h3>
                        <span className="text-xs text-gray-400">
                          ({meal.groups?.length || 0} gruppi)
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => addGroupToMeal(mealId)}
                      className="text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors"
                    >
                      + Aggiungi Gruppo
                    </button>
                    {meal.isVariant && (
                      <button
                        onClick={() => removeMealVariant(mealId, meal.label)}
                        className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg border border-red-200 transition-colors"
                        title="Elimina alternativa"
                      >
                        🗑 Elimina
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtitle / notes for variant */}
                {meal.isVariant && (
                  <div className="text-[11px] text-primary-800 bg-primary-50/80 p-2.5 rounded-xl border border-primary-200/60 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>
                      Questa alternativa verrà mostrata automaticamente nelle ricette per{' '}
                      <strong>
                        {meal.mealType === 'dinner'
                          ? 'Cena e "Pranzo e Cena"'
                          : 'Pranzo e "Pranzo e Cena"'}
                      </strong>
                      , permettendoti di scegliere e consultare le dosi specifiche.
                    </span>
                  </div>
                )}

                {/* Groups inside this meal */}
                {!meal.groups || meal.groups.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Nessun gruppo alimentare impostato per questo pasto.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meal.groups.map(group => {
                      const catInfo = CATEGORY_MAP[group.category] || CATEGORY_MAP.other
                      return (
                        <div
                          key={group.id}
                          className="bg-gray-50/70 border border-gray-200/90 rounded-2xl p-3.5 space-y-2.5"
                        >
                          {/* Group Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={group.category}
                                onChange={e =>
                                  updateGroup(mealId, group.id, {
                                    category: e.target.value as any,
                                  })
                                }
                                className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer outline-none ${catInfo.color}`}
                              >
                                <option value="carbs">🌾 Carboidrati</option>
                                <option value="proteins">🥩 Proteine</option>
                                <option value="vegetables">🥦 Verdure</option>
                                <option value="fruits">🍎 Frutta</option>
                                <option value="dairy">🥛 Latticini</option>
                                <option value="fats">🥑 Grassi</option>
                                <option value="other">🍴 Altro</option>
                              </select>

                              <input
                                type="text"
                                value={group.name}
                                onChange={e =>
                                  updateGroup(mealId, group.id, { name: e.target.value })
                                }
                                placeholder="Nome gruppo (es. Fonti Proteiche)"
                                className="input-field text-xs font-semibold py-1 px-2 flex-1 bg-white"
                              />
                            </div>

                            <button
                              onClick={() => removeGroupFromMeal(mealId, group.id)}
                              className="text-gray-400 hover:text-red-500 text-xs p-1"
                              title="Elimina gruppo"
                            >
                              🗑
                            </button>
                          </div>

                          {/* Quantity Range */}
                          <div className="flex items-center gap-2 text-xs text-gray-600 bg-white p-2 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-medium text-gray-500">Range quantità:</span>
                            <input
                              type="number"
                              placeholder="Min"
                              value={group.minQuantity ?? ''}
                              onChange={e =>
                                updateGroup(mealId, group.id, {
                                  minQuantity: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              className="w-16 input-field text-xs py-1 px-2 text-center"
                            />
                            <span>–</span>
                            <input
                              type="number"
                              placeholder="Max"
                              value={group.maxQuantity ?? ''}
                              onChange={e =>
                                updateGroup(mealId, group.id, {
                                  maxQuantity: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              className="w-16 input-field text-xs py-1 px-2 text-center"
                            />
                            <select
                              value={group.unit}
                              onChange={e =>
                                updateGroup(mealId, group.id, { unit: e.target.value as any })
                              }
                              className="input-field text-xs py-1 px-2 font-medium"
                            >
                              <option value="g">g</option>
                              <option value="ml">ml</option>
                              <option value="pieces">pezzi</option>
                              <option value="portions">porzioni</option>
                            </select>
                          </div>

                          {/* Food Options */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                Alimenti &amp; Alternative
                              </span>
                              <button
                                onClick={() => addOptionToGroup(mealId, group.id)}
                                className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
                              >
                                + Aggiungi alimento
                              </button>
                            </div>

                            {(group.options || []).map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-100 text-xs"
                              >
                                <input
                                  type="text"
                                  value={opt.name}
                                  onChange={e =>
                                    updateOptionInGroup(mealId, group.id, optIdx, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Nome alimento (es. Petto di pollo)"
                                  className="flex-1 input-field text-xs py-1 px-2 min-w-0"
                                />

                                <QuantityStepper
                                  quantity={opt.quantity}
                                  unit={opt.unit || group.unit}
                                  onChange={qty =>
                                    updateOptionInGroup(mealId, group.id, optIdx, {
                                      quantity: qty,
                                    })
                                  }
                                />

                                <button
                                  onClick={() =>
                                    removeOptionFromGroup(mealId, group.id, optIdx)
                                  }
                                  className="text-gray-300 hover:text-red-400 text-xs px-1"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add Alternative Button on standard meals */}
                {!meal.isVariant && (meal.mealType === 'dinner' || meal.mealType === 'lunch') && (
                  <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500">
                      Hai un&apos;altra variante (es.{' '}
                      {meal.mealType === 'dinner'
                        ? 'Cena Post Workout più proteica'
                        : 'Pranzo nei giorni di riposo'}
                      )?
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        addMealVariant(
                          meal.mealType,
                          meal.mealType === 'dinner'
                            ? 'Cena Post Workout'
                            : 'Pranzo Alternativo'
                        )
                      }
                      className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto"
                    >
                      <span>➕</span>
                      <span>
                        Aggiungi alternativa a {meal.mealType === 'dinner' ? 'Cena' : 'Pranzo'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom Save Button */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg flex items-center justify-center gap-2"
          >
            <span>💾</span>
            <span>{isSaving ? 'Salvataggio in corso…' : 'Salva modifiche al piano'}</span>
          </button>
        </div>
      </div>

      {/* AI Re-Analyze Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in touch-none"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[82dvh] sm:max-h-[85dvh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                    Aggiorna con AI
                  </h3>
                  <p className="text-xs text-gray-400">Estrai alimenti e dosi da nuova scheda</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Method switcher */}
            <div className="px-4 sm:px-5 pt-3 pb-2 flex-shrink-0 bg-white">
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAiMethod('text')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiMethod === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📝 Incolla Testo
                </button>
                <button
                  type="button"
                  onClick={() => setAiMethod('pdf')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    aiMethod === 'pdf' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📄 Carica PDF
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 [-webkit-overflow-scrolling:touch]">
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-200/80">
                Hai una nuova scheda della nutrizionista? Carica il PDF o incolla il testo: l&apos;AI
                estrarrà automaticamente tutti i pasti e dosi per aggiornare il tuo piano nutrizionale.
              </p>

              {aiMethod === 'text' ? (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    placeholder="Incolla qui il testo del tuo piano nutrizionale (es. Colazione: 40g avena, 150g albume...)"
                    className="input-field text-xs font-mono resize-none w-full"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50/50">
                    <span className="text-4xl mb-2">📑</span>
                    <span className="text-xs font-semibold text-gray-700">Seleziona file PDF</span>
                    <span className="text-[10px] text-gray-400 mt-1">PDF del piano nutrizionale</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleAiPDF(file)
                      }}
                    />
                  </label>
                  {aiLoading && (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs text-primary-700 font-semibold bg-primary-50 rounded-xl border border-primary-200">
                      <LoadingSpinner size="sm" />
                      <span>Estrazione ed analisi PDF in corso…</span>
                    </div>
                  )}
                </div>
              )}

              {aiError && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-3 text-xs">
                  {aiError}
                </div>
              )}
            </div>

            {/* Pinned Action Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 bg-white p-3.5 pb-[max(0.9rem,env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold"
              >
                Annulla
              </button>
              {aiMethod === 'text' && (
                <button
                  type="button"
                  onClick={() => handleAiAnalyzeText(aiText)}
                  disabled={aiLoading || !aiText.trim()}
                  className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  {aiLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Analizzo…</span>
                    </>
                  ) : (
                    <span>Analizza ed Estrai ✨</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
