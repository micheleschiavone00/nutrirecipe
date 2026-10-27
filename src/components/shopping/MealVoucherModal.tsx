import { useState, useEffect } from 'react'
import type { AppSettings } from '@/types'

interface MealVoucherModalProps {
  isOpen: boolean
  settings: AppSettings
  onSave: (voucherEnabled: boolean, voucherValue: number) => Promise<void>
  onClose: () => void
}

export default function MealVoucherModal({
  isOpen,
  settings,
  onSave,
  onClose,
}: MealVoucherModalProps) {
  const [enabled, setEnabled] = useState(false)
  const [valueInput, setValueInput] = useState('8.00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEnabled(Boolean(settings.mealVoucherEnabled))
    setValueInput(String(settings.mealVoucherValue ?? 8.00))
  }, [settings])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const val = parseFloat(valueInput) || 8.00
      await onSave(enabled, val)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const numericVal = parseFloat(valueInput) || 8.00

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-xl">
              💳
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Impostazioni
              </p>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                Buoni Pasto Supermercato
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Toggle Abilitazione */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5 flex items-center justify-between border border-gray-100 dark:border-gray-700/60">
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
              Calcola Buoni Pasto alla Spesa
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Mostra la conversione in tempo reale (es. 4 BP + 2.00 €)
            </p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-500 accent-primary-500 cursor-pointer"
          />
        </div>

        {/* Valore Singolo Buono Pasto */}
        {enabled && (
          <div className="space-y-2 animate-fade-in">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              Importo di 1 Buono Pasto:
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="1"
                value={valueInput}
                onChange={e => setValueInput(e.target.value)}
                className="w-full text-xl font-bold py-2 px-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-primary-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                € / buono
              </span>
            </div>

            {/* Pulsanti veloci tagli standard italiani (7€, 8€, 9.50€) */}
            <div className="flex gap-1.5 pt-1">
              {[7.0, 8.0, 9.5].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setValueInput(preset.toFixed(2))}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    numericVal === preset
                      ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {preset.toFixed(2)} €
                </button>
              ))}
            </div>

            {/* Esempio Pratico */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl p-2.5 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              💡 <strong>Esempio:</strong> con buoni da {numericVal.toFixed(2)} €, una spesa di{' '}
              {(numericVal * 4 + 2).toFixed(2)} € ti mostrerà: <strong>4 BP + 2.00 €</strong>.
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 rounded-xl font-bold text-xs shadow-sm"
          >
            {saving ? 'Salvo…' : 'Salva Impostazioni'}
          </button>
        </div>
      </div>
    </div>
  )
}
