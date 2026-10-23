import Dexie, { type Table } from 'dexie'
import type {
  NutritionProfile,
  Recipe,
  PlannedMeal,
  ShoppingList,
  AppSettings,
  ImportJob,
} from '@/types'

export class NutriRecipeDB extends Dexie {
  profiles!: Table<NutritionProfile>
  recipes!: Table<Recipe>
  plannedMeals!: Table<PlannedMeal>
  shoppingLists!: Table<ShoppingList>
  settings!: Table<AppSettings & { id: 1 }>
  importJobs!: Table<ImportJob>

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

// ─── Shopping list helpers ────────────────────────────────────────────────────

export async function generateShoppingList(weekStart: string): Promise<ShoppingList> {
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart)
  endDate.setDate(endDate.getDate() + 6)

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
      const key = ing.name.toLowerCase()
      const qty = parseFloat(ing.adaptedQuantity) || 0
      if (itemMap.has(key)) {
        const existing = itemMap.get(key)!
        existing.qty += qty
        existing.recipeIds.push(recipe.id)
      } else {
        itemMap.set(key, {
          qty,
          unit: ing.unit,
          category: ing.category,
          recipeIds: [recipe.id],
        })
      }
    }
  }

  const items = Array.from(itemMap.entries()).map(([name, data], i) => ({
    id: `item-${i}-${Date.now()}`,
    name,
    quantity: Math.ceil(data.qty),
    unit: data.unit,
    category: data.category as ShoppingList['items'][number]['category'],
    recipes: data.recipeIds,
    isChecked: false,
  }))

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
