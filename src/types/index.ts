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
  mealType: MealType
  label: string
  groups: FoodGroup[]
  notes?: string
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

export interface Recipe {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  sourceUrl?: string
  source: RecipeSource
  targetMeal: TargetMealType
  originalIngredients: RecipeIngredient[]
  adaptedIngredients: RecipeIngredient[]
  steps: RecipeStep[]
  nutritionalValues?: NutritionalValues
  adaptationNotes?: string    // spiegazione AI di come è stato adattato
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
  customLabel?: string        // se non è una ricetta salvata
  isCompleted: boolean
}

export interface WeekPlan {
  weekStart: string           // ISO date YYYY-MM-DD (lunedì)
  plannedMeals: PlannedMeal[]
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
  store?: string
}

export interface ShoppingList {
  id: string
  weekStart: string
  items: ShoppingItem[]
  createdAt: Date
  updatedAt: Date
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  openAIApiKey: string
  rapidApiKey: string
  activeProfileId?: string
  language: 'it' | 'en'
  theme: 'light' | 'dark' | 'system'
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
