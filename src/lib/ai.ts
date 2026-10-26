import type { NutritionProfile, Recipe, MealType, TargetMealType, FoodGroup, RecipeIngredient, RecipeStep } from '@/types'
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
  targetMeal: TargetMealType,
): Promise<Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite' | 'rating' | 'personalNotes'>> {
  const formatGroup = (g: any) => ({
    gruppo: g.name,
    categoria: g.category,
    quantità: `${g.minQuantity ?? ''}–${g.maxQuantity ?? ''} ${g.unit}`,
    opzioni: (g.options || []).map((o: any) => `${o.name} ${o.quantity}${o.unit}`),
    note: g.notes || '',
  })

  let mealDescription = ''
  if (targetMeal === 'lunch_dinner') {
    const lunchMeal = profile.meals.find(m => m.mealType === 'lunch')
    const dinnerMeal = profile.meals.find(m => m.mealType === 'dinner')
    const parts: string[] = []
    if (lunchMeal) {
      parts.push(`PIANO PRANZO:\n${JSON.stringify(lunchMeal.groups.map(formatGroup), null, 2)}`)
    }
    if (dinnerMeal) {
      parts.push(`PIANO CENA:\n${JSON.stringify(dinnerMeal.groups.map(formatGroup), null, 2)}`)
    }
    mealDescription = parts.join('\n\n') || 'Piano per pranzo e cena non specificato'
  } else {
    const meal = profile.meals.find(m => m.mealType === targetMeal)
    mealDescription = meal
      ? JSON.stringify(meal.groups.map(formatGroup), null, 2)
      : 'Piano non specificato per questo pasto'
  }

  const systemPrompt = `Sei un nutrizionista e chef AI d'élite. Il tuo compito è adattare le ricette social al piano nutrizionale personale dell'utente in modo intelligente, scientificamente corretto e rispettoso della ricetta originale.

REGOLE CRUCIALI DI ADATTAMENTO:

1. NON SOSTITUIRE GLI INGREDIENTI ORIGINALI DELLA RICETTA:
   - Mantieni ASSOLUTAMENTE gli ingredienti scelti dall'utente nella ricetta (es. se la ricetta usa feta e uova, tieni feta e uova, NON sostituire con pollo o ricotta per variare la dieta).
   - L'obiettivo è CALIBRARE LE DOSI della ricetta dell'utente in base al suo piano, NON stravolgere la ricetta né imporre cibi diversi.

2. BILANCIAMENTO MULTI-INGREDIENTE DELLA STESSA CATEGORIA:
   - Se la ricetta contiene 2 o più ingredienti della stessa categoria nutrizionale (es. 2 fonti proteiche come uova + tonno, oppure pollo + formaggio/parmigiano; oppure 2 fonti di carboidrati come farina + avena o pasta + legumi):
     * NON dosarne uno solo eliminando l'altro!
     * Suddividi la quota totale prevista dal piano nutrizionale tra tutti gli alimenti della stessa categoria in modo bilanciato ed equilibrato (es. 50/50 o proporzionale alle quantità originali della ricetta).
     * In questo modo la somma totale dei macronutrienti di quella categoria corrisponde esattamente al piano, conservando tutti gli ingredienti della ricetta.

3. IMPASTI E PREPARAZIONI TECNICHE (pancake, impasti, torte, piadine, pastelle, crêpes):
   - Se la ricetta è un impasto o pastella, rispetta i rapporti tecnici fondamentali di cucina (rapporto tra farine/amidi, liquidi come latte/acqua/albume, leganti come uova, lievito e grassi).
   - Se riduci o aumenti la farina per i carboidrati, adatta proporzionalmente anche i liquidi e gli altri elementi della struttura dell'impasto, in modo che la consistenza sia ottimale e la cottura riesca perfettamente.

4. DOSI OBBLIGATORIE NEI PASSAGGI / PROCEDIMENTO (STEPS):
   - In OGNI passaggio di 'steps', quando viene nominato o aggiunto un ingrediente, DEVI SEMPRE specificare tra parentesi tonde la quantità esatta adattata!
   - Esempio di passaggio corretto: "In una ciotola unire le zucchine (200g) grattugiate, le uova (1 intero, 50g) e la feta (25g) sbriciolata."
   - Esempio di passaggio corretto: "Scaldare una padella con l'olio extravergine d'oliva (10g) e versare il composto cuocendo per 5 minuti a fuoco medio."
   - Questo permette a chi cucina di leggere direttamente il procedimento senza dover continuamente consultare la lista degli ingredienti.

5. CATEGORIZZAZIONE "PRANZO E CENA" (se targetMeal è "lunch_dinner"):
   - La ricetta deve poter essere consumata sia a pranzo che a cena. Calibra le grammature in modo che soddisfino entrambi i pasti. Se tra pranzo e cena ci sono differenze (es. quota carboidrati diversa), usa una dose equilibrata e specifica chiaramente in 'adaptationNotes' l'eventuale variazione raccomandata (es. "Se consumata a cena, ridurre la pasta a 50g").

Restituisci SOLO un JSON con questa struttura:
{
  "title": "Titolo ricetta",
  "description": "Descrizione breve",
  "targetMeal": "${targetMeal}",
  "originalIngredients": [
    { "name": "nome ingrediente", "originalQuantity": "200g", "adaptedQuantity": "200g", "unit": "g", "category": "proteins", "isOptional": false }
  ],
  "adaptedIngredients": [
    { "name": "nome ingrediente", "originalQuantity": "200g", "adaptedQuantity": "150g", "unit": "g", "category": "proteins", "isOptional": false }
  ],
  "steps": [
    { "order": 1, "description": "Passaggio dettagliato con dosi tra parentesi tonde (es. zucchine (200g))", "duration": "5 minuti", "tip": "consiglio opzionale" }
  ],
  "nutritionalValues": { "calories": 450, "proteins": 35, "carbs": 40, "fats": 12, "fiber": 5 },
  "adaptationNotes": "Spiegazione chiara di come sono state bilanciate le quantità (soprattutto se ci sono più ingredienti della stessa categoria o per la consistenza dell'impasto)",
  "tags": ["proteico", "facile", "veloce"],
  "prepTime": 10,
  "cookTime": 20,
  "servings": 1
}

Categorie disponibili: carbs, proteins, vegetables, fruits, dairy, fats, other`

  const userPrompt = `Piano nutrizionale per ${targetMeal === 'lunch_dinner' ? 'Pranzo e Cena' : targetMeal}:
${mealDescription}

Ricetta originale da adattare:
Titolo: ${rawRecipe.title}
Descrizione: ${rawRecipe.description}
Ingredienti originali:
${rawRecipe.ingredients.join('\n')}
Passaggi originali:
${rawRecipe.steps.join('\n')}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const parsed = JSON.parse(result)

  return {
    ...parsed,
    targetMeal,
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

// ─── Reformat steps with doses using AI ──────────────────────────────────────

export async function reformatRecipeStepsWithAI(
  recipeTitle: string,
  adaptedIngredients: RecipeIngredient[],
  currentSteps: RecipeStep[]
): Promise<RecipeStep[]> {
  const ingredientsList = adaptedIngredients
    .map(i => `- ${i.name}: ${i.adaptedQuantity}`)
    .join('\n')

  const stepsList = currentSteps
    .map(s => `${s.order}. ${s.description}`)
    .join('\n')

  const systemPrompt = `Sei uno chef e nutrizionista AI d'élite.
Il tuo compito è riscrivere i passaggi (steps) della ricetta inserendo OBBLIGATORIAMENTE tra parentesi tonde le dosi esatte degli ingredienti nominati in ciascun passaggio (es. "zucchine (200g)", "feta (25g)", "uova (1 intero, 50g)").
Non alterare l'ordine logico della preparazione, ma rendi i passaggi chiarissimi e facili da seguire mentre si cucina.

Restituisci SOLO un oggetto JSON con il campo "steps":
{
  "steps": [
    {
      "order": 1,
      "description": "In una ciotola unire le zucchine (200g) grattugiate e la feta (25g) sbriciolata...",
      "duration": "5 min",
      "tip": "Consiglio utile facoltativo"
    }
  ]
}`

  const userPrompt = `Ricetta: ${recipeTitle}

Ingredienti con dosi adattate:
${ingredientsList}

Passaggi originali da riscrivere:
${stepsList}`

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const parsed = JSON.parse(result)
  return parsed.steps || currentSteps
}
