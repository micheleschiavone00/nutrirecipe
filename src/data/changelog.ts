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

export const APP_VERSION = '1.5.1'

export const CHANGELOG: Release[] = [
  {
    version: '1.5.1',
    date: '26 Ottobre 2026',
    title: 'Fix Cassetti Mobile: Blocco Scroll Sfondo, Layout dvh e Pulsanti Salva Sempre Visibili',
    isLatest: true,
    summary:
      'Risolto il problema di scrolling e layout sui cassetti modali su smartphone: bloccato lo scroll della pagina di sfondo durante l\'apertura, layout dinamico a prova di Safari/iOS (dvh) e pulsanti Salva / Conferma sempre fissati in basso e mai tagliati fuori.',
    changes: [
      {
        type: 'fix',
        title: 'Blocco dello Scroll della Pagina di Sfondo',
        description:
          'Aperta una modale o un cassetto, lo scorrimento del touch non fa più muovere la pagina sottostante. Lo scroll è ora confinato esclusivamente all\'interno del cassetto con rimbalzo contenuto (overscroll-contain).',
        howToUse: 'Apri qualsiasi cassetto (es. "Aggiungi al Piano" o "Piani Settimane Standard") e scorri liberamente su mobile.',
      },
      {
        type: 'fix',
        title: 'Pulsanti Salva e Conferma Sempre Fissi e Raggiungibili',
        description:
          'Il layout non nasconde più i pulsanti in basso oltre il bordo dello schermo. La barra inferiore delle azioni è ancorata al fondo (flex-shrink-0) e rispetta l\'area di sicurezza dei gesti di iOS (safe-area-inset-bottom).',
        howToUse: 'I pulsanti di conferma sono subito visibili con un tocco senza dover forzare lo scorrimento.',
      },
      {
        type: 'design',
        title: 'Architettura Cassetto Unificata su Tutte le Schermate',
        description:
          'Applicata la stessa architettura a 3 sezioni (Header fisso, Contenuto scrollabile fluido, Footer fisso con ombra soft) a: "Aggiungi al Meal Planner" (dalla ricetta), "Scegli dal Ricettario / Pasto Libero" (dal calendario settimanale) e "Piani Settimane Standard".',
        howToUse: 'Disponibile in tutto il Meal Planner e nei modelli di settimana.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '26 Ottobre 2026',
    title: 'Multi-Variante Pranzo & Cena con Riquadri Separati e Alternative (es. Cena Post Workout)',
    isLatest: false,
    summary:
      'Risolto il bilanciamento per Pranzo e Cena con grammature differenti: nuova visualizzazione a riquadri separati ma mostrati insieme per ingredienti e preparazione. Supporto per pasti alternativi nel piano nutrizionale (es. Cena Post Workout con più proteine): importando la ricetta compaiono automaticamente tutte le varianti.',
    changes: [
      {
        type: 'feat',
        title: 'Riquadri Separati Mostrati Insieme per Pranzo e Cena',
        description:
          'Se una ricetta è per "Pranzo e Cena" e nel tuo piano i due pasti hanno grammature diverse, la ricetta mostra ora riquadri distinti affiancati: uno per il Pranzo (con le sue dosi e calorie) e uno per la Cena. La stessa separazione per riquadri è applicata alla Preparazione con le dosi tra parentesi.',
        howToUse: 'Apri una ricetta con target "Pranzo e Cena" per vedere i riquadri affiancati o passare alla vista singola.',
      },
      {
        type: 'feat',
        title: 'Alternative Pasti nel Piano Nutrizionale (es. Cena Post Workout)',
        description:
          'Nel Piano Nutrizionale puoi ora aggiungere varianti personalizzate sia per il Pranzo che per la Cena (es. "Cena Post Workout" con quota proteica aumentata o "Pranzo Riposo"). Puoi regolare i gruppi e le dosi al grammo per ogni variante.',
        howToUse: 'Vai in Impostazioni ⚙️ → "Visualizza e Modifica Piano" e tocca "+ Aggiungi alternativa a Cena" o Pranzo.',
      },
      {
        type: 'ai',
        title: 'Adattamento Automatico delle Varianti all\'Importazione',
        description:
          'Quando importi una ricetta per Cena (e hai anche Cena Post Workout), vedrai comparire entrambe le opzioni calibrate. Se importi per Pranzo e Cena, vedrai contemporaneamente Pranzo, Cena e Cena Post Workout, potendo scegliere quando gustarla senza creare categorie separate.',
        howToUse: 'Incolla qualsiasi link e scegli "Cena" o "Pranzo e Cena": l\'AI calibrerà automaticamente tutte le tue varianti.',
      },
      {
        type: 'feat',
        title: 'Selezione Variante nel Meal Planner',
        description:
          'Quando aggiungi una ricetta con varianti al Meal Planner, puoi scegliere esattamente quale grammatura pianificare (es. Pranzo, Cena Standard o Cena Post Workout). Il planner mostrerà l\'etichetta specifica del pasto.',
        howToUse: 'Tocca "📅 Aggiungi al piano" da qualsiasi ricetta multi-variante.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '26 Ottobre 2026',
    title: 'Icona Burger su Bilancia, Dark Mode, Modelli Settimana & Aggiunta Pasti Diretta',
    isLatest: false,
    summary:
      'Nuova icona con hamburger gourmet su bilancia digitale (Liquid Glass 3D, Material Design e Dark Mode adattiva di sistema). Ridisegnata la modale di aggiunta al planner senza sovrapposizioni, salvataggio di modelli per settimane standard e aggiunta diretta delle ricette dai singoli giorni del Meal Planner.',
    changes: [
      {
        type: 'design',
        title: 'Nuova Icona Burger su Bilancia & Confronto Stili',
        description:
          'Sostituita la precedente insalata con un sontuoso hamburger gourmet artigianale appoggiato su bilancia digitale da cucina con display LCD verde (180g). Nella sezione Impostazioni puoi ora visualizzare e confrontare gli stili Liquid Glass 3D, Material Design e Dark Mode.',
        howToUse: 'Vai in Impostazioni ⚙️ → "Icona App & Stili a Confronto" per ammirare i diversi stili grafici.',
      },
      {
        type: 'design',
        title: 'Icona Dark Mode Adattiva di Sistema',
        description:
          'Aggiunta la variante Dark Mode su sfondo lussuoso grafite/ossidiana con bilancia titanio e display verde neon brillante. L\'icona del browser e dell\'app si adatta automaticamente quando il tuo telefono entra in modalità scura.',
        howToUse: 'Si attiva in automatico in base al tema scuro del tuo smartphone.',
      },
      {
        type: 'feat',
        title: 'Nuova Modale "Aggiungi al Meal Planner" Senza Sovrapposizioni',
        description:
          'Completamente ridisegnata l\'interfaccia per inserire una ricetta nel piano settimanale: layout fluido ed ergonomico, carosello dei prossimi 14 giorni (Oggi, Domani, ecc.) e selezione istantanea del pasto senza sovrapposizioni visive su mobile.',
        howToUse: 'Nel dettaglio di qualsiasi ricetta, tocca il pulsante verde "📅 Aggiungi al piano".',
      },
      {
        type: 'feat',
        title: 'Modelli per Settimane Standard (Salva & Applica)',
        description:
          'Possibilità di salvare la settimana corrente come modello standard riutilizzabile (es. "Settimana Standard", "Definizione", "Pasti Veloci") e applicarla alle settimane future con un tocco, scegliendo se sostituire o aggiungere ai pasti esistenti.',
        howToUse: 'Dalla schermata Meal Planner, tocca "📋 Modelli" in alto a destra.',
      },
      {
        type: 'feat',
        title: 'Aggiunta Ricette Diretta dai Giorni del Planner',
        description:
          'Ora puoi aggiungere un piatto direttamente dal giorno e dal pasto desiderato nel Meal Planner: tocca "+ Aggiungi" per aprire il selettore istantaneo con ricerca nel ricettario, filtri per pasto consigliato, o inserisci un pasto libero.',
        howToUse: 'Nel Meal Planner tocca "+ Aggiungi" su qualsiasi pasto (Colazione, Pranzo, Cena, Merenda).',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '26 Ottobre 2026',
    title: 'Organizzazione Ingredienti (Macro/Componenti) & Verdure al Grammo',
    isLatest: false,
    summary:
      'Nuova tripla modalità di visualizzazione ingredienti (per Macro Categoria, per Componente/Preparazione e Lista). Precisione al grammo per le verdure con ripartizione equa multi-verdura (es. 100g e 100g) e riorganizzazione retroattiva con AI per vecchie ricette.',
    changes: [
      {
        type: 'feat',
        title: 'Visualizzazione per Macro Categoria & per Componente',
        description:
          'Nel dettaglio ricetta puoi ora scegliere come consultare gli ingredienti: raggruppati per Macro (Proteine, Carboidrati, Verdure, Grassi), per Componente culinario (es. "Per il panino", "Per il pulled pork", "Per la salsa"), oppure in lista classica.',
        howToUse: 'Apri una ricetta e usa i nuovi selettori "🥩 Per Macro" e "🥪 Componenti".',
      },
      {
        type: 'ai',
        title: 'Verdure al grammo esatto & Ripartizione Multi-Verdura',
        description:
          'Mai più dosi generiche a pezzi per le verdure. Se il piano prevede 200g e la ricetta include 2 verdure (es. zucchine e peperoni), vengono ripartite a 100g ciascuna (o 50g con 4 verdure), garantendo la quota totale esatta del tuo piano.',
        howToUse: 'Le verdure vengono calcolate sempre in grammi esatti sia nelle nuove ricette che riadattando quelle esistenti.',
      }
    ],
  },
  {
    version: '1.2.0',
    date: '26 Ottobre 2026',
    title: 'Visualizzazione/Modifica Piano Nutrizionale & Dosi Retroattive',
    isLatest: false,
    summary:
      'Ora puoi visualizzare, personalizzare e modificare ogni singolo alimento e grammatura del tuo piano nutrizionale. Inoltre, tutte le ricette salvate in precedenza vengono aggiornate automaticamente integrando le dosi nei singoli passaggi.',
    changes: [
      {
        type: 'feat',
        title: 'Visualizza e Modifica Piano Nutrizionale',
        description:
          'Nuova schermata dedicata per consultare il tuo piano suddiviso per pasti (Colazione, Spuntino, Pranzo, Merenda, Cena), modificare i grammi, aggiungere nuovi alimenti, personalizzare i macro e inserire note.',
        howToUse: 'Vai in Impostazioni ⚙️ → "Visualizza e Modifica Piano" per gestire liberamente la tua dieta.',
      },
      {
        type: 'feat',
        title: 'Dosi nei procedimenti per tutte le ricette precedenti',
        description:
          'Migrazione automatica all\'avvio: tutte le ricette già salvate nel tuo ricettario ricevono le dosi esatte tra parentesi tonde in ciascun passaggio sequenziale, senza doverle rifare da capo.',
        howToUse: 'Le tue ricette salvate mostrano già le quantità nei passaggi. Puoi anche usare il pulsante in Impostazioni o in "Preparazione" di qualsiasi ricetta.',
      },
      {
        type: 'ai',
        title: 'Ricarica e Aggiorna Piano con AI',
        description:
          'Se ricevi una nuova dieta dalla nutrizionista, puoi caricarla direttamente dalla schermata del Piano con PDF o Incolla Testo per aggiornare istantaneamente tutti i pasti tramite GPT-4o.',
        howToUse: 'Dalla pagina del tuo Piano, tocca "📄 Ricarica con AI" in alto a destra.',
      },
      {
        type: 'ai',
        title: 'Riformulazione passaggi con AI nel ricettario',
        description:
          'Nel dettaglio ricetta puoi cliccare "✨ Con AI" per far riscrivere i procedimenti all\'intelligenza artificiale con dosi, tempi e consigli da chef.',
        howToUse: 'Apri una ricetta → scheda "👨‍🍳 Preparazione" → "✨ Con AI".',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '26 Ottobre 2026',
    title: 'AI Più Intelligente, Pranzo & Cena e Dosi nei Procedimenti',
    isLatest: false,
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
