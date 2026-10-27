import type {
  Recipe,
  NutritionProfile,
  MealPlan,
  RecipeMealVariant,
  RecipeIngredient,
  RecipeStep,
  NutritionalValues,
  TargetMealType,
} from '@/types'
import { adaptIngredientsDeterministically } from './deterministicRecipeAdapter'

/**
 * Returns all profile meals matching a given targetMeal.
 * E.g. for 'lunch_dinner': returns all lunch meals and all dinner meals (including variants like "Cena Post Workout").
 * E.g. for 'dinner': returns all dinner meals (standard dinner + "Cena Post Workout").
 */
export function getApplicableMealsForTarget(
  profile: NutritionProfile | undefined | null,
  targetMeal: TargetMealType
): MealPlan[] {
  if (!profile || !profile.meals || profile.meals.length === 0) return []

  if (targetMeal === 'lunch_dinner') {
    // Both lunch and dinner (and all their respective variants)
    return profile.meals.filter(m => m.mealType === 'lunch' || m.mealType === 'dinner')
  }

  return profile.meals.filter(m => m.mealType === targetMeal)
}

/**
 * Extracts numeric grams from a quantity string like "150g", "200 g", "100g (adattato)".
 */
function extractGrams(qtyStr: string): number | null {
  if (!qtyStr) return null
  const m = qtyStr.match(/(\d+(?:[.,]\d+)?)\s*(?:g|ml)?/i)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

/**
 * Computes estimated macros based on ingredients and quantities.
 */
export function estimateVariantMacros(
  ingredients: RecipeIngredient[],
  baseMacros?: NutritionalValues
): NutritionalValues {
  let calories = 0
  let proteins = 0
  let carbs = 0
  let fats = 0

  for (const ing of ingredients) {
    const g = extractGrams(ing.adaptedQuantity) ?? extractGrams(ing.originalQuantity) ?? 50
    switch (ing.category) {
      case 'proteins':
        // ~22g protein, 3g fat, 120 kcal per 100g average
        proteins += (g * 22) / 100
        fats += (g * 3) / 100
        calories += (g * 125) / 100
        break
      case 'carbs':
        // ~70g carbs, 8g protein, 350 kcal per 100g average
        carbs += (g * 70) / 100
        proteins += (g * 8) / 100
        calories += (g * 340) / 100
        break
      case 'fats':
        // ~90g fat, 820 kcal per 100g average
        fats += (g * 90) / 100
        calories += (g * 820) / 100
        break
      case 'dairy':
        // ~10g protein, 5g carbs, 4g fat, 100 kcal per 100g
        proteins += (g * 10) / 100
        carbs += (g * 5) / 100
        fats += (g * 4) / 100
        calories += (g * 95) / 100
        break
      case 'vegetables':
        // ~2g protein, 4g carbs, 25 kcal per 100g
        carbs += (g * 4) / 100
        calories += (g * 25) / 100
        break
      case 'fruits':
        // ~12g carbs, 50 kcal per 100g
        carbs += (g * 12) / 100
        calories += (g * 50) / 100
        break
      default:
        calories += (g * 40) / 100
        break
    }
  }

  // If baseMacros exists and is realistic, blend/normalize to maintain realistic scale
  if (baseMacros && baseMacros.calories > 100) {
    return {
      calories: Math.round(calories > 50 ? calories : baseMacros.calories),
      proteins: Math.round(proteins > 5 ? proteins : baseMacros.proteins),
      carbs: Math.round(carbs >= 0 ? carbs : baseMacros.carbs),
      fats: Math.round(fats > 0 ? fats : baseMacros.fats),
    }
  }

  return {
    calories: Math.round(calories),
    proteins: Math.round(proteins),
    carbs: Math.round(carbs),
    fats: Math.round(fats),
  }
}

/**
 * Scales a list of ingredients according to a specific profile meal (e.g. Lunch vs Dinner vs Post Workout).
 * Uses clinical deterministic adapter so that specific meal targets
 * (e.g. 250g salmon for Cena Post Workout, 50g feta, 70g couscous) are accurately honored
 * instead of arbitrary averages.
 */
export function scaleIngredientsForMeal(
  baseIngredients: RecipeIngredient[],
  targetMealPlan: MealPlan,
  referenceMealPlan?: MealPlan
): RecipeIngredient[] {
  return adaptIngredientsDeterministically(
    baseIngredients.map(ing => ({
      name: ing.name,
      category: ing.category,
      originalQuantity: ing.originalQuantity || ing.adaptedQuantity,
      unit: ing.unit,
      component: ing.component,
      isOptional: ing.isOptional,
    })),
    targetMealPlan
  )
}

/**
 * Replaces old dose parentheticals in step descriptions with newly adapted quantities.
 */
export function scaleStepsForVariant(
  baseSteps: RecipeStep[],
  variantIngredients: RecipeIngredient[]
): RecipeStep[] {
  return baseSteps.map(step => {
    let desc = step.description

    for (const ing of variantIngredients) {
      if (!ing.name || !ing.adaptedQuantity) continue
      // Match something like "ing.name (150g)" or "ing.name (200 g)"
      const regex = new RegExp(`(${ing.name}[^()]*?)\\(\\s*\\d+[a-zA-Z%\\s.,]*?\\)`, 'gi')
      if (regex.test(desc)) {
        desc = desc.replace(regex, `$1(${ing.adaptedQuantity})`)
      }
    }

    return {
      ...step,
      description: desc,
    }
  })
}

/**
 * Ensures a recipe has valid `variants` populated.
 * If already stored in `recipe.variants`, returns them.
 * Otherwise, generates the variants from the recipe and active profile.
 */
export function getRecipeVariants(
  recipe: Recipe,
  profile?: NutritionProfile | null
): RecipeMealVariant[] {
  // If recipe already has explicit variants, return them
  if (recipe.variants && recipe.variants.length > 0) {
    return recipe.variants
  }

  // Derive variants based on targetMeal and profile
  const applicableMeals = getApplicableMealsForTarget(profile, recipe.targetMeal)

  // If no applicable profile meals found, fallback to targetMeal check
  if (applicableMeals.length <= 1 && recipe.targetMeal !== 'lunch_dinner') {
    return [
      {
        id: recipe.targetMeal,
        label: recipe.targetMeal === 'dinner' ? '🌙 Cena' : recipe.targetMeal === 'lunch' ? '☀️ Pranzo' : '🍽️ Porzione Standard',
        mealType: recipe.targetMeal,
        adaptedIngredients: recipe.adaptedIngredients,
        steps: recipe.steps,
        nutritionalValues: recipe.nutritionalValues,
        adaptationNotes: recipe.adaptationNotes,
      },
    ]
  }

  // Multiple meals applicable (e.g. Lunch & Dinner, or Dinner & Dinner Post Workout)
  const variants: RecipeMealVariant[] = []

  if (recipe.targetMeal === 'lunch_dinner') {
    // 1. Lunch Variant
    const lunchMeal = applicableMeals.find(m => m.mealType === 'lunch' && !m.isVariant) || applicableMeals.find(m => m.mealType === 'lunch')
    const lunchIngredients = lunchMeal
      ? scaleIngredientsForMeal(recipe.adaptedIngredients, lunchMeal)
      : recipe.adaptedIngredients
    const lunchSteps = scaleStepsForVariant(recipe.steps, lunchIngredients)
    const lunchMacros = estimateVariantMacros(lunchIngredients, recipe.nutritionalValues)

    variants.push({
      id: 'lunch',
      label: '☀️ Pranzo',
      mealType: 'lunch',
      isVariant: false,
      adaptedIngredients: lunchIngredients,
      steps: lunchSteps,
      nutritionalValues: lunchMacros,
      adaptationNotes: 'Grammature calibrate per il pranzo (quota equilibrata di carboidrati e proteine).',
    })

    // 2. Dinner Variant (Standard)
    const dinnerMeal = applicableMeals.find(m => m.mealType === 'dinner' && !m.isVariant) || applicableMeals.find(m => m.mealType === 'dinner')
    const dinnerIngredients = dinnerMeal
      ? scaleIngredientsForMeal(recipe.adaptedIngredients, dinnerMeal, lunchMeal)
      : recipe.adaptedIngredients.map(ing => {
          // Typical dinner adjustment if no specific profile: slightly fewer carbs, more protein/veggies
          if (ing.category === 'carbs') {
            const g = extractGrams(ing.adaptedQuantity)
            if (g && g > 40) return { ...ing, adaptedQuantity: `${Math.round(g * 0.65)}g` }
          }
          if (ing.category === 'proteins') {
            const g = extractGrams(ing.adaptedQuantity)
            if (g) return { ...ing, adaptedQuantity: `${Math.round(g * 1.15)}g` }
          }
          return { ...ing }
        })
    const dinnerSteps = scaleStepsForVariant(recipe.steps, dinnerIngredients)
    const dinnerMacros = estimateVariantMacros(dinnerIngredients, recipe.nutritionalValues)

    variants.push({
      id: 'dinner',
      label: '🌙 Cena',
      mealType: 'dinner',
      isVariant: false,
      adaptedIngredients: dinnerIngredients,
      steps: dinnerSteps,
      nutritionalValues: dinnerMacros,
      adaptationNotes: 'Grammature calibrate per la cena.',
    })

    // 3. Any Dinner Variants from Profile (e.g. Cena Post Workout)
    const dinnerVariants = applicableMeals.filter(m => m.mealType === 'dinner' && m.isVariant)
    for (const dVar of dinnerVariants) {
      const varIngredients = scaleIngredientsForMeal(recipe.adaptedIngredients, dVar, dinnerMeal)
      const varSteps = scaleStepsForVariant(recipe.steps, varIngredients)
      const varMacros = estimateVariantMacros(varIngredients, recipe.nutritionalValues)

      variants.push({
        id: dVar.id || `dinner_var_${dVar.label.toLowerCase().replace(/\s+/g, '_')}`,
        label: `💪 ${dVar.label}`,
        mealType: 'dinner',
        isVariant: true,
        adaptedIngredients: varIngredients,
        steps: varSteps,
        nutritionalValues: varMacros,
        adaptationNotes: dVar.notes || `Grammature calibrate specificamente per ${dVar.label}.`,
      })
    }

    // 4. Any Lunch Variants from Profile
    const lunchVariants = applicableMeals.filter(m => m.mealType === 'lunch' && m.isVariant)
    for (const lVar of lunchVariants) {
      const varIngredients = scaleIngredientsForMeal(recipe.adaptedIngredients, lVar, lunchMeal)
      const varSteps = scaleStepsForVariant(recipe.steps, varIngredients)
      const varMacros = estimateVariantMacros(varIngredients, recipe.nutritionalValues)

      variants.push({
        id: lVar.id || `lunch_var_${lVar.label.toLowerCase().replace(/\s+/g, '_')}`,
        label: `☀️ ${lVar.label}`,
        mealType: 'lunch',
        isVariant: true,
        adaptedIngredients: varIngredients,
        steps: varSteps,
        nutritionalValues: varMacros,
        adaptationNotes: lVar.notes || `Grammature calibrate per ${lVar.label}.`,
      })
    }
  } else if (recipe.targetMeal === 'dinner') {
    // Standard Dinner
    const dinnerMeal = applicableMeals.find(m => !m.isVariant) || applicableMeals[0]
    variants.push({
      id: 'dinner',
      label: '🌙 Cena',
      mealType: 'dinner',
      isVariant: false,
      adaptedIngredients: recipe.adaptedIngredients,
      steps: recipe.steps,
      nutritionalValues: recipe.nutritionalValues,
      adaptationNotes: recipe.adaptationNotes,
    })

    // Dinner variants from profile (e.g. Cena Post Workout)
    const otherMeals = applicableMeals.filter(m => m.id !== dinnerMeal?.id || m.isVariant)
    for (const extra of otherMeals) {
      const extraIngredients = scaleIngredientsForMeal(recipe.adaptedIngredients, extra, dinnerMeal)
      const extraSteps = scaleStepsForVariant(recipe.steps, extraIngredients)
      const extraMacros = estimateVariantMacros(extraIngredients, recipe.nutritionalValues)

      variants.push({
        id: extra.id || `dinner_${extra.label.toLowerCase().replace(/\s+/g, '_')}`,
        label: extra.label.includes('🌙') || extra.label.includes('💪') ? extra.label : `💪 ${extra.label}`,
        mealType: 'dinner',
        isVariant: true,
        adaptedIngredients: extraIngredients,
        steps: extraSteps,
        nutritionalValues: extraMacros,
        adaptationNotes: extra.notes || `Calibrato per ${extra.label} (quota proteica/energetica specifica).`,
      })
    }
  } else if (recipe.targetMeal === 'lunch') {
    // Standard Lunch
    const lunchMeal = applicableMeals.find(m => !m.isVariant) || applicableMeals[0]
    variants.push({
      id: 'lunch',
      label: '☀️ Pranzo',
      mealType: 'lunch',
      isVariant: false,
      adaptedIngredients: recipe.adaptedIngredients,
      steps: recipe.steps,
      nutritionalValues: recipe.nutritionalValues,
      adaptationNotes: recipe.adaptationNotes,
    })

    // Lunch variants from profile
    const otherMeals = applicableMeals.filter(m => m.id !== lunchMeal?.id || m.isVariant)
    for (const extra of otherMeals) {
      const extraIngredients = scaleIngredientsForMeal(recipe.adaptedIngredients, extra, lunchMeal)
      const extraSteps = scaleStepsForVariant(recipe.steps, extraIngredients)
      const extraMacros = estimateVariantMacros(extraIngredients, recipe.nutritionalValues)

      variants.push({
        id: extra.id || `lunch_${extra.label.toLowerCase().replace(/\s+/g, '_')}`,
        label: extra.label.includes('☀️') ? extra.label : `☀️ ${extra.label}`,
        mealType: 'lunch',
        isVariant: true,
        adaptedIngredients: extraIngredients,
        steps: extraSteps,
        nutritionalValues: extraMacros,
        adaptationNotes: extra.notes || `Calibrato per ${extra.label}.`,
      })
    }
  }

  return variants.length > 0
    ? variants
    : [
        {
          id: 'standard',
          label: '🍽️ Porzione Standard',
          mealType: 'lunch',
          adaptedIngredients: recipe.adaptedIngredients,
          steps: recipe.steps,
          nutritionalValues: recipe.nutritionalValues,
          adaptationNotes: recipe.adaptationNotes,
        },
      ]
}
