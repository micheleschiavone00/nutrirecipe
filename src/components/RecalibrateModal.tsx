import { useState } from 'react'
import type { Recipe } from '@/types'
import { NutriBar } from '@/components/ui'

interface RecalibrateModalProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe
  candidateRecipe: Recipe | null
  onApply: (updated: Recipe) => Promise<void>
  onProceedAI: () => void
  onManualEdit: () => void
}

export default function RecalibrateModal({
  isOpen,
  onClose,
  recipe,
  candidateRecipe,
  onApply,
  onProceedAI,
  onManualEdit,
}: RecalibrateModalProps) {
  const [saving, setSaving] = useState(false)

  if (!isOpen || !candidateRecipe) return null

  const handleApplyClick = async () => {
    setSaving(true)
    try {
      await onApply(candidateRecipe)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const oldIngredients = recipe.adaptedIngredients || []
  const newIngredients = candidateRecipe.adaptedIngredients || []

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-4 animate-fade-in touch-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[85dvh] overflow-hidden border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl">⚡</span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Ricalibra Dosi con Algoritmo
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Confronta le nuove quantità calcolate dal tuo piano nutrizionale attivo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [-webkit-overflow-scrolling:touch]">
          {/* Summary Banner */}
          <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 p-3 rounded-2xl text-xs text-primary-900 dark:text-primary-200 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div className="space-y-0.5">
              <p className="font-bold">Ricalcolo deterministico applicato:</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Le fonti proteiche (uova, legumi, parmigiano, carne/pesce) sono state calibrate sul tuo piano
                con eventuale divisione al 50%. I grassi e i carboidrati sono stati riequilibrati.
              </p>
            </div>
          </div>

          {/* Ingredient Diff List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Confronto Ingredienti:
            </h4>
            <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
              {newIngredients.map((newIng, idx) => {
                const oldIng = oldIngredients[idx] || oldIngredients.find(o => o.name === newIng.name)
                const changed = oldIng ? oldIng.adaptedQuantity !== newIng.adaptedQuantity : true

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {newIng.name}
                      </p>
                      {changed && oldIng && (
                        <p className="text-[10px] text-gray-400 line-through">
                          Prima: {oldIng.adaptedQuantity}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-extrabold ${
                          changed
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {newIng.adaptedQuantity}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Multi-Variants Preview (if present) */}
          {candidateRecipe.variants && candidateRecipe.variants.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Varianti Calibrate per Pasto ({candidateRecipe.variants.length}):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidateRecipe.variants.map(v => (
                  <div
                    key={v.id}
                    className="bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{v.label}</span>
                      {v.nutritionalValues && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold">
                          {v.nutritionalValues.calories} kcal
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {v.adaptedIngredients.map(i => `${i.name}: ${i.adaptedQuantity}`).slice(0, 2).join(' • ')}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Macro Preview */}
          {candidateRecipe.nutritionalValues && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Nuovi Valori Nutrizionali Calibrati:
              </h4>
              <NutriBar
                calories={candidateRecipe.nutritionalValues.calories}
                proteins={candidateRecipe.nutritionalValues.proteins}
                carbs={candidateRecipe.nutritionalValues.carbs}
                fats={candidateRecipe.nutritionalValues.fats}
              />
            </div>
          )}
        </div>

        {/* Fixed Footer with 3 Actions */}
        <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleApplyClick}
            className="btn-primary w-full py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span>✅</span>
            <span>{saving ? 'Salvataggio in corso…' : 'Applica Nuove Dosi alla Ricetta'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onProceedAI()
              }}
              className="btn-secondary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            >
              <span>🤖</span>
              <span>Procedi con AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onManualEdit()
              }}
              className="btn-secondary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span>✏️</span>
              <span>Modifica a Mano</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
