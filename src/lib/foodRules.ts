import type { WeeklyFrequencyRule, Recipe, WeeklyTemplateMeal, PlannedMeal } from '@/types'

export type FoodCategory =
  | 'red_meat'
  | 'white_meat'
  | 'fish'
  | 'legumes'
  | 'eggs'
  | 'dairy'
  | 'cheat'
  | 'vegetarian'
  | 'other'

export const FOOD_CATEGORY_INFO: Record<
  FoodCategory,
  {
    label: string
    icon: string
    badgeColor: string
    defaultMax?: number
    defaultTarget?: number
    defaultMin?: number
    description: string
  }
> = {
  red_meat: {
    label: 'Carne Rossa',
    icon: '🥩',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    defaultMax: 3,
    description: 'Manzo, maiale, vitello, agnello, macinato, hamburger, tagliata',
  },
  fish: {
    label: 'Pesce',
    icon: '🐟',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    defaultMin: 3,
    defaultTarget: 4,
    description: 'Salmone, tonno, merluzzo, orata, spigola, gamberi, polpo, trota',
  },
  white_meat: {
    label: 'Carne Bianca',
    icon: '🍗',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultTarget: 3,
    description: 'Pollo, tacchino, coniglio, fesa, straccetti',
  },
  legumes: {
    label: 'Legumi',
    icon: '🫘',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultMin: 2,
    defaultTarget: 3,
    description: 'Ceci, lenticchie, fagioli, piselli, edamame, soia, tofu, tempeh',
  },
  eggs: {
    label: 'Uova',
    icon: '🥚',
    badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    defaultMax: 3,
    description: 'Uova intere, frittate, omelette, crêpes di uova',
  },
  dairy: {
    label: 'Formaggi e Latticini',
    icon: '🧀',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultMax: 2,
    description: 'Feta, ricotta, mozzarella, fiocchi di latte, grana, parmigiano',
  },
  cheat: {
    label: 'Pasto Libero / Sgarro',
    icon: '🍕',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultTarget: 1,
    defaultMax: 1,
    description: 'Pizza, burger gourmet, sushi, cena fuori, dessert libero',
  },
  vegetarian: {
    label: 'Piatto Vegetariano',
    icon: '🥗',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    description: 'Piatti a base di cereali, verdure e semi senza carne o pesce',
  },
  other: {
    label: 'Altro / Cereali',
    icon: '🍽️',
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Cereali, pasta, riso, snack, colazioni',
  },
}

export const DEFAULT_WEEKLY_RULES: WeeklyFrequencyRule[] = [
  {
    id: 'red_meat',
    category: 'red_meat',
    label: 'Carne Rossa',
    maxPerWeek: 3,
    notes: 'Massimo 3 volte a settimana (preferire tagli magri)',
  },
  {
    id: 'fish',
    category: 'fish',
    label: 'Pesce',
    targetPerWeek: 4,
    minPerWeek: 3,
    notes: 'Almeno 3-4 volte a settimana (azzurro o bianco)',
  },
  {
    id: 'white_meat',
    category: 'white_meat',
    label: 'Carne Bianca',
    targetPerWeek: 3,
    notes: '2-3 volte a settimana (pollo, tacchino)',
  },
  {
    id: 'legumes',
    category: 'legumes',
    label: 'Legumi',
    targetPerWeek: 3,
    minPerWeek: 2,
    notes: '2-3 volte a settimana come fonte proteica vegetale',
  },
  {
    id: 'eggs',
    category: 'eggs',
    label: 'Uova',
    maxPerWeek: 3,
    notes: '2-3 volte a settimana',
  },
  {
    id: 'dairy',
    category: 'dairy',
    label: 'Formaggi e Latticini',
    maxPerWeek: 2,
    notes: '1-2 volte a settimana',
  },
  {
    id: 'cheat',
    category: 'cheat',
    label: 'Pasto Libero / Sgarro',
    targetPerWeek: 1,
    maxPerWeek: 1,
    notes: '1 pasto libero a settimana (es. Sabato sera o Domenica)',
  },
]

// ─── Classification Engine ───────────────────────────────────────────────────

const KEYWORDS_CHEAT = [
  'libero', 'cheat', 'pizza', 'sgarro', 'hamburger gourmet', 'cena fuori',
  'sushi all you can eat', 'aperitivo', 'pub', 'patatine fritte', 'dolce libero'
]

const KEYWORDS_RED_MEAT = [
  'manzo', 'maiale', 'vitello', 'bistecca', 'hamburger', 'macinato', 'lonza',
  'speck', 'bresaola', 'prosciutto crudo', 'pancetta', 'salsiccia', 'pulled pork',
  'tagliata', 'agnello', 'cavallo', 'carne rossa', 'fiorentina', 'straccetti di manzo',
  'filetto di manzo', 'costine', 'arista'
]

const KEYWORDS_FISH = [
  'salmone', 'tonno', 'pesce', 'orata', 'spigola', 'merluzzo', 'nasello',
  'platessa', 'pescespada', 'pesce spada', 'gamberi', 'gamberetti', 'calamari',
  'polpo', 'trota', 'sarde', 'alici', 'branzino', 'baccalà', 'cozze', 'vongole',
  'crostacei', 'seppie', 'spada', 'frutti di mare', 'tartare di salmone', 'tartare di tonno'
]

const KEYWORDS_WHITE_MEAT = [
  'pollo', 'tacchino', 'coniglio', 'fesa', 'straccetti di pollo', 'sovracoscia',
  'petto di pollo', 'fesa di tacchino', 'alette di pollo'
]

const KEYWORDS_LEGUMES = [
  'ceci', 'lenticchie', 'fagioli', 'piselli', 'edamame', 'tofu', 'tempeh',
  'soia', 'hummus', 'lupini', 'farina di ceci', 'pasta di lenticchie', 'burger vegetale'
]

const KEYWORDS_EGGS = [
  'uova', 'uovo', 'albume', 'frittata', 'omelette', 'uova strapazzate'
]

const KEYWORDS_DAIRY = [
  'feta', 'ricotta', 'mozzarella', 'fiocchi di latte', 'parmigiano', 'grana',
  'stracchino', 'yogurt greco', 'quartirolo', 'gorgonzola', 'burrata', 'primosale', 'scamorza'
]

export function detectFoodCategory(item: {
  title?: string
  tags?: string[]
  adaptedIngredients?: { name: string }[]
  originalIngredients?: { name: string }[]
  customLabel?: string
  isCheatMeal?: boolean
}): FoodCategory {
  if (item.isCheatMeal) return 'cheat'

  const customText = (item.customLabel || '').toLowerCase()
  if (KEYWORDS_CHEAT.some(k => customText.includes(k))) return 'cheat'

  const textToCheck = [
    item.title || '',
    ...(item.tags || []),
    ...(item.adaptedIngredients || []).map(i => i.name),
    ...(item.originalIngredients || []).map(i => i.name),
    item.customLabel || '',
  ]
    .join(' ')
    .toLowerCase()

  if (KEYWORDS_CHEAT.some(k => textToCheck.includes(k))) return 'cheat'
  if (KEYWORDS_FISH.some(k => textToCheck.includes(k))) return 'fish'
  if (KEYWORDS_RED_MEAT.some(k => textToCheck.includes(k))) return 'red_meat'
  if (KEYWORDS_WHITE_MEAT.some(k => textToCheck.includes(k))) return 'white_meat'
  if (KEYWORDS_LEGUMES.some(k => textToCheck.includes(k))) return 'legumes'
  if (KEYWORDS_EGGS.some(k => textToCheck.includes(k))) return 'eggs'
  if (KEYWORDS_DAIRY.some(k => textToCheck.includes(k))) return 'dairy'

  return 'other'
}

// ─── Weekly Evaluation & Advisor ─────────────────────────────────────────────

export interface WeeklyCounts {
  red_meat: number
  white_meat: number
  fish: number
  legumes: number
  eggs: number
  dairy: number
  cheat: number
  other: number
}

export interface AdvisorNotice {
  id: string
  type: 'cheat_reminder' | 'limit_warning' | 'suggestion' | 'success'
  title: string
  message: string
  category?: FoodCategory
  actionType?: 'set_cheat' | 'suggest_fish' | 'suggest_legumes'
}

export function countWeeklyFrequencies(
  meals: (WeeklyTemplateMeal | PlannedMeal)[],
  recipesMap: Record<string, Recipe>
): WeeklyCounts {
  const counts: WeeklyCounts = {
    red_meat: 0,
    white_meat: 0,
    fish: 0,
    legumes: 0,
    eggs: 0,
    dairy: 0,
    cheat: 0,
    other: 0,
  }

  for (const meal of meals) {
    if (meal.isCheatMeal) {
      counts.cheat++
      continue
    }

    const recipe = meal.recipeId ? recipesMap[meal.recipeId] : null
    const cat = detectFoodCategory({
      title: recipe?.title,
      tags: recipe?.tags,
      adaptedIngredients: recipe?.adaptedIngredients,
      originalIngredients: recipe?.originalIngredients,
      customLabel: meal.customLabel,
      isCheatMeal: meal.isCheatMeal,
    })

    if (cat in counts) {
      counts[cat as keyof WeeklyCounts]++
    } else {
      counts.other++
    }
  }

  return counts
}

export function evaluateWeeklyPlan(
  meals: WeeklyTemplateMeal[],
  recipesMap: Record<string, Recipe>,
  customRules?: WeeklyFrequencyRule[],
  currentDayOffset: number = 0
): {
  counts: WeeklyCounts
  rules: WeeklyFrequencyRule[]
  cheatMealPlaced: boolean
  cheatMealDay: number | null
  notices: AdvisorNotice[]
} {
  const rules = (customRules && customRules.length > 0) ? customRules : DEFAULT_WEEKLY_RULES
  const counts = countWeeklyFrequencies(meals, recipesMap)

  // Find where cheat meal is placed if any
  let cheatMealPlaced = false
  let cheatMealDay: number | null = null

  meals.forEach(m => {
    if (m.isCheatMeal || (m.customLabel && KEYWORDS_CHEAT.some(k => m.customLabel!.toLowerCase().includes(k)))) {
      cheatMealPlaced = true
      cheatMealDay = m.dayOffset
    }
  })

  const notices: AdvisorNotice[] = []

  // 1. Cheat Meal Reminder for Saturday / Sunday
  if (!cheatMealPlaced && (currentDayOffset === 5 || currentDayOffset === 6)) {
    const dayName = currentDayOffset === 5 ? 'Sabato' : 'Domenica'
    notices.push({
      id: 'cheat_reminder',
      type: 'cheat_reminder',
      title: `🍕 Promemoria Pasto Libero (${dayName})`,
      message: `Non hai ancora posizionato il tuo pasto libero questa settimana! Molti piani nutrizionali consigliano ${dayName} sera. Vuoi impostare la Cena di ${dayName} come Pasto Libero?`,
      category: 'cheat',
      actionType: 'set_cheat',
    })
  }

  // 2. Limit Warnings (e.g. Red Meat >= max)
  const redMeatRule = rules.find(r => r.category === 'red_meat')
  const redMeatMax = redMeatRule?.maxPerWeek ?? 3
  if (counts.red_meat >= redMeatMax) {
    notices.push({
      id: 'red_meat_limit',
      type: 'limit_warning',
      title: '⚠️ Limite Carne Rossa Raggiunto',
      message: `Hai già inserito Carne Rossa ${counts.red_meat}/${redMeatMax} volte questa settimana. Per oggi ti suggeriamo Pesce o Legumi per bilanciare il piano!`,
      category: 'red_meat',
    })
  }

  // 3. Suggestions for under-represented healthy categories (e.g. Fish or Legumes)
  const fishRule = rules.find(r => r.category === 'fish')
  const fishTarget = fishRule?.targetPerWeek ?? 4
  const fishMin = fishRule?.minPerWeek ?? 3

  if (counts.fish < fishMin && currentDayOffset >= 2) {
    notices.push({
      id: 'fish_suggestion',
      type: 'suggestion',
      title: '🐟 Suggerimento Pesce',
      message: `Questa settimana hai pianificato Pesce solo ${counts.fish} volte su ${fishTarget} consigliate. Aggiungilo oggi per fare il pieno di Omega-3 e proteine nobili!`,
      category: 'fish',
      actionType: 'suggest_fish',
    })
  }

  const legumesRule = rules.find(r => r.category === 'legumes')
  const legumesMin = legumesRule?.minPerWeek ?? 2
  if (counts.legumes < legumesMin && currentDayOffset >= 3) {
    notices.push({
      id: 'legumes_suggestion',
      type: 'suggestion',
      title: '🫘 Suggerimento Legumi',
      message: `Hai inserito legumi solo ${counts.legumes} volte finora. Una pasta e ceci o un burger di lenticchie sarebbero perfetti!`,
      category: 'legumes',
      actionType: 'suggest_legumes',
    })
  }

  return {
    counts,
    rules,
    cheatMealPlaced,
    cheatMealDay,
    notices,
  }
}

export function checkRecipeRecommendation(
  recipe: Recipe,
  counts: WeeklyCounts,
  rules: WeeklyFrequencyRule[]
): {
  category: FoodCategory
  status: 'recommended' | 'neutral' | 'discouraged'
  badge?: string
  reason?: string
} {
  const cat = detectFoodCategory({
    title: recipe.title,
    tags: recipe.tags,
    adaptedIngredients: recipe.adaptedIngredients,
    originalIngredients: recipe.originalIngredients,
  })

  const rule = rules.find(r => r.category === cat)

  // Red Meat Limit check
  if (cat === 'red_meat') {
    const max = rule?.maxPerWeek ?? 3
    if (counts.red_meat >= max) {
      return {
        category: cat,
        status: 'discouraged',
        badge: '⚠️ Limite Raggiunto (3/3)',
        reason: `Hai già pianificato Carne Rossa ${counts.red_meat}/${max} volte questa settimana.`,
      }
    }
  }

  // Fish Recommendation
  if (cat === 'fish') {
    const target = rule?.targetPerWeek ?? 4
    if (counts.fish < target) {
      return {
        category: cat,
        status: 'recommended',
        badge: `✨ Consigliato (${counts.fish}/${target} Pesce)`,
        reason: `Ottimo per raggiungere l'obiettivo settimanale di pesce (${counts.fish}/${target}).`,
      }
    }
  }

  // Legumes Recommendation
  if (cat === 'legumes') {
    const target = rule?.targetPerWeek ?? 3
    if (counts.legumes < target) {
      return {
        category: cat,
        status: 'recommended',
        badge: `✨ Consigliato (${counts.legumes}/${target} Legumi)`,
        reason: `Consigliato per variare le fonti proteiche vegetali.`,
      }
    }
  }

  // White meat
  if (cat === 'white_meat') {
    return {
      category: cat,
      status: 'neutral',
      badge: '🍗 Carne Bianca',
    }
  }

  return {
    category: cat,
    status: 'neutral',
  }
}
