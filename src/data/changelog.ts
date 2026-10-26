export type ChangeType = 'feat' | 'ai' | 'fix' | 'design'

export interface ChangelogItem {
  type: ChangeType
  title: string
  description: string
  howToUse?: string
}

export interface Release {
  version: string
  date: string
  title: string
  summary: string
  isLatest?: boolean
  changes: ChangelogItem[]
}

export const APP_VERSION = '1.1.0'

export const CHANGELOG: Release[] = [
  {
    version: '1.1.0',
    date: '26 Ottobre 2026',
    title: 'AI Più Intelligente, Pranzo & Cena e Dosi nei Procedimenti',
    isLatest: true,
    summary:
      'Algoritmo di adattamento radicalmente perfezionato: bilanciamento multi-ingrediente della stessa categoria, rispetto rigoroso della ricetta originale, supporto per ricette "Pranzo e Cena" e dosi leggibili direttamente nei passaggi.',
    changes: [
      {
        type: 'ai',
        title: 'Zero sostituzioni e rispetto della ricetta originale',
        description:
          'L\'AI non sostituisce più gli ingredienti scelti per la ricetta con altri del piano nutrizionale (es. la feta non viene più rimpiazzata da pollo o ricotta). Tutti gli ingredienti originali vengono rigorosamente preservati.',
        howToUse: 'Incolla qualsiasi link social: la ricetta manterrà tutti i suoi ingredienti originali, calibrandone solo le grammature.',
      },
      {
        type: 'ai',
        title: 'Bilanciamento 50/50 per ingredienti della stessa categoria',
        description:
          'Se una ricetta contiene 2 o più alimenti della stessa categoria (es. 2 proteine come uova + feta o tonno + uova; oppure 2 fonti di carboidrati come farina + fiocchi d\'avena), l\'AI non ne elimina più uno ma suddivide equamente la quota tra entrambi.',
        howToUse: 'Ora puoi realizzare ricette sfiziose con più proteine o carboidrati combinati senza che l\'AI ne cancelli una.',
      },
      {
        type: 'ai',
        title: 'Rapporti strutturali per impasti e pastelle',
        description:
          'Per pancake, piadine, crêpes e torte fitness, l\'AI rispetta i corretti rapporti culinari tra farine, liquidi (latte, albume, acqua) e leganti per garantire consistenza e cottura ottimali.',
        howToUse: 'Ideale per le colazioni fitness: riducendo o aumentando le farine, anche i liquidi e i leganti si adattano armonicamente.',
      },
      {
        type: 'feat',
        title: 'Nuova categoria "☀️🌙 Pranzo e Cena"',
        description:
          'Puoi categorizzare una ricetta come adatta sia a pranzo che a cena. Filtrando per "Pranzo" o per "Cena" nel ricettario, la ricetta comparirà in entrambi i filtri.',
        howToUse: 'Seleziona "☀️🌙 Pranzo e Cena" in fase di importazione oppure cambialo al volo con il selettore nel dettaglio della ricetta.',
      },
      {
        type: 'feat',
        title: 'Dosi integrate direttamente nei procedimenti',
        description:
          'Ogni passaggio sequenziale della ricetta riporta ora le quantità esatte adattate tra parentesi tonde subito dopo il nome dell\'ingrediente (es. "Prendere le zucchine (200g) e aggiungere la feta (20g)").',
        howToUse: 'Apri la scheda "👨‍🍳 Preparazione" e cucina direttamente leggendo le dosi senza dover tornare ogni volta alla lista ingredienti.',
      },
    ],
  },
  {
    version: '1.0.1',
    date: '24 Ottobre 2026',
    title: 'Miglioramento PDF & Architettura Cloud',
    summary:
      'Supporto avanzato per la lettura dei PDF del piano nutrizionale e migrazione delle chiamate AI su funzione serverless protetta.',
    changes: [
      {
        type: 'fix',
        title: 'Parser PDF potenziato con fallback',
        description:
          'Integrazione della libreria PDF.js per estrarre istantaneamente i testi della dieta, con aggiunta dell\'opzione di inserimento manuale del testo.',
      },
      {
        type: 'feat',
        title: 'Integrazione Vercel Serverless',
        description:
          'Chiamate verso OpenAI migrate su endpoint cloud sicuro `/api/ai`, garantendo zero esposizione di chiavi e massima affidabilità.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '20 Ottobre 2026',
    title: 'Lancio Ufficiale NutriRecipe 🎉',
    summary:
      'La prima applicazione web progressiva (PWA) progettata per trasformare video ricette social da TikTok, Instagram e YouTube nei tuoi pasti bilanciati su misura.',
    changes: [
      {
        type: 'feat',
        title: 'Importazione automatica dai Social',
        description:
          'Basta incollare il link del video per ottenere automaticamente ingredienti, passaggi e valori nutrizionali.',
      },
      {
        type: 'feat',
        title: 'Adattamento personalizzato ai tuoi Macro',
        description:
          'L\'intelligenza artificiale ricalcola al grammo le dosi in base alla tua scheda nutrizionale personale.',
      },
      {
        type: 'feat',
        title: 'Meal Planner Settimanale e Lista della Spesa',
        description:
          'Organizza i pasti della settimana giorno per giorno e crea automaticamente la lista della spesa divisa per reparti.',
      },
    ],
  },
]

export function getLatestRelease(): Release {
  return CHANGELOG[0]
}

export function hasUnseenUpdate(): boolean {
  try {
    const lastSeen = localStorage.getItem('nutrirecipe_last_seen_version')
    return lastSeen !== APP_VERSION
  } catch {
    return false
  }
}

export function markUpdateAsSeen(): void {
  try {
    localStorage.setItem('nutrirecipe_last_seen_version', APP_VERSION)
  } catch {}
}
