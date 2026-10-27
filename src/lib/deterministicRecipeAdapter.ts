import type {
  Recipe,
  RecipeIngredient,
  RecipeStep,
  NutritionalValues,
  NutritionProfile,
  MealPlan,
  FoodGroup,
  FoodOption,
  TargetMealType,
  RecipeMealVariant,
  DishType,
} from '@/types'

// ─── Classification Dictionaries ──────────────────────────────────────────────

const FISH_KEYWORDS = [
  'salmone', 'tonno', 'merluzzo', 'orata', 'spigola', 'pesce',
  'pescespada', 'gamberi', 'gamberetti', 'calamari', 'polpo', 'trota', 'sarde',
  'alici', 'platessa', 'nasello', 'baccalà', 'seppie', 'rombo', 'dentice'
]

const MEAT_KEYWORDS = [
  'pollo', 'tacchino', 'coniglio', 'manzo', 'vitello', 'maiale', 'bistecca',
  'macinato', 'hamburger', 'straccetti', 'lonza', 'speck', 'bresaola',
  'prosciutto', 'fesa'
]

const LEGUME_KEYWORDS = [
  'lenticchie', 'lenticchia', 'ceci', 'cece', 'fagioli', 'fagiolo',
  'piselli', 'pisello', 'cicerchie', 'cicerchia', 'fave', 'fava',
  'edamame', 'soia', 'lupini', 'tofu', 'tempeh'
]

const EGG_KEYWORDS = [
  'uova', 'uovo', 'albume', 'albumi'
]

const CHEESE_PROTEIN_KEYWORDS = [
  'parmigiano', 'grana', 'pecorino', 'feta', 'ricotta', 'mozzarella',
  'fiocchi di latte', 'primosale', 'quartirolo', 'yogurt greco', 'formaggio'
]

const PROTEIN_KEYWORDS = [
  ...FISH_KEYWORDS,
  ...MEAT_KEYWORDS,
  ...LEGUME_KEYWORDS,
  ...EGG_KEYWORDS,
  ...CHEESE_PROTEIN_KEYWORDS,
]

const CARB_KEYWORDS = [
  'pasta', 'riso', 'avena', 'farina', 'pane', 'patate', 'patata', 'gnocchi',
  'piadina', 'couscous', 'quinoa', 'polenta', 'mais', 'gallette', 'fette biscottate',
  'cereali', 'spaghetti', 'penne', 'fusilli', 'riso basmati', 'pangrattato', 'pan grattato'
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

const BINDING_KEYWORDS = [
  'pangrattato', 'pan grattato', 'farina', 'fecola', 'amido', 'farina d\'avena'
]

export function classifyIngredientCategory(name: string): RecipeIngredient['category'] {
  const lower = name.toLowerCase().trim()

  if (FAT_KEYWORDS.some(k => lower.includes(k))) return 'fats'
  if (VEGETABLE_KEYWORDS.some(k => lower.includes(k))) return 'vegetables'
  if (PROTEIN_KEYWORDS.some(k => lower.includes(k))) return 'proteins'
  if (CARB_KEYWORDS.some(k => lower.includes(k))) return 'carbs'

  return 'other'
}

export function isCheeseProtein(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return CHEESE_PROTEIN_KEYWORDS.some(k => lower.includes(k))
}

export function isFreshCheese(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return ['feta', 'ricotta', 'mozzarella', 'fiocchi di latte', 'primosale', 'quartirolo', 'tofu', 'tempeh'].some(k => lower.includes(k))
}

export function isSeasoningCheese(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return ['parmigiano', 'grana', 'pecorino'].some(k => lower.includes(k))
}

export function isLegume(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return LEGUME_KEYWORDS.some(k => lower.includes(k))
}

export function isEgg(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return EGG_KEYWORDS.some(k => lower.includes(k))
}

export function isFish(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return FISH_KEYWORDS.some(k => lower.includes(k))
}

export function isMeat(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return MEAT_KEYWORDS.some(k => lower.includes(k))
}

export function isMainProteinSource(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return (
    isFish(lower) ||
    isMeat(lower) ||
    isLegume(lower) ||
    isEgg(lower) ||
    isFreshCheese(lower) ||
    (isSeasoningCheese(lower) && (lower.includes('frittata') || lower.includes('polpett') || lower.includes('impasto')))
  )
}

export function isBindingIngredient(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return BINDING_KEYWORDS.some(k => lower.includes(k))
}

// ─── Quantity Parser (Prevents "10g (circa 1 cucchiaio)" -> 101 bug) ───────────

export function parseQuantityInGrams(qtyStr: string): number {
  if (!qtyStr) return 0
  const clean = String(qtyStr).trim()

  // 1. Bracketed grams: "1 intero (50g)" or "(200g)"
  const bracketMatch = clean.match(/\((\d+(?:\.\d+)?)\s*g\)/i)
  if (bracketMatch) return parseFloat(bracketMatch[1])

  // 2. Specific unit: "200g", "200 g", "100ml"
  const gMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i)
  if (gMatch) return parseFloat(gMatch[1])

  const innerGMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i)
  if (innerGMatch) return parseFloat(innerGMatch[1])

  // 3. Egg pieces: "1 uovo", "2 uova", "1 intero"
  const eggMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(?:uov|intero|pezzo|pezzi)\b/i)
  if (eggMatch) return parseFloat(eggMatch[1]) * 50

  // 4. Fallback: match leading number only
  const firstNumMatch = clean.match(/^(\d+(?:\.\d+)?)/)
  if (firstNumMatch) return parseFloat(firstNumMatch[1])

  return 0
}

// ─── Plan Option Matcher ──────────────────────────────────────────────────────

interface MatchedFoodResult {
  quantity: number
  unit: string
  optionName?: string
}

export function findMatchingFoodOption(
  mealPlan: MealPlan | undefined,
  ingredientName: string,
  category: RecipeIngredient['category']
): MatchedFoodResult | null {
  if (!mealPlan || !mealPlan.groups) return null

  const ingLower = ingredientName.toLowerCase().trim()
  const relevantGroups = mealPlan.groups.filter(g => {
    if (category === 'proteins') return g.category === 'proteins' || g.category === 'dairy'
    if (category === 'carbs') return g.category === 'carbs'
    if (category === 'vegetables') return g.category === 'vegetables'
    if (category === 'fats') return g.category === 'fats'
    return g.category === category
  })

  // 1. Exact or keyword match inside group.options
  for (const group of relevantGroups) {
    if (!group.options) continue

    for (const opt of group.options) {
      const optLower = opt.name.toLowerCase().trim()
      // Direct substring match
      if (ingLower.includes(optLower) || optLower.includes(ingLower)) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }

      // Semantic keyword matches
      // Patate / Patata: cerca opzione patate nel gruppo carbs
      if (ingLower.includes('patat') && optLower.includes('patat')) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('salmone') && (optLower.includes('salmone') || optLower.includes('pesce'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('tonno') && (optLower.includes('tonno') || optLower.includes('pesce'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('feta') && (optLower.includes('feta') || optLower.includes('formaggio') || optLower.includes('latticini'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (isLegume(ingLower) && (isLegume(optLower) || optLower.includes('legum'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (isEgg(ingLower) && (isEgg(optLower) || optLower.includes('uov'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('pollo') && (optLower.includes('pollo') || optLower.includes('carne bianca'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if ((ingLower.includes('manzo') || ingLower.includes('hamburger')) && (optLower.includes('manzo') || optLower.includes('carne rossa'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('parmigiano') && (optLower.includes('parmigiano') || optLower.includes('grana') || optLower.includes('formaggio'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if ((ingLower.includes('riso') || ingLower.includes('basmati')) && (optLower.includes('riso') || optLower.includes('cereali'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('pasta') && (optLower.includes('pasta') || optLower.includes('cereali'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
      if (ingLower.includes('cioccolat') && (optLower.includes('cioccolat') || optLower.includes('fondente'))) {
        return { quantity: opt.quantity, unit: opt.unit, optionName: opt.name }
      }
    }
  }

  // Specific semantic fallbacks if not explicitly listed in group options
  if (ingLower.includes('cioccolat')) {
    return { quantity: 15, unit: 'g', optionName: 'Cioccolato fondente (limite piano)' }
  }

  // 2. Fallback to group min/max quantity with food-specific conversions
  for (const group of relevantGroups) {
    if (group.minQuantity || group.maxQuantity) {
      const baseQty = group.minQuantity || group.maxQuantity || 0

      // Se l'alimento sono patate e il gruppo carboidrati ha la quota per pasta/riso (<= 95g),
      // applichiamo la conversione nutrizionale clinica (2.85x, 70g pasta = 200g patate, 80g = 230g)
      if (ingLower.includes('patat') && baseQty <= 95) {
        const potatoEquiv = Math.round((baseQty * 2.85) / 10) * 10
        return {
          quantity: potatoEquiv,
          unit: 'g',
          optionName: 'Patate (quota equivalente carbo)'
        }
      }

      // Se l'alimento è Feta o formaggio fresco proteico da secondo piatto e group ha minQuantity generico
      if (ingLower.includes('feta') && baseQty < 80) {
        return {
          quantity: 90,
          unit: 'g',
          optionName: 'Feta greca (quota secondo piatto)'
        }
      }

      return {
        quantity: baseQty,
        unit: group.unit || 'g',
      }
    }
  }

  // Fallback per patate se nessun gruppo carbs ha minQuantity
  if (ingLower.includes('patat')) {
    return { quantity: 200, unit: 'g', optionName: 'Patate (fabbisogno standard)' }
  }

  if (ingLower.includes('feta')) {
    return { quantity: 90, unit: 'g', optionName: 'Feta greca (fabbisogno secondo piatto)' }
  }

  return null
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

export interface InputIngredient {
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

  // Target values from plan fallback
  const defaultProteinGrams = protGroup?.minQuantity || protGroup?.maxQuantity || 150
  const defaultCarbGrams = carbGroup?.minQuantity || carbGroup?.maxQuantity || 70
  const defaultVegGrams = options?.vegetableQuotaOverride ?? (vegGroup?.minQuantity || vegGroup?.maxQuantity || 200)
  const defaultFatGrams = fatGroup?.minQuantity || fatGroup?.maxQuantity || 10

  // 1. Classify all ingredients
  const classified = ingredients.map(ing => {
    let cat = ing.category || classifyIngredientCategory(ing.name)
    // Se è formaggio, uova, legumi, carne, pesce -> consideriamo sempre proteins per il bilanciamento pasto
    if (isCheeseProtein(ing.name) || isLegume(ing.name) || isEgg(ing.name) || isFish(ing.name) || isMeat(ing.name)) {
      cat = 'proteins'
    }
    return {
      ...ing,
      category: cat,
      isCheese: isCheeseProtein(ing.name),
      isFreshCheese: isFreshCheese(ing.name),
      isSeasoningCheese: isSeasoningCheese(ing.name),
      isLegume: isLegume(ing.name),
      isEgg: isEgg(ing.name),
      isFish: isFish(ing.name),
      isMeat: isMeat(ing.name),
      isBinding: isBindingIngredient(ing.name),
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
  // Rule: If multiple protein sources (e.g. Lenticchie + Feta, Uova + Parmigiano, Legumi + Pollo):
  // Split factor = 1 / proteinCount (50% each for 2 sources, 33% each for 3)
  const proteinSplitFactor = proteinCount > 1 ? 1 / proteinCount : 1
  const carbSplitFactor = carbCount > 1 ? 1 / carbCount : 1
  const vegPerItemGrams = vegCount > 0 ? Math.round(defaultVegGrams / vegCount) : 0

  return classified.map(ing => {
    let adaptedQty = ''
    const unit = ing.unit || 'g'
    const origQtyStr = ing.originalQuantity ? String(ing.originalQuantity) : ''
    const lowerName = ing.name.toLowerCase()

    switch (ing.category) {
      case 'proteins': {
        const matched = findMatchingFoodOption(mealPlan, ing.name, 'proteins')

        if (ing.isEgg) {
          // Eggs handling: plan usually gives 2 eggs (100g)
          // With 2 protein sources (e.g. Lenticchie + Uova, or Uova + Parmigiano): 1 egg (50g)!
          const baseEggs = matched?.quantity ? matched.quantity : 2
          const finalEggs = Math.max(1, Math.round(baseEggs * proteinSplitFactor))
          adaptedQty = proteinCount > 1
            ? `${finalEggs} intero (${finalEggs * 50}g, quota 50% combinata)`
            : `${finalEggs} intero (${finalEggs * 50}g)`
        } else if (lowerName.includes('albume') || lowerName.includes('albumi')) {
          const baseAlbume = matched?.quantity ? matched.quantity : 150
          const finalGrams = Math.round(baseAlbume * proteinSplitFactor)
          adaptedQty = proteinCount > 1 ? `${finalGrams}g (quota 50% combinata)` : `${finalGrams}g`
        } else if (ing.isLegume) {
          // Legumes handling: plan gives specific grams (e.g. 80g dry lenticchie o 200g cotte)
          // Se combinati con Feta o uova: 80g * 0.5 = 40g!
          const baseLegumeGrams = matched?.quantity ? matched.quantity : 80
          const finalGrams = Math.round(baseLegumeGrams * proteinSplitFactor)
          adaptedQty = proteinCount > 1 ? `${finalGrams}g (quota 50% dimezzata)` : `${finalGrams}g`
        } else if (ing.isCheese) {
          if (ing.isFreshCheese) {
            // Feta greca, mozzarella, ricotta, fiocchi di latte (secondo piatto ~90g)
            // Se combinata con Legumi: 90g * 0.5 = 45g!
            const baseCheese = matched?.quantity ? matched.quantity : 90
            const finalGrams = Math.round(baseCheese * proteinSplitFactor)
            adaptedQty = proteinCount > 1 ? `${finalGrams}g (quota 50% dimezzata)` : `${finalGrams}g`
          } else {
            // Parmigiano / grana (30-40g per impasto o condimento)
            const baseCheese = matched?.quantity ? matched.quantity : 30
            const finalGrams = Math.max(15, Math.round(baseCheese * proteinSplitFactor))
            adaptedQty = `${finalGrams}g (porzione calibrata proteica)`
          }
        } else {
          // Meat or Fish (e.g. Salmone: 200g at lunch, 250g at dinner, 280g post workout)
          const baseGrams = matched?.quantity ? matched.quantity : defaultProteinGrams
          const finalGrams = Math.round(baseGrams * proteinSplitFactor)
          adaptedQty = proteinCount > 1 ? `${finalGrams}g (quota 50% dimezzata)` : `${finalGrams}g`
        }
        break
      }

      case 'vegetables': {
        // Strict partitioning: sum equals defaultVegGrams exactly
        adaptedQty = `${vegPerItemGrams}g`
        break
      }

      case 'carbs': {
        const matched = findMatchingFoodOption(mealPlan, ing.name, 'carbs')
        let baseCarbGrams = matched?.quantity ? matched.quantity : defaultCarbGrams

        // Patate: se baseCarbGrams è quella della pasta/riso (<= 95g) e non specifica per patate,
        // converti alla dose corretta per patate (200g a pranzo o proporzionale)
        if (lowerName.includes('patat') && baseCarbGrams <= 95) {
          baseCarbGrams = Math.round((baseCarbGrams * 2.85) / 10) * 10
        }

        if (ing.isBinding && proteinCount > 1) {
          // Binding ingredients (e.g. pangrattato in lentil meatballs with eggs):
          const bindingGrams = Math.min(30, Math.round(baseCarbGrams * proteinSplitFactor))
          adaptedQty = `${bindingGrams}g`
        } else {
          const finalGrams = Math.round(baseCarbGrams * carbSplitFactor)
          adaptedQty = carbCount > 1 ? `${finalGrams}g (quota ripartita carbo)` : `${finalGrams}g`
        }
        break
      }

      case 'fats': {
        const matched = findMatchingFoodOption(mealPlan, ing.name, 'fats')
        const baseFatGrams = matched?.quantity ? matched.quantity : defaultFatGrams
        adaptedQty = `${baseFatGrams}g (circa 1 cucchiaio)`
        break
      }

      case 'fruits': {
        const matched = findMatchingFoodOption(mealPlan, ing.name, 'fruits')
        const qty = matched?.quantity || 150
        adaptedQty = `${qty}g (1 porzione frutto)`
        break
      }

      default: {
        // Cioccolato fondente / colazione
        if (lowerName.includes('cioccolat')) {
          const matched = findMatchingFoodOption(mealPlan, ing.name, 'other')
          const chocoGrams = matched?.quantity || 15
          adaptedQty = `${chocoGrams}g (limite massimo piano)`
        } else if (lowerName.includes('marmellat')) {
          adaptedQty = '20g (senza zuccheri aggiunti)'
        } else {
          adaptedQty = origQtyStr || 'q.b.'
        }
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

// ─── Accurate Nutritional Values Calculator ───────────────────────────────────

export function calculateNutritionalValues(ingredients: RecipeIngredient[]): NutritionalValues {
  let calories = 0
  let proteins = 0
  let carbs = 0
  let fats = 0

  ingredients.forEach(ing => {
    const grams = parseQuantityInGrams(ing.adaptedQuantity)
    if (grams <= 0) return

    const lower = ing.name.toLowerCase()

    if (ing.category === 'fats' || lower.includes('olio')) {
      // 10g of olive oil = 9.2g fat, ~82 kcal (never 99g or 101g!)
      const fatG = Math.round(grams * 0.92)
      fats += fatG
      calories += fatG * 9
    } else if (ing.category === 'proteins') {
      if (lower.includes('salmone')) {
        // Salmone fresco: ~20% proteine, ~12% grassi buoni omega-3 (~188 kcal / 100g)
        // 200g salmone = 40g P, 24g F -> 376 kcal (non 1023 kcal!)
        const p = Math.round(grams * 0.20)
        const f = Math.round(grams * 0.12)
        proteins += p
        fats += f
        calories += p * 4 + f * 9
      } else if (lower.includes('feta')) {
        // Feta greca tradizionale: ~14% proteine, ~21% grassi, ~4% carbs (~260 kcal / 100g)
        const p = Math.round(grams * 0.14)
        const f = Math.round(grams * 0.21)
        const c = Math.round(grams * 0.04)
        proteins += p
        fats += f
        carbs += c
        calories += p * 4 + c * 4 + f * 9
      } else if (isLegume(lower)) {
        // Legumi secchi (lenticchie, ceci, fagioli): ~23% protein, ~55% carbs, ~1.5% fat
        const p = Math.round(grams * 0.23)
        const c = Math.round(grams * 0.55)
        const f = Math.round(grams * 0.015)
        proteins += p
        carbs += c
        fats += f
        calories += p * 4 + c * 4 + f * 9
      } else if (isEgg(lower)) {
        // Uova: ~13% protein, ~10% fat (1 uovo 50g = 6.5g protein, 5g fat, ~72 kcal)
        const p = Math.round(grams * 0.13)
        const f = Math.round(grams * 0.10)
        proteins += p
        fats += f
        calories += p * 4 + f * 9
      } else if (isSeasoningCheese(lower)) {
        // Parmigiano / grana: ~33% protein, ~28% fat
        const p = Math.round(grams * 0.33)
        const f = Math.round(grams * 0.28)
        proteins += p
        fats += f
        calories += p * 4 + f * 9
      } else if (isFreshCheese(lower)) {
        // Ricotta / mozzarella light / fiocchi di latte: ~12% protein, ~9% fat
        const p = Math.round(grams * 0.12)
        const f = Math.round(grams * 0.09)
        proteins += p
        fats += f
        calories += p * 4 + f * 9
      } else {
        // Standard lean protein (pollo, merluzzo, tacchino, tonno nat.): ~22% protein, ~2% fat
        const p = Math.round(grams * 0.22)
        const f = Math.round(grams * 0.02)
        proteins += p
        fats += f
        calories += p * 4 + f * 9
      }
    } else if (ing.category === 'carbs') {
      if (lower.includes('patat')) {
        // Patate lesse/al forno: ~2% proteine, ~17% carboidrati complessi, ~0.1% grassi (~77 kcal / 100g)
        // 200g patate = ~4g P, ~34g C -> ~152 kcal (mai 700 kcal!)
        const p = Math.round(grams * 0.02)
        const c = Math.round(grams * 0.17)
        proteins += p
        carbs += c
        calories += p * 4 + c * 4
      } else {
        // Pasta, riso, farina, fiocchi avena, pane: ~10% protein, ~70% carbs, ~1.5% fat (~335 kcal / 100g)
        const p = Math.round(grams * 0.10)
        const c = Math.round(grams * 0.70)
        const f = Math.round(grams * 0.015)
        proteins += p
        carbs += c
        fats += f
        calories += p * 4 + c * 4 + f * 9
      }
    } else if (ing.category === 'vegetables') {
      // Vegetables: ~1.5% protein, ~3% carbs, ~0.2% fat (~20 kcal / 100g)
      const p = Math.round(grams * 0.015)
      const c = Math.round(grams * 0.03)
      proteins += p
      carbs += c
      calories += p * 4 + c * 4
    } else if (lower.includes('cioccolat')) {
      // Cioccolato fondente 85%: ~8% protein, ~35% carbs, ~50% fat (~600 kcal / 100g)
      // 15g cioccolato fondente = 1.2g P, 5.2g C, 7.5g F -> ~93 kcal
      const p = Math.round(grams * 0.08)
      const c = Math.round(grams * 0.35)
      const f = Math.round(grams * 0.50)
      proteins += p
      carbs += c
      fats += f
      calories += p * 4 + c * 4 + f * 9
    } else if (lower.includes('marmellat')) {
      // Marmellata 100% frutta: ~45% carboidrati (~180 kcal / 100g)
      const c = Math.round(grams * 0.45)
      carbs += c
      calories += c * 4
    }
  })

  return {
    calories: Math.max(30, Math.round(calories)),
    proteins: Math.max(0, Math.round(proteins)),
    carbs: Math.max(0, Math.round(carbs)),
    fats: Math.max(0, Math.round(fats)),
  }
}

// ─── Multi-Variant Generator ──────────────────────────────────────────────────

export function generateVariantsDeterministically(
  profileOrTitle: NutritionProfile | string | undefined,
  ingredients: InputIngredient[],
  stepsOrProfile: RecipeStep[] | NutritionProfile | undefined,
  targetMeal: TargetMealType,
  stepsIfTitle?: RecipeStep[]
): RecipeMealVariant[] {
  let profile: NutritionProfile | undefined
  let steps: RecipeStep[] = []

  if (typeof profileOrTitle === 'string') {
    // Called as (title, ingredients, profile, targetMeal, steps)
    profile = stepsOrProfile as NutritionProfile | undefined
    steps = stepsIfTitle || []
  } else {
    // Called as (profile, ingredients, steps, targetMeal)
    profile = profileOrTitle
    steps = (stepsOrProfile as RecipeStep[]) || []
  }

  if (!profile || !profile.meals || profile.meals.length === 0) {
    return []
  }

  let mealsToGenerate: MealPlan[] = []

  if (targetMeal === 'lunch_dinner') {
    mealsToGenerate = profile.meals.filter(
      m => m.mealType === 'lunch' || m.mealType === 'dinner'
    )
  } else if (targetMeal === 'lunch') {
    mealsToGenerate = profile.meals.filter(m => m.mealType === 'lunch')
  } else if (targetMeal === 'dinner') {
    mealsToGenerate = profile.meals.filter(m => m.mealType === 'dinner')
  }

  if (mealsToGenerate.length === 0) {
    return []
  }

  return mealsToGenerate.map(m => {
    const adapted = adaptIngredientsDeterministically(ingredients, m)
    const nutritionalValues = calculateNutritionalValues(adapted)

    return {
      id: m.mealType + (m.isVariant ? `_${m.id || 'variant'}` : ''),
      label: m.label || (m.mealType === 'lunch' ? 'Pranzo' : 'Cena'),
      mealType: m.mealType,
      isVariant: m.isVariant,
      adaptedIngredients: adapted,
      steps: steps.map(s => ({
        ...s,
        description: s.description,
      })),
      nutritionalValues,
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
  const applicableMeals = profile.meals.filter(
    m => m.mealType === targetMeal || (targetMeal === 'lunch_dinner' && (m.mealType === 'lunch' || m.mealType === 'dinner'))
  )
  const mealPlan = applicableMeals[0]

  const vegGroup = mealPlan?.groups.find(g => g.category === 'vegetables')
  const totalVegTarget = vegGroup?.minQuantity || vegGroup?.maxQuantity || 200

  const mainVegCount = mainRecipe.adaptedIngredients.filter(i => i.category === 'vegetables').length
  const sideVegCount = sideRecipe.adaptedIngredients.filter(i => i.category === 'vegetables').length
  const totalVegItems = mainVegCount + sideVegCount

  let mainVegGrams = 0
  let sideVegGrams = totalVegTarget

  if (mainVegCount > 0 && sideVegCount > 0) {
    sideVegGrams = 100
    mainVegGrams = Math.max(50, totalVegTarget - sideVegGrams)
  } else if (sideVegCount > 0) {
    sideVegGrams = totalVegTarget
  }

  const mainAdapted = adaptIngredientsDeterministically(
    mainRecipe.adaptedIngredients,
    mealPlan,
    { vegetableQuotaOverride: mainVegGrams > 0 ? mainVegGrams : undefined }
  )

  const sideAdapted = adaptIngredientsDeterministically(
    sideRecipe.adaptedIngredients,
    mealPlan,
    { vegetableQuotaOverride: sideVegGrams, sideDishMode: true }
  )

  const notes =
    mainVegCount > 0
      ? `Dosi ripartite: ${sideRecipe.title} impostato a ${sideVegGrams}g di verdure, ${mainRecipe.title} ridotto a ${mainVegGrams}g di verdure per rispettare il tetto totale di ${totalVegTarget}g.`
      : `${sideRecipe.title} copre interamente la quota verdure di ${totalVegTarget}g per il pasto.`

  return { mainAdapted, sideAdapted, notes }
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
  } else if (text.includes('lenticchie') || text.includes('polpette di lenticchie')) {
    suggested.push({ name: 'Lenticchie secche', category: 'proteins' })
  } else if (text.includes('ceci') || text.includes('hummus')) {
    suggested.push({ name: 'Ceci secchi', category: 'proteins' })
  } else if (text.includes('fagioli')) {
    suggested.push({ name: 'Fagioli borlotti o cannellini', category: 'proteins' })
  } else if (text.includes('frittata') || text.includes('uov') || text.includes('uovo') || text.includes('omelette') || text.includes('crêpe') || text.includes('polpette')) {
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

  // Binding carbs for meatballs / burgers / dough
  if (text.includes('polpette') || text.includes('burger') || text.includes('cotolett')) {
    suggested.push({ name: 'Pangrattato', category: 'carbs' })
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
  if (text.includes('pane') || text.includes('panino') || text.includes('toast')) {
    suggested.push({ name: 'Pane o Panino', category: 'carbs' })
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

// ─── Group Allowance and Capacity Tracker ─────────────────────────────────────

export interface GroupCapacityInfo {
  category: RecipeIngredient['category']
  categoryLabel: string
  icon: string
  maxAllowanceGrams: number
  unit: string
  currentTotalGrams: number
  percentUsed: number
  isExceeded: boolean
  hintText: string
  items: { name: string; grams: number; percent: number }[]
}

export function getGroupAllowanceAndUsage(
  mealPlan: MealPlan | undefined,
  category: RecipeIngredient['category'],
  ingredients: { name: string; adaptedQuantity?: string; category?: RecipeIngredient['category'] }[]
): GroupCapacityInfo {
  const CATEGORY_NAMES: Record<string, { label: string; icon: string }> = {
    carbs: { label: 'Carboidrati', icon: '🥔' },
    proteins: { label: 'Proteine', icon: '🍗' },
    vegetables: { label: 'Verdure', icon: '🥗' },
    fats: { label: 'Grassi / Olio', icon: '🫒' },
    dairy: { label: 'Latticini', icon: '🥛' },
    fruits: { label: 'Frutta', icon: '🍎' },
    other: { label: 'Altri ingredienti', icon: '🍴' },
  }

  const meta = CATEGORY_NAMES[category] || { label: category, icon: '🍴' }
  const relevantGroup = mealPlan?.groups.find(g => {
    if (category === 'proteins') return g.category === 'proteins' || g.category === 'dairy'
    return g.category === category
  })

  // Filter current ingredients belonging to this category
  const groupItems = ingredients.filter(ing => {
    const c = ing.category || classifyIngredientCategory(ing.name)
    if (category === 'proteins') {
      return c === 'proteins' || isCheeseProtein(ing.name) || isLegume(ing.name) || isEgg(ing.name) || isFish(ing.name) || isMeat(ing.name)
    }
    return c === category
  })

  // Compute reference max allowance from plan
  let maxAllowanceGrams = relevantGroup?.maxQuantity || relevantGroup?.minQuantity || 100
  if (category === 'fats') maxAllowanceGrams = relevantGroup?.minQuantity || 10
  if (category === 'vegetables') maxAllowanceGrams = relevantGroup?.minQuantity || 200

  // Special checks for carbs: if potatoes are in the group
  const hasPotatoes = groupItems.some(i => i.name.toLowerCase().includes('patat'))
  if (category === 'carbs' && hasPotatoes) {
    const potatoOption = relevantGroup?.options?.find(o => o.name.toLowerCase().includes('patat'))
    if (potatoOption?.quantity) {
      maxAllowanceGrams = potatoOption.quantity
    } else {
      // 200g standard potato allowance corresponding to ~70g pasta
      maxAllowanceGrams = Math.round(((relevantGroup?.minQuantity || 70) * 2.85) / 10) * 10
    }
  }

  // Parse grams for each item
  let currentTotalGrams = 0
  let totalNormalizedPercent = 0

  const items = groupItems.map(item => {
    const grams = parseQuantityInGrams(item.adaptedQuantity || '0')
    currentTotalGrams += grams

    // Calculate individual food baseline in plan
    const matched = findMatchingFoodOption(mealPlan, item.name, category)
    let itemBaseline = matched?.quantity || maxAllowanceGrams
    if (item.name.toLowerCase().includes('patat') && itemBaseline <= 95) {
      itemBaseline = Math.round((itemBaseline * 2.85) / 10) * 10
    }
    if (item.name.toLowerCase().includes('feta') && itemBaseline < 80) {
      itemBaseline = 90
    }

    const percent = itemBaseline > 0 ? Math.round((grams / itemBaseline) * 100) : 100
    totalNormalizedPercent += percent

    return {
      name: item.name,
      grams,
      percent,
    }
  })

  const percentUsed = groupItems.length <= 1
    ? (maxAllowanceGrams > 0 ? Math.round((currentTotalGrams / maxAllowanceGrams) * 100) : 100)
    : totalNormalizedPercent

  const isExceeded = percentUsed > 115

  // Helpful hint text for UI
  let hintText = `Limite piano: ${maxAllowanceGrams}g`
  if (category === 'carbs') {
    if (hasPotatoes) {
      hintText = `Patate: limite piano ${maxAllowanceGrams}g (quota attuale ${percentUsed}%)`
    } else {
      hintText = `Carboidrati: limite piano ${maxAllowanceGrams}g (copertura ${percentUsed}%)`
    }
  } else if (category === 'proteins') {
    if (groupItems.length > 1) {
      hintText = `Fonti proteiche combinate: bilanciate al 50/50 (${percentUsed}% quota coperta)`
    } else {
      hintText = `Proteine: limite piano ${maxAllowanceGrams}g (${percentUsed}% quota)`
    }
  } else if (category === 'fats') {
    hintText = `Grassi / Olio EVO: quota piano ${maxAllowanceGrams}g (circa 1 cucchiaio)`
  } else if (category === 'vegetables') {
    hintText = `Verdure: quota consigliata ${maxAllowanceGrams}g`
  }

  if (isExceeded) {
    hintText = `⚠️ Supera il limite previsto (${percentUsed}% del fabbisogno)`
  }

  return {
    category,
    categoryLabel: meta.label,
    icon: meta.icon,
    maxAllowanceGrams,
    unit: 'g',
    currentTotalGrams,
    percentUsed,
    isExceeded,
    hintText,
    items,
  }
}

// ─── Contextual Ingredient Suggester by Target Meal ───────────────────────────

export function getMealSpecificIngredientSuggestions(
  targetMeal: TargetMealType,
  profile?: NutritionProfile,
  currentTitle?: string
): { name: string; category: RecipeIngredient['category']; defaultGrams?: string }[] {
  const title = (currentTitle || '').toLowerCase().trim()
  const pool: { name: string; category: RecipeIngredient['category']; defaultGrams?: string }[] = []

  // 1. Meal Category specific items
  if (targetMeal === 'breakfast') {
    pool.push(
      { name: 'Yogurt greco magro', category: 'proteins', defaultGrams: '150g' },
      { name: 'Latte o bevanda vegetale', category: 'dairy', defaultGrams: '150ml' },
      { name: 'Fiocchi d\'avena', category: 'carbs', defaultGrams: '40g' },
      { name: 'Fette biscottate integrali', category: 'carbs', defaultGrams: '30g' },
      { name: 'Cioccolato fondente 85%', category: 'other', defaultGrams: '15g' },
      { name: 'Frutta fresca (banana o mela)', category: 'fruits', defaultGrams: '150g' },
      { name: 'Mandorle o noci', category: 'fats', defaultGrams: '20g' },
      { name: 'Marmellata senza zuccheri', category: 'other', defaultGrams: '20g' }
    )
  } else if (targetMeal === 'snack_am' || targetMeal === 'snack_pm') {
    pool.push(
      { name: 'Yogurt greco magro', category: 'proteins', defaultGrams: '150g' },
      { name: 'Frutta fresca', category: 'fruits', defaultGrams: '150g' },
      { name: 'Frutta secca (mandorle/noci)', category: 'fats', defaultGrams: '20g' },
      { name: 'Gallette di riso', category: 'carbs', defaultGrams: '25g' },
      { name: 'Cioccolato fondente 85%', category: 'other', defaultGrams: '15g' }
    )
  } else {
    // lunch, dinner, lunch_dinner
    pool.push(
      { name: 'Salmone fresco', category: 'proteins' },
      { name: 'Petto di pollo', category: 'proteins' },
      { name: 'Filetto di merluzzo o pesce bianco', category: 'proteins' },
      { name: 'Uova intere', category: 'proteins' },
      { name: 'Feta greca', category: 'proteins' },
      { name: 'Lenticchie secche', category: 'proteins' },
      { name: 'Ceci secchi', category: 'proteins' },
      { name: 'Patate', category: 'carbs', defaultGrams: '200g' },
      { name: 'Riso basmati', category: 'carbs' },
      { name: 'Pasta integrale', category: 'carbs' },
      { name: 'Pane integrale', category: 'carbs' },
      { name: 'Zucchine', category: 'vegetables' },
      { name: 'Spinaci freschi', category: 'vegetables' },
      { name: 'Pomodorini ciliegino', category: 'vegetables' },
      { name: 'Cipolla', category: 'vegetables' },
      { name: 'Broccoli', category: 'vegetables' },
      { name: 'Olio extravergine d\'oliva', category: 'fats', defaultGrams: '10g' }
    )
  }

  // 2. If title has specific cues, prioritize matching items
  if (title.length >= 3) {
    const titleSuggested = suggestIngredientsFromTitle(title, profile)
    // Prepend title suggested items that aren't already included
    titleSuggested.forEach(ts => {
      const idx = pool.findIndex(p => p.name.toLowerCase().includes(ts.name.toLowerCase()) || ts.name.toLowerCase().includes(p.name.toLowerCase()))
      if (idx >= 0) {
        // Move to front
        const [found] = pool.splice(idx, 1)
        pool.unshift(found)
      } else {
        pool.unshift(ts)
      }
    })
  }

  return pool
}
