import { useState, useEffect, useMemo } from 'react'
import type { ShoppingItem, FoodPrice } from '@/types'
import { normalizeQuantityToBaseUnit } from '@/lib/db'

interface PriceConfirmModalProps {
  isOpen: boolean
  item: ShoppingItem | null
  foodPriceDetails?: FoodPrice
  onConfirm: (price: number, updatedQuantity?: number, updatedUnit?: string) => void
  onClose: () => void
}

const COMMON_UNITS = ['g', 'kg', 'pz', 'ml', 'l', 'conf']

export default function PriceConfirmModal({
  isOpen,
  item,
  foodPriceDetails,
  onConfirm,
  onClose,
}: PriceConfirmModalProps) {
  const [priceInput, setPriceInput] = useState<string>('')
  const [qtyInput, setQtyInput] = useState<string>('1')
  const [unitInput, setUnitInput] = useState<string>('g')
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState<boolean>(false)

  // Initialize or reset when item changes
  useEffect(() => {
    if (item) {
      const q = item.quantity || 1
      const u = item.unit || 'g'
      setQtyInput(String(q))
      setUnitInput(u)
      setIsPriceManuallyEdited(false)

      if (item.price && item.price > 0) {
        setPriceInput(item.price.toFixed(2))
        setIsPriceManuallyEdited(true)
      } else if (foodPriceDetails?.unitPrice && foodPriceDetails?.baseUnit) {
        // Calculate proportional price based on stored unit price
        const norm = normalizeQuantityToBaseUnit(q, u)
        if (norm.baseUnit === foodPriceDetails.baseUnit && norm.baseQuantity > 0) {
          const estimated = Math.round(norm.baseQuantity * foodPriceDetails.unitPrice * 100) / 100
          setPriceInput(estimated.toFixed(2))
        } else if (foodPriceDetails.lastPrice > 0) {
          setPriceInput(foodPriceDetails.lastPrice.toFixed(2))
        } else {
          setPriceInput('')
        }
      } else if (foodPriceDetails?.lastPrice && foodPriceDetails.lastPrice > 0) {
        setPriceInput(foodPriceDetails.lastPrice.toFixed(2))
      } else {
        setPriceInput('')
      }
    }
  }, [item, foodPriceDetails])

  // Current numeric values
  const currentNumericQty = useMemo(() => Math.max(0.01, parseFloat(qtyInput) || 1), [qtyInput])
  const currentNumericPrice = useMemo(() => Math.max(0, parseFloat(priceInput) || 0), [priceInput])

  // Calculated live unit price from current price & quantity inputs
  const liveUnitPriceLabel = useMemo(() => {
    if (currentNumericPrice <= 0 || currentNumericQty <= 0) return null
    const norm = normalizeQuantityToBaseUnit(currentNumericQty, unitInput)
    if (norm.baseQuantity <= 0) return null

    const pricePerBaseUnit = currentNumericPrice / norm.baseQuantity
    if (norm.baseUnit === 'g') {
      const perKg = (pricePerBaseUnit * 1000).toFixed(2)
      return `${perKg} €/kg`
    } else if (norm.baseUnit === 'ml') {
      const perLiter = (pricePerBaseUnit * 1000).toFixed(2)
      return `${perLiter} €/L`
    } else {
      return `${pricePerBaseUnit.toFixed(2)} €/pz`
    }
  }, [currentNumericPrice, currentNumericQty, unitInput])

  // Reference historical unit price label if available
  const historicalUnitPriceLabel = useMemo(() => {
    if (!foodPriceDetails?.unitPrice || !foodPriceDetails?.baseUnit) return null
    if (foodPriceDetails.baseUnit === 'g') {
      return `${(foodPriceDetails.unitPrice * 1000).toFixed(2)} €/kg`
    } else if (foodPriceDetails.baseUnit === 'ml') {
      return `${(foodPriceDetails.unitPrice * 1000).toFixed(2)} €/L`
    } else {
      return `${foodPriceDetails.unitPrice.toFixed(2)} €/pz`
    }
  }, [foodPriceDetails])

  if (!isOpen || !item) return null

  // Quantity stepper adjustments (+ / -)
  const handleQuantityStep = (delta: number) => {
    const current = parseFloat(qtyInput) || 1
    let stepAmount = delta
    if (unitInput === 'g' || unitInput === 'ml') {
      stepAmount = delta * (current >= 200 ? 50 : 25)
    } else if (unitInput === 'kg' || unitInput === 'l') {
      stepAmount = delta * 0.5
    } else {
      stepAmount = delta * 1
    }

    const nextQty = Math.max(0.1, Math.round((current + stepAmount) * 10) / 10)
    setQtyInput(String(nextQty))

    // If price wasn't manually overridden, auto-recalculate proportional price
    if (!isPriceManuallyEdited && foodPriceDetails?.unitPrice && foodPriceDetails?.baseUnit) {
      const norm = normalizeQuantityToBaseUnit(nextQty, unitInput)
      if (norm.baseUnit === foodPriceDetails.baseUnit) {
        const estimated = Math.round(norm.baseQuantity * foodPriceDetails.unitPrice * 100) / 100
        setPriceInput(estimated.toFixed(2))
      }
    }
  }

  const handleUnitChange = (newUnit: string) => {
    setUnitInput(newUnit)
    if (!isPriceManuallyEdited && foodPriceDetails?.unitPrice && foodPriceDetails?.baseUnit) {
      const norm = normalizeQuantityToBaseUnit(currentNumericQty, newUnit)
      if (norm.baseUnit === foodPriceDetails.baseUnit) {
        const estimated = Math.round(norm.baseQuantity * foodPriceDetails.unitPrice * 100) / 100
        setPriceInput(estimated.toFixed(2))
      }
    }
  }

  const handleQuickAddPrice = (delta: number) => {
    const current = parseFloat(priceInput) || 0
    const next = Math.max(0, current + delta)
    setPriceInput(next.toFixed(2))
    setIsPriceManuallyEdited(true)
  }

  const handleSave = () => {
    const parsedPrice = parseFloat(priceInput) || 0
    const finalQty = parseFloat(qtyInput) || item.quantity || 1
    const finalUnit = unitInput || item.unit || 'g'
    onConfirm(parsedPrice, finalQty, finalUnit)
  }

  const handleFree = () => {
    const finalQty = parseFloat(qtyInput) || item.quantity || 1
    const finalUnit = unitInput || item.unit || 'g'
    onConfirm(0, finalQty, finalUnit)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xl">
              🛍️
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Conferma Acquisto
              </p>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 truncate max-w-[210px]">
                {item.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sezione Quantità Modificabile (con Stepper - / +) */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Quantità acquistata:
            </span>
            {historicalUnitPriceLabel && (
              <span className="text-[10px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/80 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-800">
                Rif: {historicalUnitPriceLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stepper Meno */}
            <button
              type="button"
              onClick={() => handleQuantityStep(-1)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-extrabold text-lg text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all shadow-2xs"
            >
              −
            </button>

            {/* Input Quantità (text-base per evitare zoom iOS) */}
            <input
              type="number"
              step="any"
              min="0.01"
              value={qtyInput}
              onChange={e => {
                setQtyInput(e.target.value)
                const val = parseFloat(e.target.value) || 0
                if (!isPriceManuallyEdited && val > 0 && foodPriceDetails?.unitPrice && foodPriceDetails?.baseUnit) {
                  const norm = normalizeQuantityToBaseUnit(val, unitInput)
                  if (norm.baseUnit === foodPriceDetails.baseUnit) {
                    const est = Math.round(norm.baseQuantity * foodPriceDetails.unitPrice * 100) / 100
                    setPriceInput(est.toFixed(2))
                  }
                }
              }}
              className="flex-1 text-base font-black text-center py-2 px-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />

            {/* Stepper Più */}
            <button
              type="button"
              onClick={() => handleQuantityStep(1)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-extrabold text-lg text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all shadow-2xs"
            >
              +
            </button>

            {/* Selettore Unità */}
            <select
              value={unitInput}
              onChange={e => handleUnitChange(e.target.value)}
              className="w-20 h-10 text-xs font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {COMMON_UNITS.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Prezzo Principale */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
              Prezzo pagato:
            </label>
            {liveUnitPriceLabel && (
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                ⚡ {liveUnitPriceLabel}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={priceInput}
              onChange={e => {
                setPriceInput(e.target.value)
                setIsPriceManuallyEdited(true)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
              placeholder="0.00"
              className="w-full text-2xl font-black text-center py-2.5 px-3 bg-gray-50 dark:bg-gray-800 border-2 border-emerald-500 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">
              €
            </span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
            Il prezzo e la quota unitaria verranno memorizzati per i futuri acquisti.
          </p>
        </div>

        {/* Pulsanti Rapidi Incremento */}
        <div className="flex items-center gap-1.5 justify-center">
          <button
            type="button"
            onClick={() => handleQuickAddPrice(0.5)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95 shadow-2xs"
          >
            +0.50 €
          </button>
          <button
            type="button"
            onClick={() => handleQuickAddPrice(1.0)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95 shadow-2xs"
          >
            +1.00 €
          </button>
          <button
            type="button"
            onClick={() => handleQuickAddPrice(2.0)}
            className="flex-1 py-1.5 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all active:scale-95 shadow-2xs"
          >
            +2.00 €
          </button>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleFree}
            className="py-3 px-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-colors"
            title="Non calcolare prezzo per questo alimento"
          >
            Gratis / 0€
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary flex-1 py-3 rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <span>✓</span>
            <span>Salva e Metti nel Carrello</span>
          </button>
        </div>
      </div>
    </div>
  )
}
