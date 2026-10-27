/**
 * Deterministic Social Recipe Extractor
 * Parses Instagram, TikTok, and YouTube captions without requiring an AI LLM.
 * Extracts Title, Ingredients list, and Steps using regex, structural analysis,
 * and food dictionaries.
 */

import { classifyIngredientCategory } from './deterministicRecipeAdapter'

export interface ExtractedSocialRecipe {
  title: string
  description: string
  ingredients: string[]
  steps: string[]
}

const INGREDIENT_SECTION_HEADERS = [
  /(?:^|\n)\s*(?:👉|✨|🥗|🍳|🛒|📝)?\s*(?:ingredienti|dosi|ingredient|cosa serve|occorrente|necessario|per la ricetta|per l['’]impasto|per la farcitura|per \d+ persone)[\s:]*/i,
]

const STEPS_SECTION_HEADERS = [
  /(?:^|\n)\s*(?:👉|✨|👩‍🍳|👨‍🍳|🥣|🔥|🍽️)?\s*(?:procedimento|preparazione|istruzioni|come si fa|come fare|metodo|passaggi|steps?)[\s:]*/i,
]

const SOCIAL_NOISE_PATTERNS = [
  /#[a-z0-9_]+/gi,                     // hashtags
  /@[a-z0-9_.]+/gi,                    // mentions
  /https?:\/\/\S+/gi,                  // urls
  /salva\s+(?:il\s+)?(?:video|reel|post|ricetta)/gi,
  /seguimi\s+su/gi,
  /lascia\s+un\s+like/gi,
  /commenta\s+con/gi,
  /link\s+in\s+bio/gi,
  /codice\s+sconto/gi,
]

/**
 * Cleans bullet prefixes and numbers (e.g. "- ", "• ", "1. ", "1) ")
 * while strictly preserving quantities like "600g pollo", "1 uovo", "1/2 cipolla".
 */
export function cleanBulletPrefix(str: string): string {
  return str.replace(/^(?:[-•*▪️▫️🔹~✓>]|\d+[\.)]|\d+\s*[-–])\s*/, '').trim()
}

/**
 * Cleans social noise (hashtags, mentions, URLs, calls to action).
 */
export function cleanSocialNoise(str: string): string {
  let res = str.trim()
  for (const noise of SOCIAL_NOISE_PATTERNS) {
    res = res.replace(noise, '').trim()
  }
  return res.replace(/\s+/g, ' ').trim()
}

/**
 * Splits compound ingredient lines (e.g. "600gr pollo/ sale / origano /aglio"
 * or "200g pasta, 100g pomodorini, 50g feta") into individual ingredients.
 */
export function splitCompoundIngredientString(raw: string): string[] {
  if (!raw || !raw.trim()) return []
  let text = cleanBulletPrefix(cleanSocialNoise(raw))

  // 1. Protect fractions like 1/2 or 3/4 before splitting on slashes
  const fractions: string[] = []
  text = text.replace(/(\b\d+)\s*\/\s*(\d+\b)/g, (match) => {
    fractions.push(match)
    return `__FRAC_${fractions.length - 1}__`
  })

  // 2. Identify compound delimiter
  let parts: string[] = []

  if (/[/|]/.test(text)) {
    // Slashes and pipes: "600gr pollo/ sale / origano /aglio" or "salmone | zucchina"
    parts = text.split(/\s*[/|]\s*/)
  } else if (/[•▪️▫️🔹]/.test(text)) {
    // Intermediate bullets on same line
    parts = text.split(/\s*[•▪️▫️🔹]\s*/)
  } else if (/;/.test(text)) {
    parts = text.split(/\s*;\s*/)
  } else if (/\s+\+\s+/.test(text)) {
    // Plus sign with surrounding spaces
    parts = text.split(/\s+\+\s+/)
  } else if (text.includes(',')) {
    // Split by comma only if NOT followed by a number (protects 1,5 kg or 0,5 l)
    const commaParts = text.split(/,\s*(?![0-9])/)
    if (commaParts.length > 1) {
      parts = commaParts
    } else {
      parts = [text]
    }
  } else {
    parts = [text]
  }

  // 3. Restore fractions and clean each part
  const results: string[] = []
  for (let p of parts) {
    p = p.replace(/__FRAC_(\d+)__/g, (_, idx) => fractions[parseInt(idx, 10)] || '')
    p = cleanBulletPrefix(cleanSocialNoise(p))
    if (p.length >= 2) {
      // Further check: does part contain "sale e pepe"?
      if (/\bsale\s+(?:e|ed|\&)\s+pepe\b/i.test(p)) {
        results.push('sale q.b.')
        results.push('pepe q.b.')
      } else {
        results.push(p)
      }
    }
  }

  return results.length > 0 ? results : [cleanBulletPrefix(raw)]
}

/**
 * Expands an array of ingredient lines, splitting any compound lines into individual elements.
 */
export function expandCompoundIngredients(lines: string[]): string[] {
  const result: string[] = []
  for (const line of lines) {
    const parts = splitCompoundIngredientString(line)
    for (const part of parts) {
      const clean = cleanSocialNoise(part)
      if (clean.length >= 2 && !result.includes(clean)) {
        result.push(clean)
      }
    }
  }
  return result
}

/**
 * Checks if a string line represents an ingredient.
 */
function isIngredientLine(line: string): boolean {
  const clean = line.trim().toLowerCase()
  if (!clean || clean.length < 3 || clean.length > 120) return false
  if (clean.startsWith('http') || clean.startsWith('#') || clean.startsWith('@')) return false

  // Bullet point indicators
  if (/^[-•*▪️▫️🔹+~✓]\s*/.test(clean)) return true

  // Quantity indicators: e.g. "200g", "2 uova", "1 cucchiaio", "150 ml", "q.b."
  if (/\b\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cl|dl|l|uov|uovo|cucchia|fett|pizzic|spicchi|porzion|pz|pezzi|etto|etti)\b/i.test(clean)) {
    return true
  }

  if (/\bq\.?b\.?\b/i.test(clean) || /\bquanto basta\b/i.test(clean)) {
    return true
  }

  // Compound indicators (e.g. "pollo/ sale / origano /aglio")
  if (clean.includes('/') || clean.includes('|')) {
    const parts = clean.split(/[/|]/)
    if (parts.some(p => classifyIngredientCategory(p) !== 'other' || /\bq\.?b\.?\b/i.test(p))) {
      return true
    }
  }

  // Food classification match
  const cat = classifyIngredientCategory(clean)
  if (cat !== 'other') return true

  return false
}

/**
 * Cleans an ingredient line (strips bullet symbols, extra spaces, hashtags).
 */
function cleanIngredientLine(line: string): string {
  let res = line.trim()
  res = cleanBulletPrefix(res)
  res = cleanSocialNoise(res)
  return res
}

/**
 * Deterministically extracts recipe information from social post text.
 */
export function extractRecipeDeterministically(
  rawText: string,
  sourceUrl = ''
): ExtractedSocialRecipe {
  if (!rawText || !rawText.trim()) {
    return {
      title: 'Ricetta importata',
      description: '',
      ingredients: [],
      steps: ['Preparare gli ingredienti secondo il piano nutrizionale.'],
    }
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  // 1. Extract Title
  let title = ''
  for (const line of lines) {
    const cleanLine = line.replace(/#[a-z0-9_]+/gi, '').replace(/@[a-z0-9_.]+/gi, '').trim()
    if (
      cleanLine.length >= 4 &&
      cleanLine.length <= 80 &&
      !cleanLine.toLowerCase().includes('ingredienti') &&
      !cleanLine.toLowerCase().includes('procedimento') &&
      !cleanLine.toLowerCase().includes('salva il') &&
      !cleanLine.toLowerCase().includes('segui')
    ) {
      title = cleanLine.replace(/^[^\w\s\u00C0-\u017F]+/, '').trim()
      break
    }
  }

  if (!title) {
    title = 'Ricetta social importata'
  }

  // 2. Locate Sections
  let text = rawText
  let ingredientsSection = ''
  let stepsSection = ''

  // Split text by section headers
  let ingHeaderIdx = -1
  for (const regex of INGREDIENT_SECTION_HEADERS) {
    const match = regex.exec(text)
    if (match) {
      ingHeaderIdx = match.index
      break
    }
  }

  let stepsHeaderIdx = -1
  for (const regex of STEPS_SECTION_HEADERS) {
    const match = regex.exec(text)
    if (match) {
      stepsHeaderIdx = match.index
      break
    }
  }

  if (ingHeaderIdx !== -1) {
    if (stepsHeaderIdx !== -1 && stepsHeaderIdx > ingHeaderIdx) {
      ingredientsSection = text.slice(ingHeaderIdx, stepsHeaderIdx)
      stepsSection = text.slice(stepsHeaderIdx)
    } else {
      ingredientsSection = text.slice(ingHeaderIdx)
    }
  } else if (stepsHeaderIdx !== -1) {
    stepsSection = text.slice(stepsHeaderIdx)
  }

  // 3. Extract Ingredients
  const ingredients: string[] = []
  const targetIngLines = (ingredientsSection || text).split(/\r?\n/)

  for (const line of targetIngLines) {
    // Skip section header lines
    if (/^\s*(?:ingredienti|dosi|cosa serve|occorrente|procedimento|preparazione)\b/i.test(line)) continue

    if (isIngredientLine(line)) {
      // Split compound lines (e.g. "600gr pollo/ sale / origano /aglio") into individual items
      const splitItems = splitCompoundIngredientString(line)
      for (const item of splitItems) {
        const cleaned = cleanIngredientLine(item)
        if (cleaned.length >= 2 && !ingredients.includes(cleaned)) {
          ingredients.push(cleaned)
        }
      }
    }
  }

  // 4. Extract Steps
  const steps: string[] = []
  const targetStepLines = (stepsSection || text).split(/\r?\n/)

  for (const line of targetStepLines) {
    if (/^\s*(?:procedimento|preparazione|istruzioni|come si fa)\b/i.test(line)) continue
    const clean = line.replace(/#[a-z0-9_]+/gi, '').trim()

    // Match numbered lines e.g. "1. Taglia le zucchine" or paragraph instructions
    if (/^(?:\d+[\s.)]|-)\s*[a-zA-Z\u00C0-\u017F]/.test(clean)) {
      const stepText = clean.replace(/^(?:\d+[\s.)]|-)\s*/, '').trim()
      if (stepText.length >= 8 && !steps.includes(stepText)) {
        steps.push(stepText)
      }
    } else if (
      stepsSection &&
      clean.length > 20 &&
      !isIngredientLine(clean) &&
      !steps.includes(clean)
    ) {
      steps.push(clean)
    }
  }

  if (steps.length === 0) {
    steps.push('Dosare e preparare gli ingredienti secondo le indicazioni del piano nutrizionale.')
    steps.push('Procedere alla cottura secondo la preparazione desiderata e servire.')
  }

  return {
    title,
    description: lines.slice(0, 3).join(' ').slice(0, 200),
    ingredients,
    steps,
  }
}
