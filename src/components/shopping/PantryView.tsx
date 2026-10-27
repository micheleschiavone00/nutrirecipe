import { useState, useMemo } from 'react'
import type { PantryItem, FoodGroup } from '@/types'
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, cn } from '@/lib/utils'
import { addPantryItem, updatePantryItem, deletePantryItem } from '@/lib/db'
import EditExpiryModal from '@/components/shopping/EditExpiryModal'

interface PantryViewProps {
  pantryItems: PantryItem[]
  onAddBackToShoppingList: (name: string, category: FoodGroup['category'], quantity?: number, unit?: string) => Promise<void>
}

export default function PantryView({
  pantryItems,
  onAddBackToShoppingList,
}: PantryViewProps) {
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('200')
  const [newUnit, setNewUnit] = useState('g')
  const [newCat, setNewCat] = useState<FoodGroup['category']>('vegetables')
  const [newExpiry, setNewExpiry] = useState('')
  const [isAddingOpen, setIsAddingOpen] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [itemForExpiryModal, setItemForExpiryModal] = useState<PantryItem | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  // Calcolo scadenze e stati
  const analyzedItems = useMemo(() => {
    return pantryItems.map(item => {
      let status: 'ok' | 'expiring' | 'expired' | 'depleted' = 'ok'
      let daysLeft: number | null = null

      if (item.isDepleted || item.quantity <= 0) {
        status = 'depleted'
      } else if (item.expiryDate) {
        const diffMs = new Date(item.expiryDate).getTime() - new Date(todayStr).getTime()
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        if (daysLeft < 0) {
          status = 'expired'
        } else if (daysLeft <= 3) {
          status = 'expiring'
        } else {
          status = 'ok'
        }
      }

      return {
        ...item,
        status,
        daysLeft,
      }
    })
  }, [pantryItems, todayStr])

  const stats = useMemo(() => {
    const expired = analyzedItems.filter(i => i.status === 'expired').length
    const expiring = analyzedItems.filter(i => i.status === 'expiring').length
    const depleted = analyzedItems.filter(i => i.status === 'depleted').length
    const total = analyzedItems.length
    return { expired, expiring, depleted, total }
  }, [analyzedItems])

  const filteredItems = useMemo(() => {
    let list = analyzedItems
    if (selectedCat !== 'all') {
      list = list.filter(i => i.category === selectedCat)
    }
    // Ordina: prima scaduti, poi in scadenza, poi esauriti, poi ok
    const priority: Record<string, number> = { expired: 1, expiring: 2, depleted: 3, ok: 4 }
    return list.sort((a, b) => priority[a.status] - priority[b.status])
  }, [analyzedItems, selectedCat])

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const qty = parseFloat(newQty) || 1
    const expiry = newExpiry.trim() || undefined

    await addPantryItem({
      name: newName.trim(),
      quantity: qty,
      unit: newUnit,
      category: newCat,
      purchaseDate: todayStr,
      expiryDate: expiry,
      isDepleted: false,
    })

    setNewName('')
    setIsAddingOpen(false)
    setActionMsg('✅ Alimento aggiunto alla dispensa!')
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleDecreaseQty = async (item: PantryItem, delta: number) => {
    const nextQty = Math.max(0, item.quantity - delta)
    const isDepleted = nextQty <= 0
    await updatePantryItem(item.id, {
      quantity: nextQty,
      isDepleted,
    })
  }

  const handleMarkDepleted = async (item: PantryItem) => {
    await updatePantryItem(item.id, {
      isDepleted: !item.isDepleted,
      quantity: item.isDepleted ? 100 : 0,
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Rimuovere questo alimento dalla dispensa?')) {
      await deletePantryItem(id)
    }
  }

  const handleMoveToShopping = async (item: PantryItem) => {
    await onAddBackToShoppingList(item.name, item.category, item.quantity || 100, item.unit)
    setActionMsg(`🛒 "${item.name}" aggiunto alla lista della spesa!`)
    setTimeout(() => setActionMsg(''), 3000)
  }

  const handleSaveExpiry = async (itemId: string, newExpiryDate?: string) => {
    await updatePantryItem(itemId, { expiryDate: newExpiryDate })
    setActionMsg(newExpiryDate ? `📅 Scadenza aggiornata al ${newExpiryDate}` : '📅 Scadenza rimossa')
    setTimeout(() => setActionMsg(''), 3000)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toast Notifica */}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-fade-in shadow-xs">
          {actionMsg}
        </div>
      )}

      {/* Overview Cards & Scadenze */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-2.5 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Totale</p>
          <p className="text-lg font-black text-gray-900 dark:text-gray-100">{stats.total}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-2.5 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">In scadenza</p>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.expiring}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-2xl p-2.5 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Scaduti</p>
          <p className="text-lg font-black text-red-700 dark:text-red-300">{stats.expired}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2.5 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Esauriti</p>
          <p className="text-lg font-black text-gray-700 dark:text-gray-300">{stats.depleted}</p>
        </div>
      </div>

      {/* Pulsante Apri Aggiungi in Dispensa */}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <span>🥫</span>
          <span>Alimenti in Dispensa ({filteredItems.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setIsAddingOpen(!isAddingOpen)}
          className="btn-primary py-1.5 px-3 text-xs font-bold rounded-xl shadow-xs"
        >
          {isAddingOpen ? '✕ Chiudi' : '+ Aggiungi in Dispensa'}
        </button>
      </div>

      {/* Form Aggiungi Alimento Manuale */}
      {isAddingOpen && (
        <form
          onSubmit={handleCreateManual}
          className="card p-4 space-y-3 border-primary-200 dark:border-primary-900 bg-primary-50/30 dark:bg-primary-950/20 animate-fade-in"
        >
          <p className="text-xs font-bold text-primary-900 dark:text-primary-100">
            Aggiungi alimento in dispensa:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Nome alimento (es. Uova, Riso, Zucchine)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input-field text-xs font-semibold"
            />
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                placeholder="Quantità"
                value={newQty}
                onChange={e => setNewQty(e.target.value)}
                className="input-field text-xs font-semibold w-24"
              />
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="input-field text-xs font-semibold w-20"
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="pz">pz</option>
                <option value="conf">conf</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Categoria
              </label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value as FoodGroup['category'])}
                className="input-field text-xs font-semibold"
              >
                <option value="vegetables">🥗 Verdure</option>
                <option value="proteins">🍗 Proteine</option>
                <option value="carbs">🥔 Carboidrati</option>
                <option value="dairy">🥛 Latticini</option>
                <option value="fats">🫒 Grassi</option>
                <option value="fruits">🍎 Frutta</option>
                <option value="other">🍴 Altro</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                Data Scadenza (opzionale)
              </label>
              <input
                type="date"
                value={newExpiry}
                onChange={e => setNewExpiry(e.target.value)}
                className="input-field text-xs font-semibold"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-2 text-xs font-bold shadow-sm">
            Salva in Dispensa
          </button>
        </form>
      )}

      {/* Categorie Chip Filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
        <button
          type="button"
          onClick={() => setSelectedCat('all')}
          className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCat === 'all'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Tutte ({analyzedItems.length})
        </button>
        {(['vegetables', 'proteins', 'carbs', 'dairy', 'fats', 'fruits'] as const).map(cat => {
          const count = analyzedItems.filter(i => i.category === cat).length
          if (count === 0 && selectedCat !== cat) return null
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
                selectedCat === cat
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '🍴'}</span>
              <span>{CATEGORY_LABELS[cat] || cat}</span>
              <span className="opacity-70 text-[10px]">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Lista Alimenti in Dispensa */}
      {filteredItems.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-3xl">🥫</p>
          <p className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
            Dispensa vuota
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
            Quando completi la spesa nel tab "Lista della Spesa", gli alimenti acquistati appariranno qui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const isDepleted = item.status === 'depleted'
            const isExpired = item.status === 'expired'
            const isExpiring = item.status === 'expiring'

            return (
              <div
                key={item.id}
                className={cn(
                  'card p-3 space-y-2 transition-all border',
                  isExpired
                    ? 'border-red-300 bg-red-50/20 dark:bg-red-950/20 dark:border-red-900'
                    : isExpiring
                    ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/20 dark:border-amber-900'
                    : isDepleted
                    ? 'opacity-60 border-gray-200 dark:border-gray-800'
                    : 'border-gray-100 dark:border-gray-800'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{CATEGORY_ICONS[item.category] || '🍴'}</span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-xs sm:text-sm font-extrabold truncate text-gray-900 dark:text-gray-100',
                          isDepleted && 'line-through text-gray-400'
                        )}
                      >
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Acquistato il {item.purchaseDate}
                      </p>
                    </div>
                  </div>

                  {/* Badge Scadenza - Cliccabile per modifica */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setItemForExpiryModal(item)}
                      title="Tocca per modificare o impostare la data di scadenza"
                      className="group flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                    >
                      {isExpired ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
                          <span>Scaduto!</span>
                          <span className="opacity-70 group-hover:opacity-100">✏️</span>
                        </span>
                      ) : isExpiring ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <span>Scade {item.daysLeft === 0 ? 'oggi' : item.daysLeft === 1 ? 'domani' : `tra ${item.daysLeft} gg`}</span>
                          <span className="opacity-70 group-hover:opacity-100">✏️</span>
                        </span>
                      ) : item.expiryDate ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <span>Scade il {item.expiryDate}</span>
                          <span className="opacity-70 group-hover:opacity-100">✏️</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-700 flex items-center gap-1">
                          <span>+ Scadenza 📅</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quantità & Controlli Rapidi */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800/80 gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-800 dark:text-gray-200">
                      {item.quantity}{item.unit}
                    </span>
                    {!isDepleted && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item, 50)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          title="Scala 50g"
                        >
                          -50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecreaseQty(item, 100)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                          title="Scala 100g"
                        >
                          -100
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Pulsante Sposta nella Lista Spesa (se sta finendo o è scaduto) */}
                    {(isDepleted || isExpiring || isExpired) && (
                      <button
                        type="button"
                        onClick={() => handleMoveToShopping(item)}
                        className="py-1 px-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/80 hover:bg-primary-100 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800 text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                        title="Aggiungi di nuovo alla lista della spesa"
                      >
                        <span>🛒</span>
                        <span>Riordina</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleMarkDepleted(item)}
                      className="py-1 px-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-semibold"
                    >
                      {isDepleted ? 'Ripristina' : 'Finito'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 text-xs p-1"
                      title="Elimina dalla dispensa"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {/* Modale Modifica Scadenza */}
      <EditExpiryModal
        isOpen={Boolean(itemForExpiryModal)}
        item={itemForExpiryModal}
        onSave={handleSaveExpiry}
        onClose={() => setItemForExpiryModal(null)}
      />
    </div>
  )
}
