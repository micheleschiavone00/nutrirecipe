import { useState, useEffect } from 'react'
import type { ShoppingItem } from '@/types'

interface ItemQuantityModalProps {
  isOpen: boolean
  item: ShoppingItem | null
  onSave: (itemId: string, newQuantity: number, newUnit: string) => Promise<void>
  onDelete?: (itemId: string) => Promise<void>
  onClose: () => void
}

const COMMON_UNITS = ['g', 'kg', 'pz', 'ml', 'l', 'conf', 'fette']

export default function ItemQuantityModal({
  isOpen,
  item,
  onSave,
  onDelete,
  onClose,
}: ItemQuantityModalProps) {
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('g')

  useEffect(() => {
    if (item) {
      setQty(String(item.quantity || 1))
      setUnit(item.unit || 'g')
    }
  }, [item])

  if (!isOpen || !item) return null

  const handleStep = (delta: number) => {
    const current = parseFloat(qty) || 0
    const next = Math.max(0.1, Math.round((current + delta) * 10) / 10)
    setQty(String(next))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numeric = parseFloat(qty) || 1
    await onSave(item.id, numeric, unit)
    onClose()
  }

  const handleDelete = async () => {
    if (onDelete && confirm(`Rimuovere "${item.name}" dalla lista della spesa?`)) {
      await onDelete(item.id)
      onClose()
    }
  }

  const isGrams = unit === 'g' || unit === 'ml'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Modifica Articolo
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
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Quantità e Unità di misura
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="input-field text-base font-black py-2.5 px-3 text-center"
                  autoFocus
                />
              </div>

              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="input-field text-sm font-bold py-2.5 px-3 w-24 text-center"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottoni regolazione rapida */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Aggiustamento rapido:</span>
            <div className="flex gap-1.5 flex-wrap">
              {isGrams ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStep(-50)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(-10)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(10)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(50)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(100)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +100
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(2)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(5)}
                    className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    +5
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 px-3 rounded-2xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900 transition-colors flex items-center justify-center gap-1"
                title="Elimina articolo"
              >
                <span>🗑️</span>
                <span>Elimina</span>
              </button>
            )}

            <button
              type="submit"
              className="btn-primary flex-1 py-2.5 text-xs font-bold rounded-2xl shadow-sm"
            >
              Salva Quantità
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
