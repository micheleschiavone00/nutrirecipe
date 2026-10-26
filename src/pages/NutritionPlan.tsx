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

  useEffect(() => {
    if (activeProfile) {
      setProfileName(activeProfile.name || '')
      setDailyCalories(activeProfile.dailyCalories ?? '')
      setDailyProteins(activeProfile.dailyProteins ?? '')
      setDailyCarbs(activeProfile.dailyCarbs ?? '')
      setDailyFats(activeProfile.dailyFats ?? '')
      setNutritionistNotes(activeProfile.nutritionistNotes || '')

      // Guarantee all standard meals are represented
      const existingMeals = [...(activeProfile.meals || [])]
      const completeMeals = MEAL_ORDER.map(mType => {
        const found = existingMeals.find(m => m.mealType === mType)
        return (
          found || {
            mealType: mType,
            label: MEAL_LABELS_MAP[mType],
            groups: [],
          }
        )
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

  const addGroupToMeal = (mealType: MealType) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
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

  const removeGroupFromMeal = (mealType: MealType, groupId: string) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
        return {
          ...m,
          groups: m.groups.filter(g => g.id !== groupId),
        }
      })
    )
  }

  const updateGroup = (mealType: MealType, groupId: string, patch: Partial<FoodGroup>) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
        return {
          ...m,
          groups: m.groups.map(g => (g.id === groupId ? { ...g, ...patch } : g)),
        }
      })
    )
  }

  const addOptionToGroup = (mealType: MealType, groupId: string) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
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

  const removeOptionFromGroup = (mealType: MealType, groupId: string, optionIdx: number) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
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
    mealType: MealType,
    groupId: string,
    optionIdx: number,
    patch: Partial<FoodOption>
  ) => {
    setMeals(prev =>
      prev.map(m => {
        if (m.mealType !== mealType) return m
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
          {filteredMeals.map(meal => (
            <div key={meal.mealType} className="card p-4 space-y-3 border border-gray-200/80">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">{MEAL_LABELS_MAP[meal.mealType]}</h3>
                  <span className="text-xs text-gray-400">
                    ({meal.groups?.length || 0} gruppi)
                  </span>
                </div>
                <button
                  onClick={() => addGroupToMeal(meal.mealType)}
                  className="text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg border border-primary-200 transition-colors"
                >
                  + Aggiungi Gruppo
                </button>
              </div>

              {/* Groups inside this meal */}
              {(!meal.groups || meal.groups.length === 0) ? (
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
                                updateGroup(meal.mealType, group.id, {
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
                                updateGroup(meal.mealType, group.id, { name: e.target.value })
                              }
                              placeholder="Nome gruppo (es. Fonti Proteiche)"
                              className="input-field text-xs font-semibold py-1 px-2 flex-1 bg-white"
                            />
                          </div>

                          <button
                            onClick={() => removeGroupFromMeal(meal.mealType, group.id)}
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
                              updateGroup(meal.mealType, group.id, {
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
                              updateGroup(meal.mealType, group.id, {
                                maxQuantity: e.target.value === '' ? undefined : Number(e.target.value),
                              })
                            }
                            className="w-16 input-field text-xs py-1 px-2 text-center"
                          />
                          <select
                            value={group.unit}
                            onChange={e =>
                              updateGroup(meal.mealType, group.id, { unit: e.target.value as any })
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
                              onClick={() => addOptionToGroup(meal.mealType, group.id)}
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
                                  updateOptionInGroup(meal.mealType, group.id, optIdx, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="Nome alimento (es. Petto di pollo)"
                                className="flex-1 input-field text-xs py-1 px-2"
                              />

                              <input
                                type="number"
                                value={opt.quantity}
                                onChange={e =>
                                  updateOptionInGroup(meal.mealType, group.id, optIdx, {
                                    quantity: Number(e.target.value),
                                  })
                                }
                                placeholder="Dose"
                                className="w-16 input-field text-xs py-1 px-2 text-center font-bold text-primary-700"
                              />

                              <span className="text-gray-500 text-xs w-6">{opt.unit || group.unit}</span>

                              <button
                                onClick={() =>
                                  removeOptionFromGroup(meal.mealType, group.id, optIdx)
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
            </div>
          ))}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <h3 className="font-bold text-gray-900 text-base">Aggiorna con AI</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Hai una nuova scheda della nutrizionista? Carica il PDF o incolla il testo: l'AI
              estrarrà automaticamente pasti e dosi per aggiornare il tuo piano.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setAiMethod('text')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  aiMethod === 'text' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                📝 Incolla Testo
              </button>
              <button
                onClick={() => setAiMethod('pdf')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                  aiMethod === 'pdf' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                📄 Carica PDF
              </button>
            </div>

            {aiMethod === 'text' ? (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                  placeholder="Incolla qui il testo del tuo piano nutrizionale (es. Colazione: 40g avena, 150g albume...)"
                  className="input-field text-xs font-mono resize-none"
                />
                <button
                  onClick={() => handleAiAnalyzeText(aiText)}
                  disabled={aiLoading}
                  className="btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {aiLoading ? 'Analizzo con GPT-4o…' : 'Analizza ed estrai pasti ✨'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors">
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
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-primary-700 font-semibold">
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
        </div>
      )}
    </div>
  )
}
