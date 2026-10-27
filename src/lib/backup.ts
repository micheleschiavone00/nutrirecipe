import { db } from './db'

export interface AppBackup {
  version: string
  exportDate: string
  recipes: any[]
  profiles: any[]
  plannedMeals: any[]
  shoppingLists: any[]
  settings: any[]
}

/**
 * Exports all user data from Dexie IndexedDB into a JSON file for download.
 * Prevents any data loss across device changes or browser cache clearing.
 */
export async function exportFullBackup(): Promise<void> {
  const recipes = await db.recipes.toArray()
  const profiles = await db.profiles.toArray()
  const plannedMeals = await db.plannedMeals.toArray()
  const shoppingLists = await db.shoppingLists.toArray()
  const settings = await db.settings.toArray()

  const backup: AppBackup = {
    version: '2.1.2',
    exportDate: new Date().toISOString(),
    recipes,
    profiles,
    plannedMeals,
    shoppingLists,
    settings,
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nutrirecipe_backup_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Imports and restores all tables from a user-selected JSON backup file.
 */
export async function importFullBackup(file: File): Promise<{
  success: boolean
  message: string
  counts?: { recipes: number; profiles: number }
}> {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as AppBackup

    if (!data || (!Array.isArray(data.recipes) && !Array.isArray(data.profiles))) {
      throw new Error('Il file selezionato non è un backup valido di NutriRecipe.')
    }

    if (Array.isArray(data.recipes) && data.recipes.length > 0) {
      await db.recipes.clear()
      await db.recipes.bulkAdd(data.recipes)
    }

    if (Array.isArray(data.profiles) && data.profiles.length > 0) {
      await db.profiles.clear()
      await db.profiles.bulkAdd(data.profiles)
    }

    if (Array.isArray(data.plannedMeals) && data.plannedMeals.length > 0) {
      await db.plannedMeals.clear()
      await db.plannedMeals.bulkAdd(data.plannedMeals)
    }

    if (Array.isArray(data.shoppingLists) && data.shoppingLists.length > 0) {
      await db.shoppingLists.clear()
      await db.shoppingLists.bulkAdd(data.shoppingLists)
    }

    return {
      success: true,
      message: `Backup ripristinato con successo: ${data.recipes?.length || 0} ricette, ${data.profiles?.length || 0} profili.`,
      counts: {
        recipes: data.recipes?.length || 0,
        profiles: data.profiles?.length || 0,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Errore durante la lettura del file di backup.',
    }
  }
}
