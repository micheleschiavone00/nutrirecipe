import { TargetMealType } from '@/types'
import { MEAL_ICONS } from './utils'

// ─── Palette completa di emoji per ricette ─────────────────────────────────────
export const RECIPE_EMOJI_CATEGORIES = [
  {
    name: 'Pesce & Mare',
    emojis: ['🐟', '🍣', '🦐', '🐙', '🦑', '🍤', '🦀', '🦞'],
  },
  {
    name: 'Carne & Burger',
    emojis: ['🍗', '🥩', '🍔', '🥓', '🍖', '🌭'],
  },
  {
    name: 'Primi, Cereali & Lievitati',
    emojis: ['🍝', '🍚', '🍕', '🥪', '🍲', '🥔', '🥖', '🌾', '🥐', '🥯'],
  },
  {
    name: 'Uova, Formaggi & Verdure',
    emojis: ['🍳', '🧀', '🥗', '🥑', '🥦', '🍅', '🧆', '🥕', '🍆', '🥒'],
  },
  {
    name: 'Colazione, Frutta & Dolci',
    emojis: ['🥞', '🥣', '🍎', '🍌', '🍓', '🍫', '🧁', '🍪', '🧇', '🍒'],
  },
  {
    name: 'Pasti & Generali',
    emojis: ['🍽️', '🍱', '🥙', '🌮', '🌯', '🥘', '🍲', '☕'],
  },
]

export const ALL_RECIPE_EMOJIS = RECIPE_EMOJI_CATEGORIES.flatMap(c => c.emojis)

// ─── Rilevamento Intelligente Icona da Titolo o Ingredienti ───────────────────
export function detectRecipeIcon(
  title: string,
  ingredients?: { name: string }[],
  targetMeal?: TargetMealType
): string {
  const combined = [
    title || '',
    ...(ingredients || []).map(i => i.name || ''),
  ]
    .join(' ')
    .toLowerCase()
    .trim()

  if (!combined) {
    return targetMeal ? MEAL_ICONS[targetMeal] || '🍽️' : '🍽️'
  }

  // 1. Pesce & Salmone
  if (combined.includes('salmone')) return '🐟'
  if (
    combined.includes('tonno') ||
    combined.includes('merluzzo') ||
    combined.includes('orata') ||
    combined.includes('spigola') ||
    combined.includes('branzino') ||
    combined.includes('platessa') ||
    combined.includes('pesce') ||
    combined.includes('trota') ||
    combined.includes('alici') ||
    combined.includes('sarde')
  ) {
    return '🐟'
  }
  if (combined.includes('sushi') || combined.includes('sashimi') || combined.includes('poke')) return '🍣'
  if (combined.includes('gamber') || combined.includes('scampi')) return '🦐'
  if (combined.includes('calamar') || combined.includes('seppi') || combined.includes('polp')) return '🐙'

  // 2. Carni
  if (combined.includes('pollo') || combined.includes('tacchin') || combined.includes('alette')) return '🍗'
  if (combined.includes('burger') || combined.includes('hamburger')) return '🍔'
  if (
    combined.includes('bistecca') ||
    combined.includes('tagliata') ||
    combined.includes('manzo') ||
    combined.includes('vitello') ||
    combined.includes('straccetti') ||
    combined.includes('macinato') ||
    combined.includes('carne') ||
    combined.includes('tartare')
  ) {
    return '🥩'
  }
  if (combined.includes('maiale') || combined.includes('bacon') || combined.includes('speck') || combined.includes('pancetta')) {
    return '🥓'
  }

  // 3. Uova
  if (
    combined.includes('frittata') ||
    combined.includes('uov') ||
    combined.includes('uovo') ||
    combined.includes('omelette') ||
    combined.includes('strapazzat') ||
    combined.includes('occhio di bue')
  ) {
    return '🍳'
  }

  // 4. Primi Piatti & Cereali
  if (
    combined.includes('pasta') ||
    combined.includes('spaghetti') ||
    combined.includes('penne') ||
    combined.includes('fusilli') ||
    combined.includes('lasagna') ||
    combined.includes('carbonara') ||
    combined.includes('ragù') ||
    combined.includes('tortiglioni') ||
    combined.includes('noodles')
  ) {
    return '🍝'
  }
  if (combined.includes('riso') || combined.includes('risotto') || combined.includes('basmati')) return '🍚'
  if (
    combined.includes('cous') ||
    combined.includes('cuscus') ||
    combined.includes('bulgur') ||
    combined.includes('quinoa') ||
    combined.includes('farro') ||
    combined.includes('orzo')
  ) {
    return '🍲'
  }
  if (combined.includes('pizza') || combined.includes('pinsa') || combined.includes('focaccia')) return '🍕'
  if (
    combined.includes('panino') ||
    combined.includes('toast') ||
    combined.includes('piadina') ||
    combined.includes('wrap') ||
    combined.includes('tramezzino') ||
    combined.includes('sandwich')
  ) {
    return '🥪'
  }
  if (combined.includes('patat') || combined.includes('gnocchi') || combined.includes('purè')) return '🥔'
  if (combined.includes('zuppa') || combined.includes('vellutata') || combined.includes('minestra') || combined.includes('passato')) {
    return '🥣'
  }

  // 5. Formaggi & Latticini
  if (
    combined.includes('feta') ||
    combined.includes('parmigiano') ||
    combined.includes('grana') ||
    combined.includes('mozzarella') ||
    combined.includes('ricotta') ||
    combined.includes('formagg')
  ) {
    return '🧀'
  }

  // 6. Colazione & Dolci
  if (combined.includes('pancake') || combined.includes('crêpe') || combined.includes('crepe') || combined.includes('waffle')) return '🥞'
  if (combined.includes('porridge') || combined.includes('yogurt') || combined.includes('avena')) return '🥣'
  if (combined.includes('cioccolat') || combined.includes('cacao')) return '🍫'
  if (combined.includes('torta') || combined.includes('muffin') || combined.includes('plumcake')) return '🧁'
  if (combined.includes('biscott') || combined.includes('cookies')) return '🍪'

  // 7. Verdure & Contorni
  if (
    combined.includes('insalata') ||
    combined.includes('zucchine') ||
    combined.includes('zucchina') ||
    combined.includes('broccoli') ||
    combined.includes('melanzan') ||
    combined.includes('peperon') ||
    combined.includes('spinaci') ||
    combined.includes('verdura') ||
    combined.includes('contorno')
  ) {
    return '🥗'
  }
  if (combined.includes('avocado') || combined.includes('guacamole')) return '🥑'
  if (combined.includes('mela') || combined.includes('banana') || combined.includes('fragol') || combined.includes('frutta')) return '🍎'

  // 8. Fallback al pasto
  if (targetMeal && MEAL_ICONS[targetMeal]) {
    return MEAL_ICONS[targetMeal]
  }

  return '🍽️'
}
