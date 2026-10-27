import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { MealType, TargetMealType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MEAL_LABELS: Record<TargetMealType, string> = {
  breakfast: 'Colazione',
  snack_am: 'Spuntino mattina',
  lunch: 'Pranzo',
  dinner: 'Cena',
  lunch_dinner: 'Pranzo e Cena',
  snack_pm: 'Merenda',
}

export const MEAL_ICONS: Record<TargetMealType, string> = {
  breakfast: '🌅',
  snack_am: '🍎',
  lunch: '☀️',
  dinner: '🌙',
  lunch_dinner: '☀️🌙',
  snack_pm: '🍪',
}

export const CATEGORY_LABELS = {
  carbs: 'Carboidrati',
  proteins: 'Proteine',
  vegetables: 'Verdure',
  fruits: 'Frutta',
  dairy: 'Latticini',
  fats: 'Grassi',
  other: 'Altro',
} as const

export const CATEGORY_ICONS: Record<string, string> = {
  proteins: '🥩',
  carbs: '🌾',
  vegetables: '🥦',
  fruits: '🍎',
  dairy: '🥛',
  fats: '🥑',
  other: '🍴',
}

export const CATEGORY_COLORS = {
  carbs: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
  proteins: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60',
  vegetables: 'bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300 border-green-200 dark:border-emerald-800/60',
  fruits: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
  dairy: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
  fats: 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/60',
  other: 'bg-gray-100 dark:bg-gray-800/60 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700/60',
} as const

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export function getMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function formatDayLabel(dateStr: string, short = false): string {
  const date = new Date(dateStr)
  if (short) {
    return date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}
