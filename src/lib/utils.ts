import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { MealType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Colazione',
  snack_am: '🍎 Spuntino mattina',
  lunch: '☀️ Pranzo',
  snack_pm: '🍪 Merenda',
  dinner: '🌙 Cena',
}

export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: '🌅',
  snack_am: '🍎',
  lunch: '☀️',
  snack_pm: '🍪',
  dinner: '🌙',
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

export const CATEGORY_COLORS = {
  carbs: 'bg-amber-100 text-amber-800',
  proteins: 'bg-red-100 text-red-800',
  vegetables: 'bg-green-100 text-green-800',
  fruits: 'bg-purple-100 text-purple-800',
  dairy: 'bg-blue-100 text-blue-800',
  fats: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
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
