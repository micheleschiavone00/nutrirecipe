import type { NutritionProfile, Recipe, MealType, FoodGroup } from '@/types'
import { CONFIG } from '@/config'

async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model = 'gpt-4o',
): Promise<string> {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (CONFIG.openAIApiKey) {
    headers['x-openai-key'] = CONFIG.openAIApiKey
  }

  const response = await fetch(`${apiBase}/api/ai`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? `OpenAI error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.content
}

// ─── PDF / Text Analysis ─────────────────────────────────────────────────────

export async function analyzePDFText(pdfText: string): Promise<NutritionProfile['meals']> {
  if (!pdfText || pdfText.trim().length < 15) {
    throw new Error(
      'Il testo del piano nutrizionale è vuoto o troppo breve. Se il PDF è una scansione (immagine), prova a incollare il testo direttamente.'
    )
  }

  const systemPrompt = `Sei un esperto nutrizionista AI. Analizza il testo del piano nutrizionale e restituisci un JSON strutturato con TUTTI i pasti presenti.
  
Il JSON deve avere questa forma esatta:
{
  "meals": [
    {
      "mealType": "breakfast",
      "label": "🌅 Colazione",
      "groups": [
        {
          "name": "Latticini o Yogurt",
          "category": "dairy",
          "unit": "g",
          "options": [
            { "name": "Yogurt greco 0%", "quantity": 150, "unit": "g" },
            { "name": "Latte scremato", "quantity": 200, "unit": "ml" }
          ]
        }
      ]
    }
  ]
}

Regole fondamentali:
1. I valori ammessi per "mealType" sono solo: "breakfast", "snack_am", "lunch", "snack_pm", "dinner".
2. I valori ammessi per "category" sono solo: "carbs", "proteins", "vegetables", "fruits", "dairy", "fats", "other".
3. "quantity" deve essere sempre un NUMERO intero (es. 150, NON "150g").
4. Estrai tutte le alternative possibili fornite dalla nutrizionista come elementi dentro "options".
5. Restituisci SOLO ed esclusivamente l'oggetto JSON, senza testo o markdown prima o dopo.`

  const userPrompt = `Analizza questo piano nutrizionale ed estrai pasti, gruppi alimentari, alimenti alternativi e relative grammature:\n\n${pdfText}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  let parsed: any
  try {
    parsed = JSON.parse(result)
  } catch {
    throw new Error('Risposta AI non valida. Riprova tra qualche istante.')
  }

  const rawMeals = Array.isArray(parsed?.meals) ? parsed.meals : []
  if (rawMeals.length === 0) {
    throw new Error(
      "L'AI non ha rilevato pasti con grammature nel testo fornito. Assicurati che contenga indicazioni per i pasti (es. colazione, pranzo, cena)."
    )
  }

  // Normalizza e valida i pasti in modo che i campi React non siano mai vuoti o con NaN
  const normalizedMeals: NutritionProfile['meals'] = rawMeals.map((meal: any, mIdx: number) => {
    const mealType = ['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'].includes(meal.mealType)
      ? meal.mealType
      : 'lunch'

    const groups = Array.isArray(meal.groups)
      ? meal.groups.map((group: any, gIdx: number) => {
          const options = Array.isArray(group.options) && group.options.length > 0
            ? group.options.map((opt: any) => {
                let qty =
                  typeof opt.quantity === 'number'
                    ? opt.quantity
                    : parseFloat(String(opt.quantity || '100').replace(/[^0-9.,]/g, '').replace(',', '.'))
                if (isNaN(qty) || qty <= 0) qty = 100

                return {
                  name: String(opt.name || 'Alimento').trim(),
                  quantity: Math.round(qty),
                  unit: String(opt.unit || group.unit || 'g').trim() || 'g',
                  calories: typeof opt.calories === 'number' ? opt.calories : undefined,
                  proteins: typeof opt.proteins === 'number' ? opt.proteins : undefined,
                  carbs: typeof opt.carbs === 'number' ? opt.carbs : undefined,
                  fats: typeof opt.fats === 'number' ? opt.fats : undefined,
                }
              })
            : [{ name: 'Porzione', quantity: 100, unit: 'g' }]

          return {
            id: `grp-${mIdx}-${gIdx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: String(group.name || 'Gruppo alimento').trim(),
            category: (['carbs', 'proteins', 'vegetables', 'fruits', 'dairy', 'fats', 'other'].includes(
              group.category
            )
              ? group.category
              : 'other') as FoodGroup['category'],
            unit: String(group.unit || 'g').trim() || 'g',
            options,
            minQuantity: typeof group.minQuantity === 'number' ? group.minQuantity : undefined,
            maxQuantity: typeof group.maxQuantity === 'number' ? group.maxQuantity : undefined,
            notes: group.notes || '',
          }
        })
      : []

    return {
      mealType,
      label: meal.label || mealType,
      groups,
      notes: meal.notes || '',
    }
  })

  return normalizedMeals
}

// ─── Recipe Adaptation ────────────────────────────────────────────────────────

export async function adaptRecipeToProfile(
  rawRecipe: {
    title: string
    description: string
    ingredients: string[]
    steps: string[]
    thumbnailUrl?: string
    sourceUrl?: string
    source: string
  },
  profile: NutritionProfile,
  targetMeal: MealType,
): Promise<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite' | 'rating' | 'personalNotes'>> {
  const meal = profile.meals.find(m => m.mealType === targetMeal)
  const mealDescription = meal
    ? JSON.stringify(meal.groups.map(g => ({
        gruppo: g.name,
        categoria: g.category,
        quantità: `${g.minQuantity ?? ''}–${g.maxQuantity ?? ''} ${g.unit}`,
        opzioni: g.options.map(o => `${o.name} ${o.quantity}${o.unit}`),
        note: g.notes,
      })))
    : 'Piano non specificato per questo pasto'

  const systemPrompt = `Sei un nutrizionista AI esperto. Adatta la ricetta al piano nutrizionale personale dell'utente.
  
Restituisci SOLO un JSON con questa struttura:
{
  "title": "Titolo ricetta",
  "description": "Descrizione breve",
  "targetMeal": "${targetMeal}",
  "originalIngredients": [
    { "name": "nome", "originalQuantity": "200g", "adaptedQuantity": "200g", "unit": "g", "category": "proteins", "isOptional": false }
  ],
  "adaptedIngredients": [
    { "name": "nome", "originalQuantity": "200g", "adaptedQuantity": "150g", "unit": "g", "category": "proteins", "isOptional": false }
  ],
  "steps": [
    { "order": 1, "description": "...", "duration": "5 minuti", "tip": "consiglio opzionale" }
  ],
  "nutritionalValues": { "calories": 450, "proteins": 35, "carbs": 40, "fats": 12, "fiber": 5 },
  "adaptationNotes": "Spiegazione chiara di COME e PERCHÉ sono state modificate le quantità",
  "tags": ["proteico", "facile", "veloce"],
  "prepTime": 10,
  "cookTime": 20,
  "servings": 1
}

Categorie disponibili: carbs, proteins, vegetables, fruits, dairy, fats, other
Regole adattamento:
- Rispetta ESATTAMENTE le quantità del piano nutrizionale per ogni categoria
- Se la ricetta usa ingredienti non nel piano, segnalanello in adaptationNotes
- Mantieni intatta la tecnica di cottura e i passaggi
- Se un ingrediente non è compatibile, suggerisci la sostituzione più vicina nel piano`

  const userPrompt = `Piano nutrizionale per ${targetMeal}:
${mealDescription}

Ricetta originale da adattare:
Titolo: ${rawRecipe.title}
Descrizione: ${rawRecipe.description}
Ingredienti originali:
${rawRecipe.ingredients.join('\n')}
Passaggi:
${rawRecipe.steps.join('\n')}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const parsed = JSON.parse(result)

  return {
    ...parsed,
    source: rawRecipe.source as Recipe['source'],
    sourceUrl: rawRecipe.sourceUrl,
    thumbnailUrl: rawRecipe.thumbnailUrl,
  }
}

// ─── Recipe from text/transcript ─────────────────────────────────────────────

export async function extractRecipeFromText(
  text: string,
  url: string,
): Promise<{
  title: string
  description: string
  ingredients: string[]
  steps: string[]
}> {
  const systemPrompt = `Sei un AI esperto in cucina. Estrai le informazioni della ricetta dal testo/trascrizione fornita.
  
Restituisci SOLO JSON:
{
  "title": "Titolo ricetta",
  "description": "Breve descrizione del piatto",
  "ingredients": ["200g pasta", "2 uova", "100g guanciale"],
  "steps": ["Cuoci la pasta", "Rosola il guanciale", "Mescola con le uova"]
}

Se le informazioni sono incomplete, stima dalla descrizione del video.
Traduci tutto in italiano.`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Testo/Trascrizione del video (${url}):\n\n${text}` },
  ])

  return JSON.parse(result)
}
