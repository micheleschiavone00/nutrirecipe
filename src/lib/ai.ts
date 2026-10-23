import type { NutritionProfile, Recipe, MealType } from '@/types'
import { CONFIG } from '@/config'

const OPENAI_BASE = 'https://api.openai.com/v1'

function getApiKey(): string {
  // 1. Chiave impostata direttamente nel codice in src/config.ts
  if (CONFIG.openAIApiKey && CONFIG.openAIApiKey.trim().length > 0) {
    return CONFIG.openAIApiKey.trim()
  }

  // 2. Chiave da variabile d'ambiente Vite
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim()
  }

  // 3. Fallback da localStorage
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('openai_api_key') : ''
  if (localKey && localKey.trim().length > 0) {
    return localKey.trim()
  }

  throw new Error('OpenAI API key non configurata. Inseriscila in src/config.ts o in .env.local')
}

async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model = 'gpt-4o',
): Promise<string> {
  const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`OpenAI error: ${err.error?.message ?? response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// ─── PDF Analysis ─────────────────────────────────────────────────────────────

export async function analyzePDFText(pdfText: string): Promise<NutritionProfile['meals']> {
  const systemPrompt = `Sei un esperto nutrizionista AI. Analizza il testo del piano nutrizionale e restituisci un JSON strutturato.
  
Il JSON deve avere questa forma:
{
  "meals": [
    {
      "mealType": "breakfast" | "lunch" | "dinner" | "snack_am" | "snack_pm",
      "label": "Nome del pasto in italiano",
      "groups": [
        {
          "id": "unique-id",
          "name": "Nome gruppo (es. Carboidrati, Proteine, Latticini)",
          "category": "carbs" | "proteins" | "vegetables" | "fruits" | "dairy" | "fats" | "other",
          "unit": "g" | "ml" | "pieces" | "portions",
          "options": [
            {
              "name": "nome alimento",
              "quantity": 150,
              "unit": "g",
              "calories": 120,
              "proteins": 5,
              "carbs": 20,
              "fats": 2
            }
          ],
          "minQuantity": 150,
          "maxQuantity": 200,
          "notes": "eventuali note"
        }
      ],
      "notes": "note generali sul pasto"
    }
  ]
}

IMPORTANTE:
- Estrai TUTTE le opzioni alternative per ogni gruppo alimentare
- Se ci sono quantità diverse per opzioni diverse, mettile nell'opzione stessa
- Stima le calorie e macronutrienti se non presenti
- Restituisci SOLO il JSON, nessun testo extra`

  const userPrompt = `Analizza questo piano nutrizionale:\n\n${pdfText}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const parsed = JSON.parse(result)
  return parsed.meals
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
