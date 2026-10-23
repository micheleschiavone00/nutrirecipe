import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, saveSettings } from '@/lib/db'
import { analyzePDFText } from '@/lib/ai'
import { extractPDFText } from '@/lib/social'
import { generateId } from '@/lib/utils'
import { StepIndicator, LoadingSpinner } from '@/components/ui'
import type { NutritionProfile, MealPlan, MealType, FoodGroup, FoodOption } from '@/types'

const STEPS = ['Profilo', 'Piano', 'Completato']

const MEAL_ORDER: MealType[] = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner']
const MEAL_LABELS_LOCAL: Record<MealType, string> = {
  breakfast: '🌅 Colazione',
  snack_am: '🍎 Spuntino mattutino',
  lunch: '☀️ Pranzo',
  snack_pm: '🍪 Merenda',
  dinner: '🌙 Cena',
}

const CATEGORY_OPTIONS = [
  { value: 'carbs', label: '🌾 Carboidrati' },
  { value: 'proteins', label: '🥩 Proteine' },
  { value: 'vegetables', label: '🥦 Verdure' },
  { value: 'fruits', label: '🍎 Frutta' },
  { value: 'dairy', label: '🥛 Latticini' },
  { value: 'fats', label: '🥑 Grassi' },
  { value: 'other', label: '🍴 Altro' },
] as const

export default function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [method, setMethod] = useState<'pdf' | 'text' | 'manual' | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [meals, setMeals] = useState<MealPlan[]>(
    MEAL_ORDER.map(mealType => ({
      mealType,
      label: MEAL_LABELS_LOCAL[mealType],
      groups: [],
    }))
  )

  // ── Analyze text with AI ───────────────────────────────────────────────────
  const handleAnalyzeText = async (text: string) => {
    if (!text || text.trim().length < 15) {
      setError('Inserisci o incolla il testo del tuo piano nutrizionale')
      return
    }
    setLoading(true)
    setError('')
    try {
      setLoadingMsg("L'AI sta analizzando alimenti e grammature…")
      const extractedMeals = await analyzePDFText(text)
      setMeals(prev => {
        const updated = [...prev]
        extractedMeals.forEach((m: MealPlan) => {
          const idx = updated.findIndex(p => p.mealType === m.mealType)
          if (idx !== -1) updated[idx] = m
          else updated.push(m)
        })
        return updated
      })
      setMethod('manual')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore nell'analisi del testo")
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  // ── PDF upload ──────────────────────────────────────────────────────────────
  const handlePDF = useCallback(async (file: File) => {
    setLoading(true)
    setError('')
    try {
      setLoadingMsg('Estraendo testo dal PDF…')
      const text = await extractPDFText(file)
      if (!text || text.trim().length < 20) {
        throw new Error(
          'Il PDF caricato non contiene testo selezionabile (probabilmente è una foto o scansione). Usa "Incolla testo" per incollare il piano direttamente.'
        )
      }
      setLoadingMsg("L'AI sta analizzando il piano nutrizionale…")
      const extractedMeals = await analyzePDFText(text)
      setMeals(prev => {
        const updated = [...prev]
        extractedMeals.forEach((m: MealPlan) => {
          const idx = updated.findIndex(p => p.mealType === m.mealType)
          if (idx !== -1) updated[idx] = m
          else updated.push(m)
        })
        return updated
      })
      setMethod('manual')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore nell'analisi del PDF")
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }, [])

  // ── Add / remove groups ─────────────────────────────────────────────────────
  const addGroup = (mealIndex: number) => {
    setMeals(prev => {
      const updated = [...prev]
      const newGroup: FoodGroup = {
        id: generateId(),
        name: '',
        category: 'other',
        options: [{ name: '', quantity: 100, unit: 'g' }],
        unit: 'g',
      }
      updated[mealIndex] = {
        ...updated[mealIndex],
        groups: [...updated[mealIndex].groups, newGroup],
      }
      return updated
    })
  }

  const removeGroup = (mealIndex: number, groupIndex: number) => {
    setMeals(prev => {
      const updated = [...prev]
      updated[mealIndex] = {
        ...updated[mealIndex],
        groups: updated[mealIndex].groups.filter((_, i) => i !== groupIndex),
      }
      return updated
    })
  }

  const updateGroup = (mealIndex: number, groupIndex: number, patch: Partial<FoodGroup>) => {
    setMeals(prev => {
      const updated = [...prev]
      updated[mealIndex] = {
        ...updated[mealIndex],
        groups: updated[mealIndex].groups.map((g, i) =>
          i === groupIndex ? { ...g, ...patch } : g
        ),
      }
      return updated
    })
  }

  const addOption = (mealIndex: number, groupIndex: number) => {
    const newOption: FoodOption = { name: '', quantity: 100, unit: 'g' }
    setMeals(prev => {
      const updated = [...prev]
      const group = updated[mealIndex].groups[groupIndex]
      updated[mealIndex].groups[groupIndex] = {
        ...group,
        options: [...group.options, newOption],
      }
      return updated
    })
  }

  const updateOption = (mealIndex: number, groupIndex: number, optionIndex: number, patch: Partial<FoodOption>) => {
    setMeals(prev => {
      const updated = [...prev]
      const group = { ...updated[mealIndex].groups[groupIndex] }
      group.options = group.options.map((o, i) => (i === optionIndex ? { ...o, ...patch } : o))
      updated[mealIndex].groups[groupIndex] = group
      return updated
    })
  }

  // ── Save profile ────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!name.trim()) {
      setError('Inserisci il tuo nome')
      return
    }
    setLoading(true)
    setError('')
    try {
      const profile: NutritionProfile = {
        id: generateId(),
        name: name.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        meals: meals.filter(m => m.groups.length > 0),
      }
      await db.profiles.add(profile)
      await saveSettings({ activeProfileId: profile.id })
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore nel salvataggio')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="safe-top px-6 pt-4 pb-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🥗</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NutriRecipe</h1>
              <p className="text-sm text-gray-500">Setup iniziale</p>
            </div>
          </div>
          <StepIndicator steps={STEPS} current={step} />
        </div>

        {/* Step 0 — Nome */}
        {step === 0 && (
          <div className="px-6 pt-4 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ciao! Come ti chiami?</h2>
            <p className="text-gray-500 text-sm mb-6">Personalizziamo l'app per te.</p>
            <input
              type="text"
              placeholder="Il tuo nome"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field mb-4"
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)}
              autoFocus
            />
            <button
              onClick={() => (name.trim() ? setStep(1) : setError('Inserisci il tuo nome'))}
              className="btn-primary w-full"
            >
              Continua →
            </button>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </div>
        )}

        {/* Step 1 — Piano nutrizionale */}
        {step === 1 && (
          <div className="px-6 pt-4 animate-slide-up">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Il tuo piano nutrizionale</h2>
            <p className="text-gray-500 text-sm mb-4">
              Carica il PDF della tua nutrizionista, incolla il testo o compila a mano.
            </p>

            {!method && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {/* PDF upload */}
                <label className="card p-4 flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-all hover:border-primary-300">
                  <span className="text-3xl">📄</span>
                  <span className="font-semibold text-gray-900 text-sm text-center">Carica PDF</span>
                  <span className="text-xs text-gray-400 text-center">Analizza file PDF</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handlePDF(f)
                    }}
                  />
                </label>

                {/* Paste Text */}
                <button
                  onClick={() => setMethod('text')}
                  className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:border-primary-300"
                >
                  <span className="text-3xl">📋</span>
                  <span className="font-semibold text-gray-900 text-sm text-center">Incolla testo</span>
                  <span className="text-xs text-gray-400 text-center">Da WhatsApp o email</span>
                </button>

                {/* Manual */}
                <button
                  onClick={() => setMethod('manual')}
                  className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-all hover:border-primary-300"
                >
                  <span className="text-3xl">✏️</span>
                  <span className="font-semibold text-gray-900 text-sm text-center">Compila a mano</span>
                  <span className="text-xs text-gray-400 text-center">Inserisci grammature</span>
                </button>
              </div>
            )}

            {/* Paste text section */}
            {method === 'text' && !loading && (
              <div className="card p-4 space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-gray-900">Incolla il tuo piano nutrizionale</h3>
                <p className="text-xs text-gray-500">
                  Copia e incolla qui sotto il testo del piano (anche da email o messaggi WhatsApp):
                </p>
                <textarea
                  rows={7}
                  placeholder="Es.&#10;Colazione: 150g yogurt greco con 30g avena e 1 frutto&#10;Pranzo: 80g riso o 200g patate, 150g pollo o 200g salmone, verdure a piacere&#10;Cena: 200g pesce spada o 120g bresaola, 200g insalata, 50g pane"
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  className="input-field text-sm font-mono"
                />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setMethod(null)} className="btn-secondary flex-1">
                    ← Indietro
                  </button>
                  <button
                    onClick={() => handleAnalyzeText(pastedText)}
                    disabled={!pastedText.trim()}
                    className="btn-primary flex-1"
                  >
                    🤖 Analizza con AI
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center py-8 gap-4">
                <LoadingSpinner size="lg" label={loadingMsg} />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Meal editor */}
            {method === 'manual' && !loading && (
              <div className="space-y-4 mb-6">
                {meals.map((meal, mealIdx) => (
                  <div key={meal.mealType} className="card overflow-hidden">
                    <div className="bg-primary-50 px-4 py-3 border-b border-primary-100 flex items-center justify-between">
                      <h3 className="font-semibold text-primary-800">{meal.label}</h3>
                      {meal.groups.length > 0 && (
                        <span className="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full font-medium">
                          {meal.groups.length} {meal.groups.length === 1 ? 'gruppo' : 'gruppi'}
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-4">
                      {meal.groups.map((group, groupIdx) => (
                        <div key={group.id} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Nome gruppo (es. Carboidrati o Proteine)"
                              value={group.name}
                              onChange={e => updateGroup(mealIdx, groupIdx, { name: e.target.value })}
                              className="input-field flex-1 text-sm py-2"
                            />
                            <button
                              onClick={() => removeGroup(mealIdx, groupIdx)}
                              className="w-8 h-8 flex items-center justify-center text-red-400 rounded-lg hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                          <select
                            value={group.category}
                            onChange={e =>
                              updateGroup(mealIdx, groupIdx, { category: e.target.value as FoodGroup['category'] })
                            }
                            className="input-field text-sm py-2"
                          >
                            {CATEGORY_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          {/* Options */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Alternative e grammature
                            </p>
                            {group.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="es. Yogurt greco"
                                  value={opt.name}
                                  onChange={e => updateOption(mealIdx, groupIdx, optIdx, { name: e.target.value })}
                                  className="input-field flex-1 text-sm py-2"
                                />
                                <input
                                  type="number"
                                  placeholder="g"
                                  value={opt.quantity}
                                  onChange={e =>
                                    updateOption(mealIdx, groupIdx, optIdx, {
                                      quantity: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="input-field w-20 text-sm py-2 text-center"
                                />
                                <span className="text-xs text-gray-400 w-4">{opt.unit || 'g'}</span>
                              </div>
                            ))}
                            <button
                              onClick={() => addOption(mealIdx, groupIdx)}
                              className="text-xs text-primary-600 font-medium flex items-center gap-1"
                            >
                              + Aggiungi alternativa
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => addGroup(mealIdx)}
                        className="w-full py-2 border-2 border-dashed border-primary-200 rounded-xl text-primary-600 text-sm font-medium hover:border-primary-400 transition-colors"
                      >
                        + Aggiungi gruppo alimentare
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {method === 'manual' && !loading && (
              <div className="flex gap-3 pb-8">
                <button onClick={() => setMethod(null)} className="btn-secondary flex-1">
                  ← Cambia metodo
                </button>
                <button onClick={saveProfile} className="btn-primary flex-1">
                  Salva profilo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Done */}
        {step === 2 && (
          <div className="px-6 pt-8 flex flex-col items-center text-center animate-slide-up">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tutto pronto, {name}!</h2>
            <p className="text-gray-500 mb-8">
              Il tuo piano nutrizionale è stato salvato. Inizia importando la prima ricetta dai social!
            </p>
            <button onClick={() => navigate('/import')} className="btn-primary w-full mb-3">
              Importa la prima ricetta 🎥
            </button>
            <button onClick={() => navigate('/recipes')} className="btn-secondary w-full">
              Vai al ricettario 📖
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
