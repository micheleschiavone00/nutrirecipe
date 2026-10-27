import { useState, useEffect } from 'react'
import type { ShoppingItem } from '@/types'

interface PriceConfirmModalProps {
  isOpen: boolean
  item: ShoppingItem | null
  lastHistoricalPrice?: number
  onConfirm: (price: number) => void
  onClose: () => void
}

export default function PriceConfirmModal({
  isOpen,
  item,
  lastHistoricalPrice,
  onConfirm,
  onClose,
}: PriceConfirmModalProps) {
  const [priceInput, setPriceInput] = useState<string>('')

  useEffect(() => {
    if (item) {
      if (item.price && item.price > 0) {
        setPriceInput(item.price.toFixed(2))
      } else if (lastHistoricalPrice && lastHistoricalPrice > 0) {
        setPriceInput(lastHistoricalPrice.toFixed(2))
      } else {
        setPriceInput('')
      }
    }
  }, [item, lastHistoricalPrice])

  if (!isOpen || !item) return null

  const handleQuickAdd = (delta: number) => {
    const current = parseFloat(priceInput) || 0
    const next = Math.max(0, current + delta)
    setPriceInput(next.toFixed(2))
  }

  const handleSave = () => {
    const parsed = parseFloat(priceInput) || 0
    onConfirm(parsed)
  }

  const handleFree = () => {
    onConfirm(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-xl">
              🏷️
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Prezzo Articolo
              </p>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                {item.name}
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

        {/* Quantità & Prezzo Storico */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 flex items-center justify-between text-xs border border-gray-100 dark:border-gray-700/60">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Quantità:</span>
            <span className="font-bold text-gray-900 dark:text-gray-100 ml-1">
              {item.quantity}{item.unit}
            </span>
          </div>
          {lastHistoricalPrice && lastHistoricalPrice > 0 && (
            <div className="text-[11px] text-primary-700 dark:text-primary-300 font-semibold bg-primary-100/70 dark:bg-primary-950/80 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-800">
              Ultimo: {lastHistoricalPrice.toFixed(2)} €
            </div>
          )}
        </div>

        {/* Input Prezzo Principale */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
            Prezzo effettivo pagato:
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={priceInput}
              onChange={e => setPriceInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="0.00"
              className="w-full text-2xl font-black text-center py-2.5 px-3 bg-gray-50 dark:bg-gray-800 border-2 border-primary-500 dark:border-primary-600 text-primary-900 dark:text-primary-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
              €
            </span>
          </div>
        </div>

        {/* Pulsanti Rapidi Incremento */}
        <div className="flex items-center gap-1.5 justify-center">
          <button
            type="button"
            onClick={() => handleQuickAdd(0.5)}
            className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95"
          >
            +0.50 €
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(1.0)}
            className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95"
          >
            +1.00 €
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(2.0)}
            className="flex-1 py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95"
          >
            +2.00 €
          </button>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleFree}
            className="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold"
            title="Non calcolare prezzo per questo alimento"
          >
            Gratis / 0€
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1 py-2.5 rounded-xl font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>✓</span>
            <span>Conferma e Metti nel Carrello</span>
          </button>
        </div>
      </div>
    </div>
  )
}
