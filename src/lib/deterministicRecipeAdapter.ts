import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  NutritionalValues,
  NutritionProfile,
  MealPlan,
  TargetMealType,
  RecipeMealVariant,
  DishType,
} from '@/types'

// ─── Classification Dictionaries ──────────────────────────────────────────────

const PROTEIN_KEYWORDS = [
  'pollo', 'tacchino', 'coniglio', 'manzo', 'vitello', 'maiale', 'bistecca',
  'macinato', 'hamburger', 'straccetti', 'lonza', 'speck', 'bresaola',
  'prosciutto', 'salmone', 'tonno', 'merluzzo', 'orata', 'spigola', 'pesce',
  'pescespada', 'gamberi', 'gamberetti', 'calamari', 'polpo', 'trota', 'sarde',
  'alici', 'platessa', 'nasello', 'baccalà', 'uova', 'uovo', 'albume',
  'tofu', 'tempeh', 'soia', 'lupini', 'edamame',
  // Formaggi ad alto apporto proteico
  'parmigiano', 'grana', 'pecorino', 'feta', 'ricotta', 'mozzarella',
  'fiocchi di latte', 'primosale', 'quartirolo', 'yogurt greco'
]

const CHEESE_PROTEIN_KEYWORDS = [
  'parmigiano', 'grana', 'pecorino', 'feta', 'ricotta', 'mozzarella',
  'fiocchi di latte', 'primosale', 'formaggio'
]

const CARB_KEYWORDS = [
  'pasta', 'riso', 'avena', 'farina', 'pane', 'patate', 'patata', 'gnocchi',
  'piadina', 'couscous', 'quinoa', 'polenta', 'mais', 'gallette', 'fette biscottate',
  'cereali', 'spaghetti', 'penne', 'fusilli', 'riso basmati'
]

const VEGETABLE_KEYWORDS = [
  'zucchine', 'zucchina', 'carote', 'carota', 'pomodori', 'pomodoro', 'pomodorini',
  'spinaci', 'melanzane', 'melanzana', 'peperoni', 'peperone', 'finocchi', 'finocchio',
  'broccoli', 'broccolo', 'cavolfiore', 'insalata', 'lattuga', 'rucola', 'radicchio',
  'bietole', 'funghi', 'asparagi', 'cipolla', 'cipollotto', 'fagiolini', 'zucca', 'cetrioli'
]

const FAT_KEYWORDS = [
  'olio', 'olio extravergine', 'olio evo', 'burro', 'ghee', 'mandorle', 'noci',
  'nocciole', 'avocado', 'semi di lino', 'semi di chia', 'burro di arachidi', 'maionese'
]

export function classifyIngredientCategory(name: string): RecipeIngredient['category'] {
  const lower = name.toLowerCase().trim()

  if (FAT_KEYWORDS.some(k => lower.includes(k))) return 'fats'
  if (VEGETABLE_KEYWORDS.some(k => lower.includes(k))) return 'vegetables'
  if (CARB_KEYWORDS.some(k => lower.includes(k))) return 'carbs'
  if (PROTEIN_KEYWORDS.some(k => lower.includes(k))) return 'proteins'

  return 'other'
}

export function isCheeseProtein(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return CHEESE_PROTEIN_KEYWORDS.some(k => lower.includes(k))
}

// ─── Dish Type Classifier ─────────────────────────────────────────────────────

export function detectDishType(ingredients: { name: string; category?: string }[]): DishType {
  const categories = new Set(
    ingredients.map(i => i.category || classifyIngredientCategory(i.name))
  )

  const hasVeg = categories.has('vegetables')
  const hasProt = categories.has('proteins')
  const hasCarb = categories.has('carbs')

  if (hasVeg && !hasProt && !hasCarb) {
    return 'side' // Solo contorno verdure
  }
  if (hasProt && hasCarb && hasVeg) {
    return 'complete' // Piatto completo bilanciato
  }
  if (hasProt && !hasCarb) {
    return 'main' // Secondo piatto
  }
  if (hasCarb && !hasProt) {
    return 'main' // Primo piatto
  }
  return 'main'
}

// ─── Deterministic Dose Calculation ───────────────────────────────────────────

interface InputIngredient {
  name: string
  originalQuantity?: string | number
  unit?: string
  category?: RecipeIngredient['category']
  component?: string
  isOptional?: boolean
}

export function adaptIngredientsDeterministically(
  ingredients: InputIngredient[],
  mealPlan?: MealPlan,
  options?: {
    sideDishMode?: boolean
    vegetableQuotaOverride?: number
  }
): RecipeIngredient[] {
  // Extract groups from the user's meal plan
  const protGroup = mealPlan?.groups.find(g => g.category === 'proteins' || g.category === 'dairy')
  const carbGroup = mealPlan?.groups.find(g => g.category === 'carbs')
  const vegGroup = mealPlan?.groups.find(g => g.category === 'vegetables')
  const fatGroup = mealPlan?.groups.find(g => g.category === 'fats')

  // Target values from plan
  const targetProteinGrams = protGroup?.minQuantity || protGroup?.maxQuantity || 150
  const targetCarbGrams = carbGroup?.minQuantity || carbGroup?.maxQuantity || 70
  const defaultVegGrams = options?.vegetableQuotaOverride ?? (vegGroup?.minQuantity || vegGroup?.maxQuantity || 200)
  const targetFatGrams = fatGroup?.minQuantity || fatGroup?.maxQuantity || 10

  // 1. Classify all ingredients
  const classified = ingredients.map(ing => {
    const cat = ing.category || classifyIngredientCategory(ing.name)
    return {
      ...ing,
      category: cat,
      isCheese: isCheeseProtein(ing.name),
    }
  })

  // 2. Count categories for splitting
  const proteinItems = classified.filter(i => i.category === 'proteins')
  const carbItems = classified.filter(i => i.category === 'carbs')
  const vegItems = classified.filter(i => i.category === 'vegetables')

  const proteinCount = proteinItems.length
  const carbCount = carbItems.length
  const vegCount = vegItems.length

  // Calculate splitting factors
  // Rule: If multiple protein sources (e.g. Uova + Parmigiano):
  // Split factor = 1 / proteinCount (e.g. 50% each for 2 sources, 33% each for 3)
  const proteinSplitFactor = proteinCount > 1 ? 1 / proteinCount : 1
  const carbSplitFactor = carbCount > 1 ? 1 / carbCount : 1
  const vegPerItemGrams = vegCount > 0 ? Math.round(defaultVegGrams / vegCount) : 0

  return classified.map(ing => {
    let adaptedQty = ''
    const unit = ing.unit || 'g'
    const origQtyStr = ing.originalQuantity ? String(ing.originalQuantity) : ''

    switch (ing.category) {
      case 'proteins': {
        const lowerName = ing.name.toLowerCase()
        const isEgg = lowerName.includes('uov') || lowerName.includes('uovo')
        const isEggWhite = lowerName.includes('albume')
        const isCheese = ing.isCheese

        if (isEgg) {
          // Standard full portion of eggs: 2 eggs (~100g)
          // With 2 protein sources (e.g. Uova + Parmigiano): 1 egg (50g)!
          const baseEggs = 2
          const finalEggs = Math.max(1, Math.round(baseEggs * proteinSplitFactor))
          adaptedQty = `${finalEggs} intero (${finalEggs * 50}g)`
        } else if (isEggWhite) {
          const baseGrams = 150
          const finalGrams = Math.round(baseGrams * proteinSplitFactor)
          adaptedQty = `${finalGrams}g`
        } else if (isCheese) {
          // Parmigiano / Formaggio: target usually 30-40g in plan.
          // If combined with eggs or meat: split 50% -> 20g!
          const baseCheese = 40
          const finalGrams = Math.max(15, Math.round(baseCheese * proteinSplitFactor))
          adaptedQty = `${finalGrams}g (porzione calibrata proteica)`
        } else {
          // Meat or Fish or other protein
          const finalGrams = Math.round(targetProteinGrams * proteinSplitFactor)
          adaptedQty = `${finalGrams}g`
        }
        break
      }

      case 'vegetables': {
        // Strict partitioning: sum equals defaultVegGrams exactly
        adaptedQty = `${vegPerItemGrams}g`
        break
      }

      case 'carbs': {
        const finalGrams = Math.round(targetCarbGrams * carbSplitFactor)
        adaptedQty = `${finalGrams}g`
        break
      }

      case 'fats': {
        adaptedQty = `${targetFatGrams}g (circa 1 cucchiaio)`
        break
      }

      default: {
        // Aromi, sale, spezie, lievito
        adaptedQty = origQtyStr || 'q.b.'
        break
      }
    }

    return {
      name: ing.name,
      originalQuantity: origQtyStr || adaptedQty,
      adaptedQuantity: adaptedQty,
      unit,
      category: ing.category,
      component: ing.component || 'Principale',
      isOptional: ing.isOptional || false,
    }
  })
}

// ─── Combined Multi-Dish Meal Partitioning ────────────────────────────────────

export function adaptCombinedMeals(
  mainRecipe: Recipe,
  sideRecipe: Recipe,
  profile: NutritionProfile,
  targetMeal: TargetMealType
): {
  mainAdapted: RecipeIngredient[]
  sideAdapted: RecipeIngredient[]
  notes: string
} {
  // Find meal plan for this target
  const applicableMeals = profile.meals.filter(
    m => m.mealType === targetMeal || (targetMeal === 'lunch_dinner' && (m.mealType === 'lunch' || m.mealType === 'dinner'))
  )
  const mealPlan = applicableMeals[0]

  const vegGroup = mealPlan?.groups.find(g => g.category === 'vegetables')
  const totalVegTarget = vegGroup?.minQuantity || vegGroup?.maxQuantity || 200

  // Count vegetables across both recipes
  const mainVegCount = mainRecipe.adaptedIngredients.filter(i => i.category === 'vegetables').length
  const sideVegCount = sideRecipe.adaptedIngredients.filter(i => i.category === 'vegetables').length
  const totalVegItems = mainVegCount + sideVegCount

  let mainVegGrams = 0
  let sideVegGrams = totalVegTarget

  if (mainVegCount > 0 && sideVegCount > 0) {
    // Both have vegetables: split 50%/50% (e.g. 100g contorno, 100g piatto principale)
    mainVegGrams = Math.round(totalVegTarget / 2)
    sideVegGrams = totalVegTarget - mainVegGrams
  }

  const mainAdapted = adaptIngredientsDeterministically(mainRecipe.originalIngredients, mealPlan, {
    vegetableQuotaOverride: mainVegGrams > 0 ? mainVegGrams : undefined,
  })

  const sideAdapted = adaptIngredientsDeterministically(sideRecipe.originalIngredients, mealPlan, {
    sideDishMode: true,
    vegetableQuotaOverride: sideVegGrams,
  })

  return {
    mainAdapted,
    sideAdapted,
    notes: `Pasto combinato bilanciato: la quota di verdure (${totalVegTarget}g) è stata ripartita tra ${mainRecipe.title} (${mainVegGrams}g) e il contorno ${sideRecipe.title} (${sideVegGrams}g).`,
  }
}

// ─── Generate Multi-Variants Deterministically ────────────────────────────────

export function generateVariantsDeterministically(
  title: string,
  ingredients: InputIngredient[],
  profile: NutritionProfile,
  targetMeal: TargetMealType,
  steps: RecipeStep[] = []
): RecipeMealVariant[] {
  const mealsToGenerate: MealPlan[] = []

  if (targetMeal === 'lunch_dinner') {
    const lunch = profile.meals.find(m => m.mealType === 'lunch' && !m.isVariant)
    const dinner = profile.meals.find(m => m.mealType === 'dinner' && !m.isVariant)
    const variants = profile.meals.filter(m => m.isVariant && (m.mealType === 'dinner' || m.mealType === 'lunch'))

    if (lunch) mealsToGenerate.push(lunch)
    if (dinner) mealsToGenerate.push(dinner)
    variants.forEach(v => mealsToGenerate.push(v))
  } else {
    const main = profile.meals.find(m => m.mealType === targetMeal && !m.isVariant)
    const variants = profile.meals.filter(m => m.mealType === targetMeal && m.isVariant)

    if (main) mealsToGenerate.push(main)
    variants.forEach(v => mealsToGenerate.push(v))
  }

  if (mealsToGenerate.length <= 1) {
    return []
  }

  return mealsToGenerate.map(m => {
    const adapted = adaptIngredientsDeterministically(ingredients, m)

    // Calculate approximate nutritional values
    let calories = 0
    let proteins = 0
    let carbs = 0
    let fats = 0

    adapted.forEach(ing => {
      const num = parseFloat(ing.adaptedQuantity.replace(/[^0-9.]/g, '')) || 0
      if (ing.category === 'proteins') {
        proteins += Math.round(num * 0.22)
        fats += Math.round(num * 0.05)
      } else if (ing.category === 'carbs') {
        carbs += Math.round(num * 0.7)
      } else if (ing.category === 'fats') {
        fats += Math.round(num * 0.9)
      }
    })

    calories = proteins * 4 + carbs * 4 + fats * 9

    return {
      id: m.mealType + (m.isVariant ? `_${m.id}` : ''),
      label: m.label,
      mealType: m.mealType,
      isVariant: m.isVariant,
      adaptedIngredients: adapted,
      steps: steps.map(s => ({
        ...s,
        description: s.description, // Steps stay clean without fake essays
      })),
      nutritionalValues: {
        calories: Math.max(100, calories),
        proteins: Math.max(10, proteins),
        carbs: Math.max(5, carbs),
        fats: Math.max(2, fats),
      },
    }
  })
}

// ─── Fast Intelligent Ingredient Suggester from Title ─────────────────────────

export function suggestIngredientsFromTitle(
  title: string,
  profile?: NutritionProfile
): { name: string; category: RecipeIngredient['category'] }[] {
  const text = title.toLowerCase().trim()
  const suggested: { name: string; category: RecipeIngredient['category'] }[] = []

  // Check proteins
  if (text.includes('salmone')) suggested.push({ name: 'Salmone fresco', category: 'proteins' })
  else if (text.includes('tonno')) suggested.push({ name: 'Tonno al naturale', category: 'proteins' })
  else if (text.includes('merluzzo') || text.includes('pesce') || text.includes('orata') || text.includes('spigola')) {
    suggested.push({ name: 'Filetto di pesce', category: 'proteins' })
  } else if (text.includes('pollo')) suggested.push({ name: 'Petto di pollo', category: 'proteins' })
  else if (text.includes('tacchino')) suggested.push({ name: 'Fesa di tacchino', category: 'proteins' })
  else if (text.includes('manzo') || text.includes('hamburger') || text.includes('bistecca')) {
    suggested.push({ name: 'Carne macinata magra di manzo', category: 'proteins' })
  } else if (text.includes('frittata') || text.includes('uov') || text.includes('uovo') || text.includes('omelette') || text.includes('crêpe')) {
    suggested.push({ name: 'Uova intere', category: 'proteins' })
  }

  // Parmigiano / Formaggio in dough or recipe
  if (text.includes('parmigiano') || text.includes('grana') || text.includes('pecorino')) {
    suggested.push({ name: 'Parmigiano Reggiano grattugiato', category: 'proteins' })
  } else if (text.includes('feta')) {
    suggested.push({ name: 'Feta greca', category: 'proteins' })
  } else if (text.includes('ricotta')) {
    suggested.push({ name: 'Ricotta fresca', category: 'proteins' })
  } else if (text.includes('mozzarella')) {
    suggested.push({ name: 'Mozzarella light', category: 'proteins' })
  }

  // Vegetables
  if (text.includes('zucchine') || text.includes('zucchina')) suggested.push({ name: 'Zucchine', category: 'vegetables' })
  if (text.includes('peperoni') || text.includes('peperone')) suggested.push({ name: 'Peperoni', category: 'vegetables' })
  if (text.includes('pomodor') || text.includes('pomodorini')) suggested.push({ name: 'Pomodorini ciliegino', category: 'vegetables' })
  if (text.includes('spinaci')) suggested.push({ name: 'Spinaci freschi', category: 'vegetables' })
  if (text.includes('melanzane')) suggested.push({ name: 'Melanzane a cubetti', category: 'vegetables' })
  if (text.includes('broccoli')) suggested.push({ name: 'Broccoli', category: 'vegetables' })
  if (text.includes('funghi')) suggested.push({ name: 'Funghi champignon', category: 'vegetables' })
  if (text.includes('asparagi')) suggested.push({ name: 'Asparagi', category: 'vegetables' })

  // Carbs
  if (text.includes('pasta')) suggested.push({ name: 'Pasta integrale o di semola', category: 'carbs' })
  if (text.includes('riso')) suggested.push({ name: 'Riso basmati', category: 'carbs' })
  if (text.includes('avena') || text.includes('pancake')) suggested.push({ name: 'Farina d\'avena', category: 'carbs' })
  if (text.includes('patate') || text.includes('patata')) suggested.push({ name: 'Patate', category: 'carbs' })
  if (text.includes('pane') || text.includes('panino') || text.includes('toast') || text.includes('burger')) {
    suggested.push({ name: 'Pane o Panino per hamburger', category: 'carbs' })
  }

  // Fats
  suggested.push({ name: 'Olio extravergine d\'oliva', category: 'fats' })

  // If nothing matched, pick main options from user's active profile!
  if (suggested.length <= 1 && profile && profile.meals.length > 0) {
    const lunchOrDinner = profile.meals.find(m => m.mealType === 'lunch' || m.mealType === 'dinner') || profile.meals[0]
    lunchOrDinner.groups.forEach(g => {
      if (g.options && g.options.length > 0) {
        suggested.push({
          name: g.options[0].name,
          category: g.category,
        })
      }
    })
  }

  return suggested
}
