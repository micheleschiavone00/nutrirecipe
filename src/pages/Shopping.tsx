import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  generateShoppingList,
  checkoutShoppingList,
  getFoodPrice,
  getFoodPriceDetails,
  saveFoodPrice,
  calculateVoucherSplit,
  saveSettings,
  getSettings,
} from '@/lib/db'
import { getMonday, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, generateId, cn } from '@/lib/utils'
import { PageHeader, EmptyState } from '@/components/ui'
import PriceConfirmModal from '@/components/shopping/PriceConfirmModal'
import MealVoucherModal from '@/components/shopping/MealVoucherModal'
import CheckoutModal from '@/components/shopping/CheckoutModal'
import ItemQuantityModal from '@/components/shopping/ItemQuantityModal'
import PantryView from '@/components/shopping/PantryView'
import type { ShoppingList, ShoppingItem, FoodGroup, AppSettings, FoodPrice } from '@/types'

const CATEGORY_ORDER = ['proteins', 'vegetables', 'carbs', 'fruits', 'dairy', 'fats', 'other'] as const

const CATEGORY_ITEMS: { key: FoodGroup['category']; label: string; icon: string }[] = [
  { key: 'proteins', label: 'Proteine', icon: '🍗' },
  { key: 'vegetables', label: 'Verdure', icon: '🥦' },
  { key: 'carbs', label: 'Carboidrati', icon: '🍞' },
  { key: 'dairy', label: 'Latticini', icon: '🧀' },
  { key: 'fruits', label: 'Frutta', icon: '🍎' },
  { key: 'fats', label: 'Grassi', icon: '🥑' },
  { key: 'other', label: 'Altro', icon: '🧂' },
]

const CATEGORY_QUICK_ADDONS: Record<
  FoodGroup['category'],
  Array<{ name: string; quantity: number; unit: string; icon: string }>
> = {
  proteins: [
    { name: 'Petto di pollo', quantity: 200, unit: 'g', icon: '🍗' },
    { name: 'Salmone fresco', quantity: 200, unit: 'g', icon: '🐟' },
    { name: 'Uova medie', quantity: 6, unit: 'pz', icon: '🥚' },
    { name: 'Macinato magro', quantity: 250, unit: 'g', icon: '🥩' },
    { name: 'Tonno al naturale', quantity: 160, unit: 'g', icon: '🥫' },
    { name: 'Feta DOP', quantity: 200, unit: 'g', icon: '🧀' },
    { name: 'Ricotta fresca', quantity: 200, unit: 'g', icon: '🥣' },
    { name: 'Lenticchie secche', quantity: 250, unit: 'g', icon: '🍲' },
  ],
  vegetables: [
    { name: 'Zucchine', quantity: 500, unit: 'g', icon: '🥒' },
    { name: 'Pomodorini', quantity: 300, unit: 'g', icon: '🍅' },
    { name: 'Spinaci freschi', quantity: 250, unit: 'g', icon: '🥬' },
    { name: 'Insalata mista', quantity: 150, unit: 'g', icon: '🥗' },
    { name: 'Carote', quantity: 500, unit: 'g', icon: '🥕' },
    { name: 'Peperoni', quantity: 400, unit: 'g', icon: '🫑' },
    { name: 'Finocchi', quantity: 400, unit: 'g', icon: '🧅' },
    { name: 'Broccoli', quantity: 400, unit: 'g', icon: '🥦' },
  ],
  carbs: [
    { name: 'Pasta integrale', quantity: 500, unit: 'g', icon: '🍝' },
    { name: 'Riso Basmati', quantity: 500, unit: 'g', icon: '🍚' },
    { name: 'Fiocchi d\'avena', quantity: 350, unit: 'g', icon: '🥣' },
    { name: 'Pane di segale', quantity: 400, unit: 'g', icon: '🍞' },
    { name: 'Patate', quantity: 1000, unit: 'g', icon: '🥔' },
    { name: 'Gallette di riso', quantity: 120, unit: 'g', icon: '🍘' },
    { name: 'Couscous', quantity: 500, unit: 'g', icon: '🌾' },
    { name: 'Piadina integrale', quantity: 3, unit: 'pz', icon: '🫓' },
  ],
  dairy: [
    { name: 'Yogurt Greco 0%', quantity: 170, unit: 'g', icon: '🥣' },
    { name: 'Feta DOP', quantity: 200, unit: 'g', icon: '🧀' },
    { name: 'Latte scremato', quantity: 1, unit: 'l', icon: '🥛' },
    { name: 'Fiocchi di latte', quantity: 200, unit: 'g', icon: '🥣' },
    { name: 'Mozzarella light', quantity: 125, unit: 'g', icon: '🧀' },
    { name: 'Parmigiano Reggiano', quantity: 100, unit: 'g', icon: '🧀' },
  ],
  fruits: [
    { name: 'Banane', quantity: 500, unit: 'g', icon: '🍌' },
    { name: 'Mele', quantity: 600, unit: 'g', icon: '🍎' },
    { name: 'Mirtilli freschi', quantity: 125, unit: 'g', icon: '🫐' },
    { name: 'Arance', quantity: 1000, unit: 'g', icon: '🍊' },
    { name: 'Kiwi', quantity: 400, unit: 'g', icon: '🥝' },
    { name: 'Fragole', quantity: 250, unit: 'g', icon: '🍓' },
  ],
  fats: [
    { name: 'Olio extravergine d\'oliva', quantity: 1, unit: 'l', icon: '🫒' },
    { name: 'Mandorle sgusciate', quantity: 150, unit: 'g', icon: '🥜' },
    { name: 'Noci sgusciate', quantity: 150, unit: 'g', icon: '🌰' },
    { name: 'Burro d\'arachidi 100%', quantity: 350, unit: 'g', icon: '🥜' },
    { name: 'Avocado Hass', quantity: 2, unit: 'pz', icon: '🥑' },
    { name: 'Semi di chia', quantity: 200, unit: 'g', icon: '🌱' },
  ],
  other: [
    { name: 'Sale fino iodato', quantity: 1, unit: 'conf', icon: '🧂' },
    { name: 'Pepe nero macinato', quantity: 1, unit: 'conf', icon: '🧂' },
    { name: 'Origano secco', quantity: 1, unit: 'conf', icon: '🌿' },
    { name: 'Aglio fresco', quantity: 1, unit: 'conf', icon: '🧄' },
    { name: 'Caffè macinato', quantity: 250, unit: 'g', icon: '☕' },
    { name: 'Lievito istantaneo', quantity: 1, unit: 'conf', icon: '🧁' },
  ],
}

export default function ShoppingPage() {
  const [activeTab, setActiveTab] = useState<'shopping' | 'pantry'>('shopping')
  const [weekStart] = useState(getMonday())

  // Modali
  const [itemForPriceModal, setItemForPriceModal] = useState<ShoppingItem | null>(null)
  const [historicalPriceDetailsForModal, setHistoricalPriceDetailsForModal] = useState<FoodPrice | undefined>(undefined)
  const [itemForQuantityModal, setItemForQuantityModal] = useState<ShoppingItem | null>(null)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Form rapido aggiungi cibo manuale
  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('200')
  const [manualUnit, setManualUnit] = useState('g')
  const [manualCat, setManualCat] = useState<FoodGroup['category']>('proteins')
  const [isAddFormExpanded, setIsAddFormExpanded] = useState(false)

  // Live queries
  const shoppingLists = useLiveQuery(
    async () => {
      try {
        const lists = await db.shoppingLists.toArray()
        return lists.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      } catch (e) {
        console.error('Error fetching shopping lists:', e)
        return []
      }
    },
    []
  )
  const currentList = shoppingLists?.[0]

  const pantryItems = useLiveQuery(
    async () => {
      try {
        const items = await db.pantryItems.toArray()
        return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      } catch (e) {
        console.error('Error fetching pantry items:', e)
        return []
      }
    },
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
      try {
        const endOffset = isWeekendApproach ? 13 : 6
        const endDate = new Date(weekStart)
        endDate.setDate(endDate.getDate() + endOffset)
        const endStr = endDate.toISOString().split('T')[0]

        const meals = await db.plannedMeals
          .where('date')
          .between(weekStart, endStr, true, true)
          .toArray()

        const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean) as string[])]
        if (recipeIds.length === 0) return []

        const recipes = await db.recipes.bulkGet(recipeIds)

        const needed: { name: string; quantity: number; unit: string; category: FoodGroup['category']; week: 'current' | 'next' }[] = []

        for (const meal of meals) {
          if (!meal.recipeId) continue
          const recipe = recipes.find(r => r?.id === meal.recipeId)
          if (!recipe || !recipe.adaptedIngredients) continue

          const isNextWeek = meal.date >= nextWeekStart
          for (const ing of (recipe.adaptedIngredients || [])) {
            if (!ing || !ing.name) continue
            const rawQty = ing.adaptedQuantity ? String(ing.adaptedQuantity) : ''
            const num = parseFloat(rawQty.replace(/[^0-9.]/g, '')) || 100
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
      } catch (err) {
        console.error('Errore calcolo suggerimenti spesa:', err)
        return []
      }
    },
    [weekStart, isWeekendApproach, nextWeekStart]
  ) ?? []

  // Calcolo Totale nel carrello (solo elementi spuntati/depennati!)
  const checkedItems = useMemo(() => {
    return (currentList?.items || []).filter(i => i && i.isChecked)
  }, [currentList])

  const cartTotal = useMemo(() => {
    return checkedItems.reduce((acc, item) => acc + (item.price || 0), 0)
  }, [checkedItems])

  const voucherSplit = useMemo(() => {
    return calculateVoucherSplit(cartTotal, settings?.mealVoucherValue || 8.0)
  }, [cartTotal, settings?.mealVoucherValue])

  // Rilevamento alimenti dalla dispensa da suggerire
  const pantrySuggestions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return (pantryItems || []).filter(item => {
      if (!item) return false
      if (item.isDepleted || (item.quantity ?? 0) <= 0) return true
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
    const existingNames = new Set((currentList?.items || []).map(i => i?.name?.toLowerCase().trim()).filter(Boolean))
    const deduplicated = new Map<string, { name: string; quantity: number; unit: string; category: FoodGroup['category']; week: 'current' | 'next' }>()

    for (const item of (plannedMealsForSuggestions || [])) {
      if (!item || !item.name) continue
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
      // Inserimento nel carrello: recupera dettagli prezzo e quota unitaria memorizzata
      const details = await getFoodPriceDetails(item.name)
      setHistoricalPriceDetailsForModal(details)
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

  const handleConfirmPrice = async (
    price: number,
    updatedQuantity?: number,
    updatedUnit?: string
  ) => {
    if (!currentList || !itemForPriceModal) return

    const finalQty = updatedQuantity !== undefined ? updatedQuantity : itemForPriceModal.quantity
    const finalUnit = updatedUnit !== undefined ? updatedUnit : itemForPriceModal.unit

    // 1. Aggiorna l'articolo nella lista della spesa
    const updated = currentList.items.map(i =>
      i.id === itemForPriceModal.id
        ? { ...i, isChecked: true, price, quantity: finalQty, unit: finalUnit }
        : i
    )
    await db.shoppingLists.update(currentList.id, {
      items: updated,
      updatedAt: new Date(),
    })

    // 2. Memorizza SUBITO il prezzo e il prezzo unitario nel database!
    if (price > 0) {
      await saveFoodPrice(itemForPriceModal.name, price, finalQty, finalUnit)
    }

    setToastMsg(`✅ "${itemForPriceModal.name}" inserito nel carrello (${price.toFixed(2)} €)`)
    setTimeout(() => setToastMsg(''), 2500)
    setItemForPriceModal(null)
  }

  const handleManualQtyStep = (delta: number) => {
    const current = parseFloat(manualQty) || 1
    let stepAmount = delta
    if (manualUnit === 'g' || manualUnit === 'ml') {
      stepAmount = delta * (current >= 200 ? 50 : 25)
    } else if (manualUnit === 'kg' || manualUnit === 'l') {
      stepAmount = delta * 0.5
    } else {
      stepAmount = delta * 1
    }
    const next = Math.max(0.1, Math.round((current + stepAmount) * 10) / 10)
    setManualQty(String(next))
  }

  const handleSaveItemQuantity = async (itemId: string, newQuantity: number, newUnit: string) => {
    if (!currentList) return
    const updated = currentList.items.map(i =>
      i.id === itemId ? { ...i, quantity: newQuantity, unit: newUnit } : i
    )
    await db.shoppingLists.update(currentList.id, {
      items: updated,
      updatedAt: new Date(),
    })
    setToastMsg('✏️ Quantità aggiornata!')
    setTimeout(() => setToastMsg(''), 2500)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!currentList) return
    const targetItem = currentList.items.find(i => i.id === itemId)
    const updated = currentList.items.filter(i => i.id !== itemId)
    await db.shoppingLists.update(currentList.id, {
      items: updated,
      updatedAt: new Date(),
    })
    setToastMsg(`🗑️ "${targetItem?.name || 'Articolo'}" rimosso dalla spesa`)
    setTimeout(() => setToastMsg(''), 2500)
  }

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName.trim() || !currentList) return

    const qty = parseFloat(manualQty) || 1
    const historicalPrice = await getFoodPrice(manualName.trim(), qty, manualUnit)

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

    const historicalPrice = await getFoodPrice(name, quantity, unit)
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

    setToastMsg(`🛒 "${name}" aggiunto alla spesa!`)
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
    if (!list || !list.items) return
    const text = CATEGORY_ORDER
      .filter(cat => list.items.some(i => i && (i.category || 'other') === cat))
      .map(cat => {
        const catItems = list.items.filter(i => i && (i.category || 'other') === cat)
        const header = `\n${(CATEGORY_LABELS[cat] || cat).toUpperCase()}\n${'─'.repeat(20)}`
        const rows = catItems.map(
          i => `${i.isChecked ? '✓' : '☐'} ${i.name} — ${i.quantity}${i.unit || ''}${i.price ? ` (${i.price.toFixed(2)}€)` : ''}`
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

  const groupedItems = (items: ShoppingItem[] = []) => {
    const safeItems = Array.isArray(items) ? items : []
    return CATEGORY_ORDER
      .map(cat => ({
        category: cat,
        items: safeItems.filter(i => i && (i.category || 'other') === cat),
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

      <div className="px-4 pt-3 max-w-lg mx-auto space-y-4 pb-44">
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
            {/* ── SEZIONE INSERIMENTO INGREDIENTE RIDISEGNATA ── */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-sm space-y-3.5 transition-all duration-300">
              {/* 1. Categorie di Cibo in Alto */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Scegli Categoria:
                  </span>
                  <span className="text-[11px] font-extrabold text-primary-600 dark:text-primary-400">
                    {CATEGORY_LABELS[manualCat]}
                  </span>
                </div>

                {/* Barra orizzontale categorie */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                  {CATEGORY_ITEMS.map(({ key, label, icon }) => {
                    const isSelected = manualCat === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setManualCat(key)
                          if (key === 'vegetables' || key === 'proteins' || key === 'carbs') {
                            if (manualUnit === 'pz') setManualUnit('g')
                          }
                        }}
                        className={cn(
                          'py-1.5 px-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs',
                          isSelected
                            ? 'bg-primary-600 text-white shadow-xs ring-2 ring-primary-500/30'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Card Add-on Sotto la Categoria Selezionata */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">
                  Alimenti frequenti in {CATEGORY_LABELS[manualCat]}:
                </p>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {CATEGORY_QUICK_ADDONS[manualCat].map((addon, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setManualName(addon.name)
                        setManualQty(String(addon.quantity))
                        setManualUnit(addon.unit)
                        setIsAddFormExpanded(true)
                      }}
                      className="group flex items-center gap-1.5 py-1.5 pl-2.5 pr-1.5 rounded-2xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700 text-left cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-950/20 transition-all flex-shrink-0 active:scale-95 shadow-2xs"
                      title="Tocca per inserire o premi + per aggiungere subito"
                    >
                      <span className="text-sm">{addon.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">
                          {addon.name}
                        </p>
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                          {addon.quantity}{addon.unit}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddSuggestionToShopping(addon.name, manualCat, addon.quantity, addon.unit)
                        }}
                        className="w-6 h-6 rounded-xl bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs font-black hover:bg-primary-600 hover:text-white transition-colors ml-1 shadow-2xs"
                        title="Aggiungi subito alla lista della spesa"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Form Inserimento con Auto-Espansione, Input text-base (no zoom) e Stepper +/- */}
              <form onSubmit={handleAddManualItem} className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      Nome ingrediente:
                    </label>
                    {isAddFormExpanded && (
                      <button
                        type="button"
                        onClick={() => setIsAddFormExpanded(false)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Comprimi
                      </button>
                    )}
                  </div>
                  {/* Campo di testo con font size >= 16px (text-base) per eliminare lo zoom automatico iOS */}
                  <input
                    type="text"
                    required
                    placeholder="Cosa ti serve? (es. Petto di pollo, Zucchine...)"
                    value={manualName}
                    onFocus={() => setIsAddFormExpanded(true)}
                    onChange={e => setManualName(e.target.value)}
                    className="w-full text-base font-semibold py-2.5 px-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-all shadow-2xs"
                  />
                </div>

                {/* Sezione Espandibile Quantità con Stepper - / + e Unità */}
                <div className="flex items-center gap-2">
                  {/* Stepper Quantità */}
                  <div className="flex-1 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleManualQtyStep(-1)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-extrabold text-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all shadow-2xs border border-gray-200/60 dark:border-gray-600/60"
                      title="Diminuisci quantità"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={manualQty}
                      onChange={e => setManualQty(e.target.value)}
                      className="flex-1 text-base font-black text-center py-1.5 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
                      title="Quantità"
                    />

                    <button
                      type="button"
                      onClick={() => handleManualQtyStep(1)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-extrabold text-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-all shadow-2xs border border-gray-200/60 dark:border-gray-600/60"
                      title="Aumenta quantità"
                    >
                      +
                    </button>
                  </div>

                  {/* Selettore Unità */}
                  <select
                    value={manualUnit}
                    onChange={e => setManualUnit(e.target.value)}
                    className="w-24 h-11 text-xs font-bold bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl px-2 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-2xs"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="pz">pz</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="conf">conf</option>
                  </select>

                  {/* Bottone Aggiungi */}
                  <button
                    type="submit"
                    disabled={!manualName.trim()}
                    className="btn-primary h-11 px-4 text-xs font-black rounded-2xl shadow-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                  >
                    <span>+</span>
                    <span>Aggiungi</span>
                  </button>
                </div>
              </form>
            </div>

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
                      <div className={cn('px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between', CATEGORY_COLORS[category] || CATEGORY_COLORS.other)}>
                        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                          <span>{CATEGORY_ICONS[category] || '🍴'}</span>
                          <span>{CATEGORY_LABELS[category] || category}</span>
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
                              'group flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors',
                              item.isChecked && 'bg-emerald-50/20 dark:bg-emerald-950/15'
                            )}
                          >
                            {/* Checkbox per confermare acquisto o rimuovere dal carrello */}
                            <button
                              type="button"
                              onClick={() => handleItemCheckClick(item)}
                              className="flex items-center justify-center p-1"
                              title={item.isChecked ? 'Rimuovi dal carrello' : 'Spunta e inserisci prezzo'}
                            >
                              <input
                                type="checkbox"
                                checked={item.isChecked}
                                onChange={() => {}} // gestito da handleItemCheckClick
                                className="w-5 h-5 rounded-md border-gray-300 dark:border-gray-700 text-emerald-600 accent-emerald-600 cursor-pointer"
                              />
                            </button>

                            {/* Nome e Ricette collegate (tappabile per confermare prezzo) */}
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => handleItemCheckClick(item)}
                            >
                              <p
                                className={cn(
                                  'text-xs sm:text-sm font-semibold truncate transition-colors',
                                  item.isChecked
                                    ? 'line-through text-gray-400 dark:text-gray-500'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {item.name}
                              </p>
                              {item.recipes.length > 0 && (
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                  {item.recipes.length} {item.recipes.length > 1 ? 'ricette' : 'ricetta'}
                                </p>
                              )}
                            </div>

                            {/* Quantità (modificabile con tap) e Prezzo */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setItemForQuantityModal(item)
                                }}
                                title="Tocca per modificare la quantità o l'unità"
                                className="group px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-left transition-all active:scale-95 flex items-center gap-1 border border-gray-200/60 dark:border-gray-700/60"
                              >
                                <span
                                  className={cn(
                                    'text-xs sm:text-sm font-bold',
                                    item.isChecked
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : 'text-primary-700 dark:text-primary-300'
                                  )}
                                >
                                  {item.quantity}{item.unit}
                                </span>
                                <span className="text-[10px] text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 opacity-60 group-hover:opacity-100">
                                  ✏️
                                </span>
                              </button>

                              {/* Prezzo Effettivo o Stimato */}
                              <div className="text-right min-w-[50px]">
                                {item.isChecked && item.price !== undefined && item.price > 0 && (
                                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 block shadow-2xs">
                                    {item.price.toFixed(2)} €
                                  </span>
                                )}
                                {!item.isChecked && item.estimatedPrice && item.estimatedPrice > 0 && (
                                  <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 block">
                                    ~{item.estimatedPrice.toFixed(2)} €
                                  </span>
                                )}
                              </div>

                              {/* Pulsante Eliminazione Diretta Articolo */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteItem(item.id)
                                }}
                                title="Rimuovi questo ingrediente dalla lista della spesa"
                                className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-rose-50 dark:bg-gray-800/60 dark:hover:bg-rose-950/60 text-gray-400 hover:text-rose-600 dark:text-gray-500 dark:hover:text-rose-400 flex items-center justify-center text-sm transition-all active:scale-90 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 flex-shrink-0"
                              >
                                🗑️
                              </button>
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

      {/* ── BARRA FLUTTUANTE CHECKOUT (Posizionata rigorosamente sopra la BottomNav e la safe area) ── */}
      {activeTab === 'shopping' && checkedItems.length > 0 && (
        <div className="fixed bottom-[calc(4.75rem+max(0.75rem,env(safe-area-inset-bottom,0px)))] left-0 right-0 p-3 z-40 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-between shadow-2xl transition-all active:scale-[0.99] border border-emerald-500/40"
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
      <ItemQuantityModal
        isOpen={Boolean(itemForQuantityModal)}
        item={itemForQuantityModal}
        onSave={handleSaveItemQuantity}
        onDelete={handleDeleteItem}
        onClose={() => setItemForQuantityModal(null)}
      />

      <PriceConfirmModal
        isOpen={Boolean(itemForPriceModal)}
        item={itemForPriceModal}
        foodPriceDetails={historicalPriceDetailsForModal}
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
