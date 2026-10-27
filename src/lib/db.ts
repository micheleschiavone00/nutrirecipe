import Dexie, { type Table } from 'dexie'
import type {
  NutritionProfile,
  Recipe,
  PlannedMeal,
  ShoppingList,
  ShoppingItem,
  AppSettings,
  ImportJob,
  WeeklyTemplate,
  PantryItem,
  FoodPrice,
} from '@/types'
import { generateId } from '@/lib/utils'

export class NutriRecipeDB extends Dexie {
  profiles!: Table<NutritionProfile>
  recipes!: Table<Recipe>
  plannedMeals!: Table<PlannedMeal>
  shoppingLists!: Table<ShoppingList>
  settings!: Table<AppSettings & { id: 1 }>
  importJobs!: Table<ImportJob>
  weeklyTemplates!: Table<WeeklyTemplate>
  pantryItems!: Table<PantryItem>
  foodPrices!: Table<FoodPrice>

  constructor() {
    super('NutriRecipeDB')
    this.version(1).stores({
      profiles: 'id, name, createdAt',
      recipes: 'id, targetMeal, source, isFavorite, createdAt, *tags',
      plannedMeals: 'id, date, mealType, recipeId',
      shoppingLists: 'id, weekStart',
      settings: 'id',
      importJobs: 'id, status, createdAt',
    })
    this.version(2).stores({
      weeklyTemplates: 'id, name, createdAt',
    })
    this.version(3).stores({
      pantryItems: 'id, name, category, expiryDate, purchaseDate, isDepleted',
      foodPrices: 'name, updatedAt',
    })
  }
}

export const db = new NutriRecipeDB()

// ─── Settings helpers ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const s = await db.settings.get(1)
  return s ?? {
    openAIApiKey: '',
    rapidApiKey: '',
    language: 'it',
    theme: 'system',
    mealVoucherEnabled: false,
    mealVoucherValue: 8.00,
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...settings, id: 1 })
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export async function getActiveProfile(): Promise<NutritionProfile | undefined> {
  const settings = await getSettings()
  if (!settings.activeProfileId) return undefined
  return db.profiles.get(settings.activeProfileId)
}

// ─── Food Prices & Meal Vouchers ──────────────────────────────────────────────

export async function saveFoodPrice(name: string, price: number, unit?: string): Promise<void> {
  const clean = name.toLowerCase().trim()
  if (!clean || price <= 0) return
  await db.foodPrices.put({
    name: clean,
    lastPrice: Math.round(price * 100) / 100,
    unit,
    updatedAt: new Date(),
  })
}

export async function getFoodPrice(name: string): Promise<number | undefined> {
  const clean = name.toLowerCase().trim()
  const found = await db.foodPrices.get(clean)
  return found?.lastPrice
}

export function calculateVoucherSplit(
  totalEuros: number,
  voucherValue: number
): { count: number; remainder: number; label: string } {
  if (voucherValue <= 0 || totalEuros <= 0) {
    return { count: 0, remainder: totalEuros, label: `${totalEuros.toFixed(2)} €` }
  }

  const count = Math.floor(totalEuros / voucherValue)
  const remainder = Math.round((totalEuros - count * voucherValue) * 100) / 100

  let label = ''
  if (count > 0 && remainder === 0) {
    label = `${count} BP`
  } else if (count > 0 && remainder > 0) {
    label = `${count} BP + ${remainder.toFixed(2)} €`
  } else {
    label = `${totalEuros.toFixed(2)} €`
  }

  return { count, remainder, label }
}

// ─── Expiry Estimator Helper ──────────────────────────────────────────────────

export function estimateExpiryDate(foodName: string, category: string): string {
  const lower = foodName.toLowerCase()
  const now = new Date()
  let daysToAdd = 7

  if (category === 'proteins') {
    if (lower.includes('pesce') || lower.includes('salmone') || lower.includes('merluzzo') || lower.includes('tonno')) {
      daysToAdd = 2 // Pesce fresco
    } else if (lower.includes('pollo') || lower.includes('carne') || lower.includes('macinato')) {
      daysToAdd = 3 // Carne fresca
    } else if (lower.includes('uov')) {
      daysToAdd = 18 // Uova
    } else if (lower.includes('legum') || lower.includes('ceci') || lower.includes('lenticchie')) {
      daysToAdd = 180 // Legumi secchi o barattolo
    } else {
      daysToAdd = 4
    }
  } else if (category === 'dairy') {
    if (lower.includes('latte') || lower.includes('ricotta') || lower.includes('mozzarella')) {
      daysToAdd = 6
    } else if (lower.includes('feta') || lower.includes('parmigiano') || lower.includes('grana')) {
      daysToAdd = 25
    } else {
      daysToAdd = 10
    }
  } else if (category === 'vegetables') {
    daysToAdd = 6
  } else if (category === 'fruits') {
    daysToAdd = 5
  } else if (category === 'carbs') {
    if (lower.includes('pane')) {
      daysToAdd = 4
    } else {
      daysToAdd = 120 // Pasta, riso, avena
    }
  } else if (category === 'fats') {
    daysToAdd = 365 // Olio
  }

  now.setDate(now.getDate() + daysToAdd)
  return now.toISOString().split('T')[0]
}

// ─── Pantry Helpers ───────────────────────────────────────────────────────────

export async function addPantryItem(
  item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PantryItem> {
  const full: PantryItem = {
    ...item,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.pantryItems.put(full)
  return full
}

export async function updatePantryItem(id: string, updates: Partial<PantryItem>): Promise<void> {
  await db.pantryItems.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deletePantryItem(id: string): Promise<void> {
  await db.pantryItems.delete(id)
}

// ─── Checkout Shopping List ───────────────────────────────────────────────────

export async function checkoutShoppingList(
  listId: string,
  checkedItems: ShoppingItem[]
): Promise<{ addedToPantryCount: number }> {
  const today = new Date().toISOString().split('T')[0]

  for (const item of checkedItems) {
    // 1. Memorizza il prezzo per il futuro
    if (item.price && item.price > 0) {
      await saveFoodPrice(item.name, item.price, item.unit)
    }

    // 2. Crea elemento in dispensa
    const expiry = estimateExpiryDate(item.name, item.category)
    await addPantryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      purchaseDate: today,
      expiryDate: expiry,
      pricePaid: item.price,
      isDepleted: false,
    })
  }

  // 3. Rimuovi gli elementi acquistati dalla lista della spesa corrente
  const list = await db.shoppingLists.get(listId)
  if (list) {
    const checkedIds = new Set(checkedItems.map(i => i.id))
    const remainingItems = list.items.filter(i => !checkedIds.has(i.id))
    await db.shoppingLists.update(listId, {
      items: remainingItems,
      updatedAt: new Date(),
    })
  }

  return { addedToPantryCount: checkedItems.length }
}

// ─── Shopping list helpers ────────────────────────────────────────────────────

export async function generateShoppingList(weekStart: string, includeNextWeek = false): Promise<ShoppingList> {
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + (includeNextWeek ? 13 : 6))

  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)

  const plannedMeals = await db.plannedMeals
    .where('date')
    .between(startStr, endStr, true, true)
    .toArray()

  const recipeIds = [...new Set(plannedMeals.map(m => m.recipeId).filter(Boolean) as string[])]
  const recipes = await db.recipes.bulkGet(recipeIds)

  const itemMap = new Map<string, { qty: number; unit: string; category: string; recipeIds: string[] }>()

  for (const recipe of recipes) {
    if (!recipe) continue
    for (const ing of recipe.adaptedIngredients) {
      const key = ing.name.toLowerCase().trim()
      const qty = parseFloat(ing.adaptedQuantity.replace(/[^0-9.]/g, '')) || 0
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!
        existing.qty += qty
        if (!existing.recipeIds.includes(recipe.id)) {
          existing.recipeIds.push(recipe.id)
        }
      } else {
        itemMap.set(key, {
          qty,
          unit: ing.unit || 'g',
          category: ing.category,
          recipeIds: [recipe.id],
        })
      }
    }
  }

  // Recupera i prezzi memorizzati per ogni ingrediente
  const items: ShoppingItem[] = []
  let index = 0

  for (const [name, data] of itemMap.entries()) {
    const historicalPrice = await getFoodPrice(name)
    items.push({
      id: `item-${index++}-${Date.now()}`,
      name,
      quantity: Math.ceil(data.qty) || 1,
      unit: data.unit,
      category: data.category as ShoppingList['items'][number]['category'],
      recipes: data.recipeIds,
      isChecked: false,
      estimatedPrice: historicalPrice,
    })
  }

  const list: ShoppingList = {
    id: `sl-${weekStart}-${Date.now()}`,
    weekStart,
    items,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.shoppingLists.put(list)
  return list
}
