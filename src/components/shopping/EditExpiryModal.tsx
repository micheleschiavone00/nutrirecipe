import { useState, useEffect } from 'react'
import type { PantryItem } from '@/types'

interface EditExpiryModalProps {
  isOpen: boolean
  item: PantryItem | null
  onSave: (itemId: string, newExpiryDate?: string) => Promise<void>
  onClose: () => void
}

export default function EditExpiryModal({
  isOpen,
  item,
  onSave,
  onClose,
}: EditExpiryModalProps) {
  const [expiry, setExpiry] = useState('')

  useEffect(() => {
    if (item) {
      setExpiry(item.expiryDate || '')
    }
  }, [item])

  if (!isOpen || !item) return null

  const handleAddDays = (days: number) => {
    const base = new Date()
    base.setDate(base.getDate() + days)
    const formatted = base.toISOString().split('T')[0]
    setExpiry(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(item.id, expiry.trim() || undefined)
    onClose()
  }

  const handleClear = async () => {
    setExpiry('')
    await onSave(item.id, undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Scadenza Dispensa
            </span>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center text-sm font-bold flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              Seleziona Data di Scadenza
            </label>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="input-field text-sm font-bold py-2.5 px-3 w-full text-center"
              autoFocus
            />
          </div>

          {/* Scorciatoie veloci */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Imposta al volo:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleAddDays(3)}
                className="py-1.5 px-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
              >
                +3 giorni
              </button>
              <button
                type="button"
                onClick={() => handleAddDays(7)}
                className="py-1.5 px-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
              >
                +1 settimana
              </button>
              <button
                type="button"
                onClick={() => handleAddDays(14)}
                className="py-1.5 px-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
              >
                +2 settimane
              </button>
              <button
                type="button"
                onClick={() => handleAddDays(30)}
                className="py-1.5 px-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
              >
                +1 mese
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {item.expiryDate && (
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 px-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-600 dark:text-gray-400 text-xs font-bold transition-colors"
              >
                Rimuovi
              </button>
            )}

            <button
              type="submit"
              className="btn-primary flex-1 py-2.5 text-xs font-bold rounded-2xl shadow-sm"
            >
              Salva Scadenza
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
