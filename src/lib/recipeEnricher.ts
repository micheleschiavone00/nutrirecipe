import type { Recipe, RecipeIngredient, RecipeStep } from '@/types'
import { db, getActiveProfile } from './db'
import {
  adaptIngredientsDeterministically,
  generateVariantsDeterministically,
  calculateNutritionalValues,
  detectDishType,
} from './deterministicRecipeAdapter'

/**
 * Normalizes food names for fuzzy matching in step descriptions.
 * e.g., "olio extravergine d'oliva" -> matches "olio", "olio evo", "olio extravergine"
 */
function getMatchKeywords(name: string): string[] {
  const clean = name.toLowerCase().trim()
  const words = clean
    .split(/[\s,()\/]+/)
    .map(w => w.replace(/[^\wàèéìòù]/gi, ''))
    .filter(w => w.length > 2)

  const keywords = new Set<string>()
  keywords.add(clean)

  // Add specific synonyms or stems
  if (clean.includes('uov') || clean.includes('uovo') || clean.includes('uova')) {
    keywords.add('uova')
    keywords.add('uovo')
    keywords.add('albume')
    keywords.add('albumi')
  }
  if (clean.includes('olio')) {
    keywords.add('olio')
    keywords.add('olio evo')
    keywords.add('olio extravergine')
  }
  if (clean.includes('feta')) {
    keywords.add('feta')
  }
  if (clean.includes('zucch')) {
    keywords.add('zucchine')
    keywords.add('zucchina')
    keywords.add('zucchine grattugiate')
  }
  if (clean.includes('avena')) {
    keywords.add('avena')
    keywords.add('fiocchi d\'avena')
    keywords.add('farina d\'avena')
  }
  if (clean.includes('pollo')) {
    keywords.add('pollo')
    keywords.add('petto di pollo')
  }
  if (clean.includes('tonno')) {
    keywords.add('tonno')
  }
  if (clean.includes('riso')) {
    keywords.add('riso')
  }
  if (clean.includes('pasta')) {
    keywords.add('pasta')
  }
  if (clean.includes('yogurt')) {
    keywords.add('yogurt')
  }
  if (clean.includes('ricotta')) {
    keywords.add('ricotta')
  }

  // Add significant individual words
  for (const w of words) {
    if (!['con', 'del', 'della', 'delle', 'dei', 'degli', 'per', 'senza', 'tipo', 'fresco', 'fresca'].includes(w)) {
      keywords.add(w)
    }
  }

  // Sort descending by length so longer phrases match first
  return Array.from(keywords).sort((a, b) => b.length - a.length)
}

/**
 * Enriches a single step's text with ingredient doses if missing.
 */
export function enrichStepWithDoses(
  stepDescription: string,
  ingredients: RecipeIngredient[]
): { text: string; changed: boolean } {
  let updated = stepDescription
  let changed = false

  for (const ing of ingredients) {
    if (!ing.adaptedQuantity || !ing.name) continue

    const qtyString = `(${ing.adaptedQuantity})`
    // If the step already has this exact dose or similar, skip
    if (updated.includes(qtyString)) continue

    const keywords = getMatchKeywords(ing.name)

    for (const kw of keywords) {
      if (!kw || kw.length < 3) continue

      // Regex matching keyword, not preceded by already formatted bracket
      // and not immediately followed by '('
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b(${escaped})\\b(?!\\s*\\()`, 'i')

      if (regex.test(updated)) {
        updated = updated.replace(regex, `$1 ${qtyString}`)
        changed = true
        break // matched this ingredient, move to next
      }
    }
  }

  return { text: updated, changed }
}

/**
 * Normalizes vague vegetable quantities into exact grams and splits multi-vegetables equitably.
 * E.g., if there are 2 vegetables, splits 200g into 100g each.
 */
export function normalizeVegetables(
  ingredients: RecipeIngredient[],
  totalVegQuota = 200
): { ingredients: RecipeIngredient[]; changed: boolean } {
  const vegIndices = ingredients
    .map((ing, i) => (ing.category === 'vegetables' ? i : -1))
    .filter(i => i !== -1)

  if (vegIndices.length === 0) return { ingredients, changed: false }

  let changed = false
  const quotaPerVeg = Math.round(totalVegQuota / vegIndices.length)

  const updatedIngredients = ingredients.map((ing) => {
    if (ing.category !== 'vegetables') return ing

    // Check if vague unit or pieces
    const isVague =
      ing.unit === 'pieces' ||
      ing.unit === 'portions' ||
      /\b(?:pezzo|pezzi|zucchina|zucchine|carota|carote|pomodoro|pomodori)\b/i.test(ing.adaptedQuantity)

    if (isVague) {
      changed = true
      return {
        ...ing,
        adaptedQuantity: `${quotaPerVeg}g`,
        unit: 'g',
      }
    }
    return ing
  })

  return { ingredients: updatedIngredients, changed }
}

/**
 * Checks and enriches all steps of a recipe with adapted ingredient doses
 * and normalizes vegetables to exact grams.
 */
export function enrichRecipeStepsWithDoses(recipe: Recipe): { recipe: Recipe; changed: boolean } {
  if (!recipe.steps || recipe.steps.length === 0 || !recipe.adaptedIngredients || recipe.adaptedIngredients.length === 0) {
    return { recipe, changed: false }
  }

  let anyChange = false

  // 1. Normalize vegetables if vague
  const { ingredients: normalizedIngs, changed: vegChanged } = normalizeVegetables(recipe.adaptedIngredients)
  if (vegChanged) {
    anyChange = true
  }

  // 2. Enrich steps with doses
  const updatedSteps: RecipeStep[] = recipe.steps.map(step => {
    const { text, changed } = enrichStepWithDoses(step.description, normalizedIngs)
    if (changed) {
      anyChange = true
      return { ...step, description: text }
    }
    return step
  })

  if (!anyChange) {
    return { recipe, changed: false }
  }

  return {
    recipe: {
      ...recipe,
      adaptedIngredients: normalizedIngs,
      steps: updatedSteps,
      updatedAt: new Date(),
    },
    changed: true,
  }
}

/**
 * Migrates all recipes in IndexedDB, updating their steps with doses.
 * Safe and idempotent: will only update recipes where doses were actually added.
 */
export async function migrateAllRecipesSteps(): Promise<{ total: number; updated: number }> {
  try {
    const allRecipes = await db.recipes.toArray()
    let updatedCount = 0

    for (const r of allRecipes) {
      const { recipe: enriched, changed } = enrichRecipeStepsWithDoses(r)
      if (changed) {
        await db.recipes.put(enriched)
        updatedCount++
      }
    }

    // Mark migration as completed in localStorage
    localStorage.setItem('nutrirecipe_steps_migrated_v1.2.0', 'true')
    return { total: allRecipes.length, updated: updatedCount }
  } catch (error) {
    console.error('Error migrating recipe steps:', error)
    return { total: 0, updated: 0 }
  }
}

/**
 * Re-adapts a single recipe deterministically against a nutrition profile:
 * - Recalculates adaptedIngredients (proteins, legumes, eggs, cheese 50/50, veggies, carbs, fats)
 * - Identifies dishType ('side' | 'complete' | 'main')
 * - Generates Lunch, Dinner, Dinner Post-Workout variants if applicable
 * - Recalculates exact nutritional values (eliminates exaggerated fats)
 * - Enriches step text with annotated doses
 */
export async function reAdaptSingleRecipe(
  recipe: Recipe,
  profileOverride?: any
): Promise<Recipe> {
  const profile = profileOverride || (await getActiveProfile())
  const rawIngredients =
    recipe.originalIngredients && recipe.originalIngredients.length > 0
      ? recipe.originalIngredients
      : recipe.adaptedIngredients

  const applicableMeal =
    profile?.meals?.find(
      (m: any) =>
        m.mealType === recipe.targetMeal ||
        (recipe.targetMeal === 'lunch_dinner' && (m.mealType === 'lunch' || m.mealType === 'dinner'))
    ) || profile?.meals?.[0]

  // 1. Re-adapt base ingredients
  const adaptedIngredients = adaptIngredientsDeterministically(rawIngredients, applicableMeal)

  // 2. Dish type
  const dishType = detectDishType(rawIngredients)

  // 3. Multi-meal variants
  const variants = generateVariantsDeterministically(
    profile,
    rawIngredients,
    recipe.steps,
    recipe.targetMeal
  )

  // 4. Nutritional values
  const nutritionalValues = calculateNutritionalValues(adaptedIngredients)

  // 5. Enrich steps with doses
  const { recipe: enriched } = enrichRecipeStepsWithDoses({
    ...recipe,
    dishType,
    adaptedIngredients,
    variants,
    nutritionalValues,
    updatedAt: new Date(),
  })

  return enriched
}

export interface ReAdaptProgress {
  current: number
  total: number
  title: string
  percent: number
}

/**
 * Re-adapts ALL recipes in the database against the user's active nutrition plan.
 * Provides a granular real-time progress callback.
 */
export async function reAdaptAllRecipes(
  onProgress?: (progress: ReAdaptProgress) => void
): Promise<{ total: number; updated: number }> {
  try {
    const allRecipes = await db.recipes.toArray()
    const profile = await getActiveProfile()
    let updatedCount = 0
    const total = allRecipes.length

    if (total === 0) {
      return { total: 0, updated: 0 }
    }

    for (let i = 0; i < total; i++) {
      const r = allRecipes[i]

      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          title: r.title,
          percent: Math.round(((i + 1) / total) * 100),
        })
      }

      const updated = await reAdaptSingleRecipe(r, profile)
      await db.recipes.put(updated)
      updatedCount++

      // Smooth UI rendering pause
      await new Promise(res => setTimeout(res, 80))
    }

    return { total, updated: updatedCount }
  } catch (error) {
    console.error('Error re-adapting all recipes:', error)
    return { total: 0, updated: 0 }
  }
}
