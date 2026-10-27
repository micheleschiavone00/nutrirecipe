// ─── Nutrition Plan Types ────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack_am' | 'snack_pm'
export type TargetMealType = MealType | 'lunch_dinner'

export interface FoodGroup {
  id: string
  name: string        // es. "Carboidrati", "Proteine", "Verdura"
  category: 'carbs' | 'proteins' | 'vegetables' | 'fruits' | 'dairy' | 'fats' | 'other'
  options: FoodOption[]
  minQuantity?: number   // grammi min
  maxQuantity?: number   // grammi max
  unit: 'g' | 'ml' | 'pieces' | 'portions'
  notes?: string
}

export interface FoodOption {
  name: string
  quantity: number
  unit: 'g' | 'ml' | 'pieces'
  calories?: number
  proteins?: number
  carbs?: number
  fats?: number
}

export interface MealPlan {
  id?: string
  mealType: MealType
  label: string
  isVariant?: boolean
  variantName?: string        // es. "Post Workout", "Giorni Riposo"
  groups: FoodGroup[]
  notes?: string
}

export interface WeeklyFrequencyRule {
  id: string
  category: 'red_meat' | 'white_meat' | 'fish' | 'legumes' | 'eggs' | 'dairy' | 'cheat' | 'other'
  label: string               // es. "Carne Rossa", "Pesce", "Legumi", "Uova", "Pasto Libero"
  maxPerWeek?: number         // es. max 3 volte a settimana
  minPerWeek?: number         // es. min 2 volte
  targetPerWeek?: number      // es. 3 volte
  notes?: string              // es. "Massimo 3 volte a settimana"
}

export interface NutritionProfile {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  meals: MealPlan[]
  dailyCalories?: number
  dailyProteins?: number
  dailyCarbs?: number
  dailyFats?: number
  nutritionistNotes?: string
  weeklyFrequencies?: WeeklyFrequencyRule[]
  cheatMealsPerWeek?: number  // es. 1 pasto libero a settimana (default: 1)
}

// ─── Recipe Types ─────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string
  originalQuantity: string    // es. "200g"
  adaptedQuantity: string     // es. "150g (adattato al tuo piano)"
  unit: string
  category: FoodGroup['category']
  component?: string          // es. "Per il panino", "Per il pulled pork", "Per la salsa", "Impasto"
  isOptional?: boolean
}

export interface RecipeStep {
  order: number
  description: string
  duration?: string           // es. "5 minuti"
  tip?: string
}

export interface NutritionalValues {
  calories: number
  proteins: number
  carbs: number
  fats: number
  fiber?: number
}

export type RecipeSource = 'tiktok' | 'instagram' | 'youtube' | 'manual'
export type DishType = 'complete' | 'main' | 'side'

export interface RecipeMealVariant {
  id: string                  // es. "lunch", "dinner", "dinner_post_workout"
  label: string               // es. "☀️ Pranzo", "🌙 Cena", "💪 Cena Post Workout"
  mealType: MealType
  isVariant?: boolean
  adaptedIngredients: RecipeIngredient[]
  steps: RecipeStep[]
  nutritionalValues?: NutritionalValues
  adaptationNotes?: string
}

export interface Recipe {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  sourceUrl?: string
  source: RecipeSource
  targetMeal: TargetMealType
  dishType?: DishType         // 'complete' = piatto unico bilanciato, 'main' = primo/secondo, 'side' = contorno
  originalIngredients: RecipeIngredient[]
  adaptedIngredients: RecipeIngredient[]
  steps: RecipeStep[]
  nutritionalValues?: NutritionalValues
  adaptationNotes?: string    // spiegazione AI di come è stato adattato
  variants?: RecipeMealVariant[] // Varianti separate (es. Pranzo, Cena, Cena Post Workout)
  tags: string[]
  rating?: number             // 1-5
  personalNotes?: string
  prepTime?: number           // minuti
  cookTime?: number           // minuti
  servings: number
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── Meal Planner Types ───────────────────────────────────────────────────────

export interface PlannedMeal {
  id: string
  date: string                // ISO date string YYYY-MM-DD
  mealType: MealType
  recipeId?: string
  variantId?: string          // id della variante scelta (es. "lunch", "dinner", "dinner_post_workout")
  variantLabel?: string       // etichetta della variante
  customLabel?: string        // se non è una ricetta salvata
  isCheatMeal?: boolean       // pasto libero / sgarro
  isCompleted: boolean
}

export interface WeekPlan {
  weekStart: string           // ISO date YYYY-MM-DD (lunedì)
  plannedMeals: PlannedMeal[]
}

export interface WeeklyTemplateMeal {
  dayOffset: number           // 0 = Lunedì, 1 = Martedì, ..., 6 = Domenica
  mealType: MealType
  recipeId?: string
  variantId?: string
  variantLabel?: string
  customLabel?: string
  isCheatMeal?: boolean       // pasto libero / sgarro
}

export interface WeeklyTemplate {
  id: string
  name: string
  description?: string
  meals: WeeklyTemplateMeal[]
  createdAt: Date
}

// ─── Shopping List Types ──────────────────────────────────────────────────────

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: FoodGroup['category']
  recipes: string[]           // recipe IDs che lo richiedono
  isChecked: boolean
  price?: number              // prezzo pagato / confermato al checkout
  estimatedPrice?: number     // prezzo stimato dalla memoria prezzi
  store?: string
}

export interface ShoppingList {
  id: string
  weekStart: string
  items: ShoppingItem[]
  createdAt: Date
  updatedAt: Date
}

// ─── Pantry & Food Price Types ────────────────────────────────────────────────

export interface PantryItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: FoodGroup['category']
  purchaseDate: string        // ISO date YYYY-MM-DD
  expiryDate?: string         // ISO date YYYY-MM-DD
  pricePaid?: number
  isDepleted?: boolean        // esaurito / da ricomprare
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface FoodPrice {
  name: string                // lowercase trimmed name
  lastPrice: number
  unit?: string
  updatedAt: Date
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  openAIApiKey: string
  rapidApiKey: string
  activeProfileId?: string
  language: 'it' | 'en'
  theme: 'light' | 'dark' | 'system'
  mealVoucherEnabled?: boolean
  mealVoucherValue?: number   // es. 8.00 €
  mealVoucherCount?: number   // buoni pasto totali a disposizione
}

// ─── Import Job ───────────────────────────────────────────────────────────────

export type ImportStatus = 'idle' | 'extracting' | 'analyzing' | 'adapting' | 'done' | 'error'

export interface ImportJob {
  id: string
  url: string
  source: RecipeSource
  status: ImportStatus
  error?: string
  rawData?: Record<string, unknown>
  recipe?: Recipe
  createdAt: Date
}
