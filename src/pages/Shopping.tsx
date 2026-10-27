import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  generateShoppingList,
  checkoutShoppingList,
  getFoodPrice,
  calculateVoucherSplit,
  saveSettings,
  getSettings,
} from '@/lib/db'
import { getMonday, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, generateId, cn } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/ui'
import PriceConfirmModal from '@/components/shopping/PriceConfirmModal'
import MealVoucherModal from '@/components/shopping/MealVoucherModal'
import CheckoutModal from '@/components/shopping/CheckoutModal'
import PantryView from '@/components/shopping/PantryView'
import type { ShoppingList, ShoppingItem, FoodGroup, AppSettings } from '@/types'

const CATEGORY_ORDER = ['proteins', 'vegetables', 'carbs', 'fruits', 'dairy', 'fats', 'other'] as const

export default function ShoppingPage() {
  const [activeTab, setActiveTab] = useState<'shopping' | 'pantry'>('shopping')
  const [weekStart] = useState(getMonday())

  // Modali
  const [itemForPriceModal, setItemForPriceModal] = useState<ShoppingItem | null>(null)
  const [historicalPriceForModal, setHistoricalPriceForModal] = useState<number | undefined>(undefined)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Form rapido aggiungi cibo manuale
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('1')
  const [manualUnit, setManualUnit] = useState('pz')
  const [manualCat, setManualCat] = useState<FoodGroup['category']>('vegetables')

  // Live queries
  const shoppingLists = useLiveQuery(
    () => db.shoppingLists.orderBy('createdAt').reverse().limit(5).toArray(),
    []
  )
  const currentList = shoppingLists?.[0]

  const pantryItems = useLiveQuery(
    () => db.pantryItems.orderBy('createdAt').reverse().toArray(),
    []
  ) ?? []

  const settings = useLiveQuery(
    () => getSettings(),
    []
  ) ?? {
    openAIApiKey: '',
    rapidApiKey: '',
    language: 'it',
    theme: 'system',
    mealVoucherEnabled: false,
    mealVoucherValue: 8.0,
  }

  // Planned meals per suggerimenti intelligenti (settimana corrente e prossima se verso fine settimana)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Dom, 4 = Gio, 5 = Ven, 6 = Sab
  const isWeekendApproach = dayOfWeek === 0 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6

  const nextWeekStart = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  }, [weekStart])

  const plannedMealsForSuggestions = useLiveQuery(
    async () => {
      const endOffset = isWeekendApproach ? 13 : 6
      const endDate = new Date(weekStart)
      endDate.setDate(endDate.getDate() + endOffset)
      const endStr = endDate.toISOString().split('T')[0]

      const meals = await db.plannedMeals
        .where('date')
        .between(weekStart, endStr, true, true)
        .toArray()

      const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean) as string[])]
      const recipes = await db.recipes.bulkGet(recipeIds)

      const needed: { name: string; quantity: number; unit: string; category: FoodGroup['category']; week: 'current' | 'next' }[] = []

      for (const meal of meals) {
        if (!meal.recipeId) continue
        const recipe = recipes.find(r => r?.id === meal.recipeId)
        if (!recipe) continue

        const isNextWeek = meal.date >= nextWeekStart
        for (const ing of recipe.adaptedIngredients) {
          const num = parseFloat(ing.adaptedQuantity.replace(/[^0-9.]/g, '')) || 100
          needed.push({
            name: ing.name,
            quantity: Math.ceil(num),
            unit: ing.unit || 'g',
            category: (ing.category || 'other') as FoodGroup['category'],
            week: isNextWeek ? 'next' : 'current',
          })
        }
      }

      return needed
    },
    [weekStart, isWeekendApproach, nextWeekStart]
  ) ?? []

  // Calcolo Totale nel carrello (solo elementi spuntati/depennati!)
  const checkedItems = useMemo(() => {
    return currentList?.items.filter(i => i.isChecked) || []
  }, [currentList])

  const cartTotal = useMemo(() => {
    return checkedItems.reduce((acc, item) => acc + (item.price || 0), 0)
  }, [checkedItems])

  const voucherSplit = useMemo(() => {
    return calculateVoucherSplit(cartTotal, settings.mealVoucherValue || 8.0)
  }, [cartTotal, settings.mealVoucherValue])

  // Rilevamento alimenti dalla dispensa da suggerire
  const pantrySuggestions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return pantryItems.filter(item => {
      if (item.isDepleted || item.quantity <= 0) return true
      if (item.expiryDate) {
        const diffMs = new Date(item.expiryDate).getTime() - new Date(today).getTime()
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        return days <= 3
      }
      return false
    })
  }, [pantryItems])

  // Suggerimenti da Meal Planner filtrati da quelli già in lista
  const plannerSuggestions = useMemo(() => {
    const existingNames = new Set((currentList?.items || []).map(i => i.name.toLowerCase().trim()))
    const deduplicated = new Map<string, { name: string; quantity: number; unit: string; category: FoodGroup['category']; week: 'current' | 'next' }>()

    for (const item of plannedMealsForSuggestions) {
      const key = item.name.toLowerCase().trim()
      if (!existingNames.has(key) && !deduplicated.has(key)) {
        deduplicated.set(key, item)
      }
    }

    return Array.from(deduplicated.values()).slice(0, 12)
  }, [plannedMealsForSuggestions, currentList])

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleGenerateList = async (includeNext = false) => {
    await generateShoppingList(weekStart, includeNext)
    setToastMsg(includeNext ? '✅ Lista generata per 2 settimane!' : '✅ Lista generata per questa settimana!')
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Interazione Checkbox: se spunti si apre la modale prezzo; se deselezioni si scomputa
  const handleItemCheckClick = async (item: ShoppingItem) => {
    if (!currentList) return

    if (!item.isChecked) {
      // Inserimento nel carrello: chiedi o conferma prezzo
      const lastPrice = await getFoodPrice(item.name)
      setHistoricalPriceForModal(lastPrice)
      setItemForPriceModal(item)
    } else {
      // Rimozione dal carrello: azzera il prezzo e togli la spunta
      const updated = currentList.items.map(i =>
        i.id === item.id ? { ...i, isChecked: false, price: 0 } : i
      )
      await db.shoppingLists.update(currentList.id, {
        items: updated,
        updatedAt: new Date(),
      })
    }
  }

  const handleConfirmPrice = async (price: number) => {
    if (!currentList || !itemForPriceModal) return
    const updated = currentList.items.map(i =>
      i.id === itemForPriceModal.id ? { ...i, isChecked: true, price } : i
    )
    await db.shoppingLists.update(currentList.id, {
      items: updated,
      updatedAt: new Date(),
    })
    setItemForPriceModal(null)
  }

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName.trim() || !currentList) return

    const qty = parseFloat(manualQty) || 1
    const historicalPrice = await getFoodPrice(manualName.trim())

    const newItem: ShoppingItem = {
      id: generateId(),
      name: manualName.trim(),
      quantity: qty,
      unit: manualUnit,
      category: manualCat,
      recipes: [],
      isChecked: false,
      estimatedPrice: historicalPrice,
    }

    const updated = [newItem, ...currentList.items]
    await db.shoppingLists.update(currentList.id, {
      items: updated,
      updatedAt: new Date(),
    })

    setManualName('')
    setToastMsg(`🛒 "${newItem.name}" aggiunto alla spesa!`)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const handleAddSuggestionToShopping = async (
    name: string,
    category: FoodGroup['category'],
    quantity = 1,
    unit = 'pz'
  ) => {
    let list = currentList
    if (!list) {
      list = await generateShoppingList(weekStart)
    }

    const historicalPrice = await getFoodPrice(name)
    const newItem: ShoppingItem = {
      id: generateId(),
      name,
      quantity,
      unit,
      category,
      recipes: [],
      isChecked: false,
      estimatedPrice: historicalPrice,
    }

    const updated = [newItem, ...list.items]
    await db.shoppingLists.update(list.id, {
      items: updated,
      updatedAt: new Date(),
    })

    setToastMsg(`+ "${name}" aggiunto alla spesa!`)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const handleCheckoutConfirm = async () => {
    if (!currentList || checkedItems.length === 0) return
    await checkoutShoppingList(currentList.id, checkedItems)
    setToastMsg(`🎉 Spesa completata! ${checkedItems.length} alimenti trasferiti nella tua Dispensa.`)
    setTimeout(() => setToastMsg(''), 4500)
  }

  const handleSaveVoucherSettings = async (enabled: boolean, val: number) => {
    await saveSettings({
      mealVoucherEnabled: enabled,
      mealVoucherValue: val,
    })
    setToastMsg('💳 Impostazioni Buoni Pasto salvate!')
    setTimeout(() => setToastMsg(''), 2500)
  }

  const exportList = (list: ShoppingList) => {
    const text = CATEGORY_ORDER
      .filter(cat => list.items.some(i => i.category === cat))
      .map(cat => {
        const catItems = list.items.filter(i => i.category === cat)
        const header = `\n${CATEGORY_LABELS[cat].toUpperCase()}\n${'─'.repeat(20)}`
        const rows = catItems.map(
          i => `${i.isChecked ? '✓' : '☐'} ${i.name} — ${i.quantity}${i.unit}${i.price ? ` (${i.price.toFixed(2)}€)` : ''}`
        )
        return [header, ...rows].join('\n')
      })
      .join('\n')

    const fullText = `🛒 Lista Spesa NutriRecipe (${list.items.length} articoli)\n${'═'.repeat(35)}\nTotale Carrello: ${cartTotal.toFixed(2)} €\n${text}`

    if (navigator.share) {
      navigator.share({ text: fullText, title: 'Lista della Spesa' }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(fullText)
      alert('Lista copiata negli appunti!')
    }
  }

  const groupedItems = (items: ShoppingItem[]) => {
    return CATEGORY_ORDER
      .map(cat => ({
        category: cat,
        items: items.filter(i => i.category === cat),
      }))
      .filter(g => g.items.length > 0)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      {/* Page Header con Totale in Alto a Destra */}
      <PageHeader
        title="Spesa & Dispensa"
        action={
          activeTab === 'shopping' ? (
            <div className="flex items-center gap-2">
              {/* Totale Carrello & Buoni Pasto Widget */}
              <div
                onClick={() => setIsVoucherModalOpen(true)}
                className="bg-primary-50 dark:bg-gray-800/90 border border-primary-200 dark:border-gray-700 rounded-2xl px-3 py-1.5 cursor-pointer hover:border-primary-400 transition-all text-right shadow-2xs group"
                title="Tocca per configurare i Buoni Pasto"
              >
                <div className="flex items-center justify-end gap-1">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nel Carrello:
                  </span>
                  <span className="text-sm font-black text-primary-700 dark:text-primary-300">
                    {cartTotal.toFixed(2)} €
                  </span>
                </div>
                {settings.mealVoucherEnabled ? (
                  <p className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                    {voucherSplit.label}
                  </p>
                ) : (
                  <p className="text-[9px] text-primary-600 dark:text-primary-400 group-hover:underline">
                    + Configura Buoni Pasto
                  </p>
                )}
              </div>

              {currentList && (
                <button
                  type="button"
                  onClick={() => exportList(currentList)}
                  className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-sm transition-colors"
                  title="Condividi lista"
                >
                  📤
                </button>
              )}
            </div>
          ) : null
        }
      />

      <div className="px-4 pt-3 max-w-lg mx-auto space-y-4">
        {/* Toast Notifica */}
        {toastMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-fade-in shadow-xs">
            {toastMsg}
          </div>
        )}

        {/* ── Tabs Switcher (Spesa vs Dispensa) ── */}
        <div className="flex bg-gray-200/80 dark:bg-gray-800/80 rounded-2xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('shopping')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'shopping'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🛒</span>
            <span>Lista Spesa</span>
            {currentList && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300">
                {currentList.items.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pantry')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pantry'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>🥫</span>
            <span>Dispensa</span>
            {pantryItems.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                {pantryItems.length}
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: LISTA DELLA SPESA
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'shopping' && (
          <div className="space-y-4 animate-fade-in">
            {/* Form Aggiunta Rapida Alimento Manuale */}
            <form
              onSubmit={handleAddManualItem}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-2.5 shadow-2xs space-y-2"
            >
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="Cosa ti serve? (es. Olio, Frutta, Pane)"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  className="input-field text-xs font-semibold flex-1 py-2"
                />
                <input
                  type="number"
                  min="1"
                  value={manualQty}
                  onChange={e => setManualQty(e.target.value)}
                  className="input-field text-xs font-semibold w-16 text-center py-2"
                />
                <select
                  value={manualUnit}
                  onChange={e => setManualUnit(e.target.value)}
                  className="input-field text-xs font-semibold w-16 py-2 px-1"
                >
                  <option value="pz">pz</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="conf">conf</option>
                </select>
                <button
                  type="submit"
                  disabled={!manualName.trim()}
                  className="btn-primary py-2 px-3 text-xs font-bold flex-shrink-0 rounded-xl shadow-xs"
                >
                  + Aggiungi
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pt-0.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase flex-shrink-0 mr-1">
                  Cat:
                </span>
                {(['vegetables', 'proteins', 'carbs', 'dairy', 'fruits', 'fats', 'other'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setManualCat(c)}
                    className={`py-0.5 px-2 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${
                      manualCat === c
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </form>

            {!currentList || currentList.items.length === 0 ? (
              <EmptyState
                icon="🛒"
                title="Lista della spesa vuota"
                description="Pianifica la settimana nel Meal Planner per generarla in automatico o aggiungi alimenti manualmente con la barra qui sopra."
                action={
                  <div className="flex flex-col sm:flex-row gap-2 justify-center w-full max-w-xs mx-auto">
                    <button
                      onClick={() => handleGenerateList(false)}
                      className="btn-primary text-xs py-2.5 font-bold"
                    >
                      Genera per questa settimana
                    </button>
                    {isWeekendApproach && (
                      <button
                        onClick={() => handleGenerateList(true)}
                        className="py-2.5 px-3 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-300 dark:border-primary-800 text-primary-800 dark:text-primary-300 text-xs font-bold hover:bg-primary-100"
                      >
                        Genera per 2 settimane
                      </button>
                    )}
                  </div>
                }
              />
            ) : (
              <>
                {/* Progress Bar & Azioni Rapide */}
                <div className="card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Nel carrello: {checkedItems.length} su {currentList.items.length} articoli
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        Spunta gli ingredienti man mano che li prendi al supermercato
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGenerateList(false)}
                        className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                        title="Rigenera dai pasti pianificati"
                      >
                        🔄 Aggiorna
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(checkedItems.length / currentList.items.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Lista Articoli per Categoria */}
                <div className="space-y-3">
                  {groupedItems(currentList.items).map(({ category, items }) => (
                    <div key={category} className="card overflow-hidden border border-gray-100 dark:border-gray-800">
                      <div className={cn('px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between', CATEGORY_COLORS[category])}>
                        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                          <span>{CATEGORY_ICONS[category] || '🍴'}</span>
                          <span>{CATEGORY_LABELS[category]}</span>
                        </div>
                        <span className="text-[10px] font-semibold opacity-75">
                          {items.length} {items.length === 1 ? 'alimento' : 'alimenti'}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors',
                              item.isChecked && 'bg-emerald-50/20 dark:bg-emerald-950/15'
                            )}
                            onClick={() => handleItemCheckClick(item)}
                          >
                            <input
                              type="checkbox"
                              checked={item.isChecked}
                              onChange={() => {}} // gestito da onClick contenitore
                              className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-500 accent-primary-500 cursor-pointer flex-shrink-0"
                            />

                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  'text-xs sm:text-sm font-semibold truncate',
                                  item.isChecked
                                    ? 'line-through text-gray-400 dark:text-gray-500'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {item.name}
                              </p>
                              {item.recipes.length > 0 && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {item.recipes.length} {item.recipes.length > 1 ? 'ricette' : 'ricetta'}
                                </p>
                              )}
                            </div>

                            {/* Quantità e Prezzo */}
                            <div className="text-right flex-shrink-0">
                              <p
                                className={cn(
                                  'text-xs sm:text-sm font-bold',
                                  item.isChecked
                                    ? 'text-gray-400 dark:text-gray-500'
                                    : 'text-primary-600 dark:text-primary-400'
                                )}
                              >
                                {item.quantity}{item.unit}
                              </p>
                              {item.isChecked && item.price !== undefined && item.price > 0 && (
                                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                  {item.price.toFixed(2)} €
                                </span>
                              )}
                              {!item.isChecked && item.estimatedPrice && item.estimatedPrice > 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  ~{item.estimatedPrice.toFixed(2)} €
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── SEZIONE SUGGERIMENTI IN BASSO (Planner + Dispensa) ── */}
            <div className="space-y-3 pt-2">
              {/* 1. Suggerimenti dalla Dispensa (In Esaurimento / In Scadenza) */}
              {pantrySuggestions.length > 0 && (
                <div className="card p-3.5 space-y-2 border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <span>🥫</span>
                      <span>Dalla tua Dispensa (In esaurimento o scadenza)</span>
                    </p>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      {pantrySuggestions.length} alimenti
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    Questi alimenti stanno finendo o sono vicini alla scadenza. Tocca per aggiungerli alla spesa:
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {pantrySuggestions.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddSuggestionToShopping(p.name, p.category, p.quantity || 1, p.unit)}
                        className="bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/40 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>+ {p.name}</span>
                        <span className="text-[10px] opacity-75 font-normal">({p.quantity}{p.unit})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Suggerimenti dal Meal Planner (Settimana corrente & Prossima se fine settimana) */}
              {plannerSuggestions.length > 0 && (
                <div className="card p-3.5 space-y-2 border-primary-200/80 dark:border-primary-900 bg-primary-50/20 dark:bg-primary-950/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold text-primary-950 dark:text-primary-200 flex items-center gap-1.5">
                      <span>📅</span>
                      <span>Dal tuo Meal Planner {isWeekendApproach && '(questa + prossima settimana)'}</span>
                    </p>
                    <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">
                      {plannerSuggestions.length} da pianificare
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Ingredienti richiesti dalle tue ricette nel calendario non ancora in lista:
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {plannerSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddSuggestionToShopping(s.name, s.category, s.quantity, s.unit)}
                        className="bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/40 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>+ {s.name}</span>
                        <span className="text-[10px] text-primary-600 dark:text-primary-400">
                          ({s.quantity}{s.unit})
                        </span>
                        {s.week === 'next' && (
                          <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1 py-0.2 rounded font-extrabold">
                            prox sett.
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: DISPENSA
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'pantry' && (
          <PantryView
            pantryItems={pantryItems}
            onAddBackToShoppingList={handleAddSuggestionToShopping}
          />
        )}
      </div>

      {/* ── BARRA FLUTTUANTE CHECKOUT (Attiva quando ci sono elementi spuntati nel carrello) ── */}
      {activeTab === 'shopping' && checkedItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-3 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-between shadow-xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <div className="text-left">
                  <p className="leading-tight">Completa Spesa ({checkedItems.length} articoli)</p>
                  <p className="text-[10px] font-normal text-emerald-100 opacity-90">
                    Sposta in Dispensa e azzera conto
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-black leading-tight">{cartTotal.toFixed(2)} €</p>
                {settings.mealVoucherEnabled && (
                  <p className="text-[10px] text-emerald-200 font-extrabold">{voucherSplit.label}</p>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── MODALI ── */}
      <PriceConfirmModal
        isOpen={Boolean(itemForPriceModal)}
        item={itemForPriceModal}
        lastHistoricalPrice={historicalPriceForModal}
        onConfirm={handleConfirmPrice}
        onClose={() => setItemForPriceModal(null)}
      />

      <MealVoucherModal
        isOpen={isVoucherModalOpen}
        settings={settings}
        onSave={handleSaveVoucherSettings}
        onClose={() => setIsVoucherModalOpen(false)}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        items={checkedItems}
        voucherEnabled={Boolean(settings.mealVoucherEnabled)}
        voucherValue={settings.mealVoucherValue || 8.0}
        onConfirmCheckout={handleCheckoutConfirm}
        onClose={() => setIsCheckoutModalOpen(false)}
      />
    </div>
  )
}
