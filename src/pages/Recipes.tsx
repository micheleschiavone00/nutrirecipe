import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { MEAL_LABELS, MEAL_ICONS, cn } from '@/lib/utils'
import { PageHeader, EmptyState, Badge } from '@/components/ui'
import { detectRecipeIcon } from '@/lib/recipeIcons'
import type { Recipe, TargetMealType } from '@/types'

const FILTER_OPTIONS: { value: TargetMealType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'lunch_dinner', label: '☀️🌙 Pranzo e Cena' },
  { value: 'lunch', label: '☀️ Pranzo' },
  { value: 'dinner', label: '🌙 Cena' },
  { value: 'breakfast', label: '🌅 Colazione' },
  { value: 'snack_am', label: '🍎 Spuntino' },
]

export default function RecipesPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<TargetMealType | 'all'>('all')
  const [search, setSearch] = useState('')

  const allRecipes = useLiveQuery(
    () => db.recipes.orderBy('createdAt').reverse().toArray(),
    []
  )

  const filtered = allRecipes?.filter(r => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (filter === 'all') return true
    if (filter === 'lunch_dinner') return r.targetMeal === 'lunch_dinner'
    if (filter === 'lunch') return r.targetMeal === 'lunch' || r.targetMeal === 'lunch_dinner'
    if (filter === 'dinner') return r.targetMeal === 'dinner' || r.targetMeal === 'lunch_dinner'
    return r.targetMeal === filter
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Il mio Ricettario"
        subtitle={`${allRecipes?.length ?? 0} ricette salvate`}
        action={
          <button
            onClick={() => navigate('/import')}
            className="w-10 h-10 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all"
          >
            +
          </button>
        }
      />

      {/* Search */}
      <div className="px-4 pt-3">
        <input
          type="search"
          placeholder="🔍 Cerca ricette…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              filter === opt.value
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {filtered === undefined ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="Nessuna ricetta trovata"
            description={search ? 'Prova con un altro termine di ricerca' : 'Importa la tua prima ricetta da TikTok o Instagram!'}
            action={
              !search ? (
                <button onClick={() => navigate('/import')} className="btn-primary">
                  Importa ricetta 🎥
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => navigate(`/recipes/${recipe.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await db.recipes.update(recipe.id, { isFavorite: !recipe.isFavorite })
  }

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer active:scale-95 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
        {recipe.thumbnailUrl ? (
          <img src={recipe.thumbnailUrl} alt={recipe.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">
            {recipe.customIcon || detectRecipeIcon(recipe.title, recipe.adaptedIngredients, recipe.targetMeal)}
          </span>
        )}
        {/* Source badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="default" className="text-xs capitalize bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 border border-transparent dark:border-gray-700/80">
            {recipe.source}
          </Badge>
        </div>
        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 w-7 h-7 bg-white/90 dark:bg-gray-900/90 rounded-full flex items-center justify-center border border-transparent dark:border-gray-700/80"
        >
          {recipe.isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-2">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">{MEAL_LABELS[recipe.targetMeal]}</span>
          {recipe.variants && recipe.variants.length > 1 && (
            <span className="bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-primary-200/60 dark:border-primary-800 ml-auto">
              {recipe.variants.length} opzioni
            </span>
          )}
        </div>
        {recipe.nutritionalValues && (
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-orange-500 font-semibold">{recipe.nutritionalValues.calories} kcal</span>
            <span className="text-red-400">{recipe.nutritionalValues.proteins}g P</span>
          </div>
        )}
        {recipe.prepTime && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400">⏱ {recipe.prepTime + (recipe.cookTime ?? 0)} min</span>
          </div>
        )}
      </div>
    </div>
  )
}
