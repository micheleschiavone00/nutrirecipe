import { useState } from 'react'
import { RECIPE_EMOJI_CATEGORIES } from '@/lib/recipeIcons'

interface RecipeIconPickerModalProps {
  isOpen: boolean
  currentIcon: string
  recipeTitle?: string
  onSelectIcon: (icon: string) => Promise<void> | void
  onClose: () => void
}

export default function RecipeIconPickerModal({
  isOpen,
  currentIcon,
  recipeTitle,
  onSelectIcon,
  onClose,
}: RecipeIconPickerModalProps) {
  const [customEmoji, setCustomEmoji] = useState('')

  if (!isOpen) return null

  const handlePick = async (emoji: string) => {
    await onSelectIcon(emoji)
    onClose()
  }

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (customEmoji.trim()) {
      await onSelectIcon(customEmoji.trim())
      setCustomEmoji('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-scale-up max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              Personalizza Icona
            </span>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {recipeTitle || 'Scegli icona ricetta'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center text-sm font-bold flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Icona Attuale */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-3xl shadow-xs">
            {currentIcon || '🍽️'}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Icona attuale</p>
            <p className="text-[10.5px] text-gray-400 dark:text-gray-500">
              Tocca un&apos;emoji qui sotto per impostarla
            </p>
          </div>
        </div>

        {/* Input Emoji Personalizzata */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            type="text"
            maxLength={4}
            placeholder="Digita emoji personalizzata..."
            value={customEmoji}
            onChange={e => setCustomEmoji(e.target.value)}
            className="input-field text-center text-base py-2 flex-1"
          />
          <button
            type="submit"
            disabled={!customEmoji.trim()}
            className="btn-primary py-2 px-3 text-xs font-bold rounded-xl"
          >
            Imposta
          </button>
        </form>

        {/* Palette Categorizzata Scrollabile */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1 scrollbar-hide">
          {RECIPE_EMOJI_CATEGORIES.map(cat => (
            <div key={cat.name} className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {cat.name}
              </p>
              <div className="grid grid-cols-6 gap-2">
                {cat.emojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handlePick(emoji)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90 border ${
                      currentIcon === emoji
                        ? 'bg-primary-50 dark:bg-primary-950/80 border-primary-500 ring-2 ring-primary-500 shadow-sm scale-105'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
