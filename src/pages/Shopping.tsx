import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { getMonday, CATEGORY_LABELS, CATEGORY_COLORS, cn } from '@/lib/utils'
import { PageHeader, EmptyState, Badge } from '@/components/ui'
import type { ShoppingList, ShoppingItem } from '@/types'

const CATEGORY_ORDER = ['proteins', 'vegetables', 'carbs', 'fruits', 'dairy', 'fats', 'other'] as const

export default function ShoppingPage() {
  const [weekStart] = useState(getMonday())

  const shoppingLists = useLiveQuery(
    () => db.shoppingLists.orderBy('createdAt').reverse().limit(5).toArray(),
    []
  )

  const currentList = shoppingLists?.[0]

  const generateList = async () => {
    const { generateShoppingList } = await import('../lib/db')
    await generateShoppingList(weekStart)
  }

  const toggleItem = async (listId: string, itemId: string, checked: boolean) => {
    const list = await db.shoppingLists.get(listId)
    if (!list) return
    const items = list.items.map(i => i.id === itemId ? { ...i, isChecked: checked } : i)
    await db.shoppingLists.update(listId, { items, updatedAt: new Date() })
  }

  const exportList = (list: ShoppingList) => {
    const text = CATEGORY_ORDER
      .filter(cat => list.items.some(i => i.category === cat))
      .map(cat => {
        const catItems = list.items.filter(i => i.category === cat)
        const header = `\n${CATEGORY_LABELS[cat].toUpperCase()}\n${'─'.repeat(20)}`
        const rows = catItems.map(i => `${i.isChecked ? '✓' : '☐'} ${i.name} — ${i.quantity}${i.unit}`)
        return [header, ...rows].join('\n')
      })
      .join('\n')

    const fullText = `🛒 Lista della Spesa — NutriRecipe\n${'═'.repeat(35)}\n${text}`

    if (navigator.share) {
      navigator.share({ text: fullText, title: 'Lista della Spesa' }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(fullText)
      alert('Lista copiata negli appunti!')
    }
  }

  const groupedItems = (items: ShoppingItem[]) => {
    return CATEGORY_ORDER
      .map(cat => ({
        category: cat,
        items: items.filter(i => i.category === cat),
      }))
      .filter(g => g.items.length > 0)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      <PageHeader
        title="Lista della Spesa"
        action={
          currentList && (
            <button
              onClick={() => exportList(currentList)}
              className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium text-sm"
            >
              📤 Condividi
            </button>
          )
        }
      />

      <div className="px-4 pt-4 max-w-lg mx-auto">
        {!currentList ? (
          <EmptyState
            icon="🛒"
            title="Lista della spesa vuota"
            description="Pianifica la settimana nel Meal Planner, poi genera la lista della spesa automaticamente."
            action={
              <button onClick={generateList} className="btn-primary">
                Genera lista questa settimana
              </button>
            }
          />
        ) : (
          <>
            {/* Progress */}
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Completato: {currentList.items.filter(i => i.isChecked).length}/{currentList.items.length}
                </p>
                <button
                  onClick={generateList}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                >
                  Rigenera
                </button>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(currentList.items.filter(i => i.isChecked).length / currentList.items.length) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Items by category */}
            <div className="space-y-3">
              {groupedItems(currentList.items).map(({ category, items }) => (
                <div key={category} className="card overflow-hidden">
                  <div className={cn('px-4 py-2 border-b border-gray-100 dark:border-gray-800', CATEGORY_COLORS[category])}>
                    <p className="text-sm font-semibold">{CATEGORY_LABELS[category]}</p>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                    {items.map(item => (
                      <label
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={item.isChecked}
                          onChange={e => toggleItem(currentList.id, item.id, e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 dark:border-gray-700 text-primary-500 accent-primary-500"
                        />
                        <div className="flex-1">
                          <p className={cn(
                            'text-sm font-medium',
                            item.isChecked ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'
                          )}>
                            {item.name}
                          </p>
                          {item.recipes.length > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{item.recipes.length} ricett{item.recipes.length > 1 ? 'e' : 'a'}</p>
                          )}
                        </div>
                        <span className={cn(
                          'text-sm font-bold',
                          item.isChecked ? 'text-gray-400 dark:text-gray-600' : 'text-primary-600 dark:text-primary-400'
                        )}>
                          {item.quantity}{item.unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="h-4" />
          </>
        )}
      </div>
    </div>
  )
}
