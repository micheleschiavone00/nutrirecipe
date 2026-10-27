import { useState } from 'react'
import type { ShoppingItem } from '@/types'
import { calculateVoucherSplit } from '@/lib/db'

interface CheckoutModalProps {
  isOpen: boolean
  items: ShoppingItem[]
  voucherEnabled: boolean
  voucherValue: number
  onConfirmCheckout: () => Promise<void>
  onClose: () => void
}

export default function CheckoutModal({
  isOpen,
  items,
  voucherEnabled,
  voucherValue,
  onConfirmCheckout,
  onClose,
}: CheckoutModalProps) {
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || items.length === 0) return null

  const totalEuros = items.reduce((acc, item) => acc + (item.price || 0), 0)
  const voucherSplit = calculateVoucherSplit(totalEuros, voucherValue)

  const handleCheckout = async () => {
    setSubmitting(true)
    try {
      await onConfirmCheckout()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-xl">
              🛍️
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Riepilogo Cassa
              </p>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                Completa Spesa
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

        {/* Totale & Buoni Pasto Card */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-gray-800/90 dark:via-gray-800 dark:to-emerald-950/30 p-4 rounded-2xl border border-emerald-200/80 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Totale Spesa ({items.length} articoli)
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
              {totalEuros.toFixed(2)} €
            </span>
          </div>

          {voucherEnabled && (
            <div className="pt-2 border-t border-emerald-100 dark:border-gray-700/80 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <span>💳</span>
                <span>Buoni Pasto ({voucherValue.toFixed(2)} €/cad):</span>
              </span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800">
                {voucherSplit.label}
              </span>
            </div>
          )}
        </div>

        {/* Lista Articoli Acquistati */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-48 text-xs">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Articoli nel carrello:
          </p>
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-emerald-500 font-bold">✓</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.name}
                </span>
                <span className="text-gray-400 text-[10px]">
                  ({item.quantity}{item.unit})
                </span>
              </div>
              <span className="font-extrabold text-gray-800 dark:text-gray-200">
                {item.price ? `${item.price.toFixed(2)} €` : '0.00 €'}
              </span>
            </div>
          ))}
        </div>

        {/* Avviso Trasferimento in Dispensa */}
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base">🥫</span>
          <p className="leading-relaxed text-[11px]">
            Confermando, questi alimenti verranno <strong>trasferiti automaticamente nella tua Dispensa</strong> con date di scadenza stimate, e verranno rimossi dalla lista della spesa. Il conto in alto a destra si azzererà.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold"
          >
            Continua Spesa
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting}
            className="btn-primary flex-1 py-2.5 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <span>🥫</span>
            <span>{submitting ? 'Trasferimento…' : 'Salva in Dispensa'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
