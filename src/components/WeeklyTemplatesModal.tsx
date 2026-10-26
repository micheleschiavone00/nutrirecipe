import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { generateId } from '@/lib/utils'
import type { WeeklyTemplate, PlannedMeal, Recipe, WeeklyTemplateMeal } from '@/types'

interface WeeklyTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  currentWeekDays: string[]
  currentWeekMeals: PlannedMeal[]
  recipesMap: Record<string, Recipe>
  onApplied: () => void
}

export default function WeeklyTemplatesModal({
  isOpen,
  onClose,
  currentWeekDays,
  currentWeekMeals,
  onApplied,
}: WeeklyTemplatesModalProps) {
  const [tab, setTab] = useState<'saved' | 'save_current'>('saved')
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<WeeklyTemplate | null>(null)
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace')

  const templates = useLiveQuery(() => db.weeklyTemplates.orderBy('createdAt').reverse().toArray(), [])

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

  // Save current week as template
  const handleSaveCurrent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim()) return

    setSaving(true)
    try {
      const templateMeals: WeeklyTemplateMeal[] = currentWeekMeals
        .map(meal => {
          const dayOffset = currentWeekDays.indexOf(meal.date)
          if (dayOffset < 0) return null
          return {
            dayOffset,
            mealType: meal.mealType,
            recipeId: meal.recipeId,
            customLabel: meal.customLabel,
          }
        })
        .filter(Boolean) as WeeklyTemplateMeal[]

      const newTemplate: WeeklyTemplate = {
        id: generateId(),
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        meals: templateMeals,
        createdAt: new Date(),
      }

      await db.weeklyTemplates.add(newTemplate)
      setTemplateName('')
      setTemplateDesc('')
      setTab('saved')
    } catch (err) {
      console.error('Error saving weekly template:', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete a saved template
  const handleDeleteTemplate = async (templateId: string, name: string) => {
    if (confirm(`Sei sicuro di voler eliminare il modello "${name}"?`)) {
      await db.weeklyTemplates.delete(templateId)
      if (selectedTemplateForApply?.id === templateId) {
        setSelectedTemplateForApply(null)
      }
    }
  }

  // Apply template to current week
  const handleApply = async (template: WeeklyTemplate) => {
    setSaving(true)
    try {
      // If replace mode, delete all planned meals in current week
      if (applyMode === 'replace') {
        const mealIdsToDelete = currentWeekMeals.map(m => m.id)
        if (mealIdsToDelete.length > 0) {
          await db.plannedMeals.bulkDelete(mealIdsToDelete)
        }
      }

      // Add meals from template mapped to currentWeekDays
      const newPlannedMeals: PlannedMeal[] = template.meals.map(tm => {
        const targetDate = currentWeekDays[tm.dayOffset] ?? currentWeekDays[0]
        return {
          id: generateId(),
          date: targetDate,
          mealType: tm.mealType,
          recipeId: tm.recipeId,
          customLabel: tm.customLabel,
          isCompleted: false,
        }
      })

      if (newPlannedMeals.length > 0) {
        await db.plannedMeals.bulkAdd(newPlannedMeals)
      }

      setSelectedTemplateForApply(null)
      onApplied()
      onClose()
    } catch (err) {
      console.error('Error applying template:', err)
    } finally {
      setSaving(false)
    }
  }

  const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

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
        <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📋</span>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base leading-tight">
                Piani Settimane Standard
              </h3>
              <p className="text-xs text-gray-400">Salva e riutilizza schemi settimanali fissi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch fixed */}
        <div className="px-4 sm:px-5 pt-3 pb-2 flex-shrink-0 bg-white">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab('saved')
                setSelectedTemplateForApply(null)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'saved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📂 Modelli Salvati ({templates?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('save_current')
                setSelectedTemplateForApply(null)
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'save_current' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💾 Salva Questa Settimana
            </button>
          </div>
        </div>

        {/* Tab 1: Saved Templates */}
        {tab === 'saved' && (
          selectedTemplateForApply ? (
            /* Confirmation / Apply Options */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
                <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">✨</span>
                    <h4 className="font-bold text-primary-900 text-sm">
                      Applica &ldquo;{selectedTemplateForApply.name}&rdquo;
                    </h4>
                  </div>
                  <p className="text-xs text-primary-700">
                    Questo modello contiene {selectedTemplateForApply.meals.length} pasti distribuiti su 7 giorni.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                    Modalità di applicazione
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setApplyMode('replace')}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        applyMode === 'replace'
                          ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">
                          🔄 Sostituisci la settimana corrente
                        </span>
                        {applyMode === 'replace' && <span className="text-primary-600 font-bold text-xs">✓</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Svuota i pasti già presenti nella settimana selezionata e applica il modello pulito.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setApplyMode('merge')}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        applyMode === 'merge'
                          ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">
                          ➕ Aggiungi ai pasti esistenti
                        </span>
                        {applyMode === 'merge' && <span className="text-primary-600 font-bold text-xs">✓</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Conserva eventuali pasti già inseriti e aggiunge quelli del modello.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pinned Action Buttons for Apply */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => setSelectedTemplateForApply(null)}
                  className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => handleApply(selectedTemplateForApply)}
                  disabled={saving}
                  className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-md"
                >
                  {saving ? 'Applicando…' : 'Conferma ed Applica ✓'}
                </button>
              </div>
            </div>
          ) : (
            /* Templates List */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 [-webkit-overflow-scrolling:touch]">
                {(!templates || templates.length === 0) ? (
                  <div className="text-center py-10 px-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-xs font-bold text-gray-800">Nessun modello salvato</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Pianifica una settimana tipo e clicca su &ldquo;Salva Questa Settimana&rdquo; per riutilizzarla quando vuoi!
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab('save_current')}
                      className="mt-3.5 btn-primary text-xs py-2 px-3 inline-flex items-center gap-1.5"
                    >
                      <span>💾 Salva settimana ora</span>
                    </button>
                  </div>
                ) : (
                  templates.map(tpl => {
                    const daysCount = new Set(tpl.meals.map(m => m.dayOffset)).size
                    return (
                      <div
                        key={tpl.id}
                        className="bg-gray-50 hover:bg-gray-100/80 border border-gray-200/80 rounded-2xl p-3.5 flex flex-col gap-2.5 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm leading-tight">
                              {tpl.name}
                            </h4>
                            {tpl.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                              <span>🍽️ {tpl.meals.length} pasti</span>
                              <span>•</span>
                              <span>📅 {daysCount} giorni coperti</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                            className="text-gray-300 hover:text-red-500 text-sm p-1 transition-colors"
                            title="Elimina modello"
                          >
                            🗑
                          </button>
                        </div>

                        {/* Day Pills Preview */}
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide py-0.5">
                          {DAY_NAMES.map((name, idx) => {
                            const count = tpl.meals.filter(m => m.dayOffset === idx).length
                            return (
                              <span
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  count > 0
                                    ? 'bg-primary-100 text-primary-800 border border-primary-200/60'
                                    : 'bg-gray-200/60 text-gray-400'
                                }`}
                              >
                                {name} {count > 0 ? `(${count})` : ''}
                              </span>
                            )
                          })}
                        </div>

                        {/* Action: Apply */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedTemplateForApply(tpl)}
                            className="btn-primary text-xs py-2 px-3 font-bold flex items-center gap-1 shadow-xs"
                          >
                            <span>📅 Applica a questa settimana</span>
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Pinned Footer for Templates List */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <button
                  type="button"
                  onClick={() => setTab('save_current')}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <span>💾</span>
                  <span>Salva settimana corrente</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  Chiudi
                </button>
              </div>
            </div>
          )
        )}

        {/* Tab 2: Save Current Week */}
        {tab === 'save_current' && (
          <form onSubmit={handleSaveCurrent} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
              {/* Week Summary Box */}
              <div className="bg-primary-50/80 border border-primary-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">
                  📊
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary-900">
                    Settimana in corso: {currentWeekMeals.length} pasti pianificati
                  </p>
                  <p className="text-[11px] text-primary-700 mt-0.5">
                    Salveremo i pasti di Lun-Dom con le loro rispettive ricette e porzioni.
                  </p>
                </div>
              </div>

              {currentWeekMeals.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800">
                  ⚠️ Questa settimana non ha ancora pasti pianificati. Aggiungi prima le ricette ai giorni della settimana, poi salvala come modello standard.
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Nome del Modello *
                    </label>
                    <input
                      type="text"
                      required
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      placeholder="es. Settimana Standard, Definizione Estiva, Pesce & Verdure..."
                      className="input-field text-sm font-semibold"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                      Note / Descrizione (opzionale)
                    </label>
                    <input
                      type="text"
                      value={templateDesc}
                      onChange={e => setTemplateDesc(e.target.value)}
                      placeholder="es. Alto apporto proteico per giorni di allenamento"
                      className="input-field text-xs"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Pinned Action Buttons for Saving Current Week */}
            <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
              <button
                type="button"
                onClick={() => setTab('saved')}
                className="btn-secondary flex-1 py-3 text-xs sm:text-sm font-bold"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={!templateName.trim() || saving || currentWeekMeals.length === 0}
                className="btn-primary flex-1 py-3 text-xs sm:text-sm font-bold shadow-md"
              >
                {saving ? 'Salvataggio…' : 'Salva come Modello ✓'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
