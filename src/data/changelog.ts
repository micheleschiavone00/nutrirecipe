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

export const APP_VERSION = '2.1.3'

export const CHANGELOG: Release[] = [
  {
    version: '2.1.3',
    date: '27 Ottobre 2026',
    title: 'Login Amministratore (Michele), Protezione Chiavi Vercel & Estrattore Social Deterministico',
    isLatest: true,
    summary:
      'Versione 2.1.3: implementazione del Login Amministratore con master password per Michele, che sblocca l\'accesso alle chiavi API configurate sul server Vercel proteggendole da accessi non autorizzati; e rilascio del nuovo Estrattore Deterministico Social che analizza le didascalie di Instagram, TikTok e YouTube estraendo titolo, ingredienti e passaggi al 100% in locale e a 0€ anche senza AI attiva.',
    changes: [
      {
        type: 'feat',
        title: 'Login Amministratore (Michele) con Chiavi Vercel Dedicate',
        description:
          'In Impostazioni e nel Centro AI è ora presente la gestione account Admin: Michele può autenticarsi con la master password per sbloccare l\'uso dell\'API Key OpenAI configurata su Vercel. Gli utenti non autenticati sono protetti e non possono consumare i crediti server di Michele.',
        howToUse: 'Tocca "Login Admin" in Impostazioni, inserisci la master password e sbloccherai le funzioni server Vercel.',
      },
      {
        type: 'feat',
        title: 'Estrattore Social Deterministico (Instagram & TikTok a 0€ senza AI)',
        description:
          'L\'importazione da Instagram e TikTok non fallisce più quando si sceglie la modalità deterministica o non si hanno chiavi AI: il nuovo estrattore analizza la didascalia del post, individua gli ingredienti, le dosi e i procedimenti e li calibra con il piano nutrizionale a costo zero.',
        howToUse: 'Incolla qualsiasi link di un Reel Instagram o TikTok: l\'app estrae gli ingredienti sia con l\'AI sia in modalità deterministica offline.',
      },
      {
        type: 'fix',
        title: 'Protezione Serverless Endpoint contro Consumi Non Autorizzati',
        description:
          'L\'endpoint serverless /api/ai ora rifiuta le richieste prive di autorizzazione admin o di chiave personale utente (HTTP 403), azzerando ogni rischio di costi imprevisti per lo sviluppatore.',
      },
    ],
  },
  {
    version: '2.1.2',
    date: '27 Ottobre 2026',
    title: 'Ricerca Cibo nel Piano Nutrizionale, Supporto Post-Workout & Chiavi AI Personali (Gemini BYOK)',
    isLatest: false,
    summary:
      'Versione 2.1.2: ricerca automatica e istantanea di ogni pietanza direttamente all\'interno del tuo piano nutrizionale personale con estrazione fedele di categoria e grammatura massima esatta (es. cous cous cerca nel piano e propone 70g max anziché 100g); supporto nativo per alternative pasto e Cena Post Workout con quote proteiche aumentate rispettate fedelmente e soppressione dei banner di superamento fabbisogno per le varianti pianificate; integrazione del modello Google Gemini personale con API Key (gratuita per chiunque con account Google tramite Google AI Studio a 15 req/min, 0€ di costi centralizzati); e nuovo sistema completo di esportazione/ripristino backup JSON anti-perdita dati e guida architetturale cloud per Google Login.',
    changes: [
      {
        type: 'feat',
        title: 'Ricerca Pietanze Direttamente nel Piano Nutrizionale (Cous Cous 70g)',
        description:
          'Quando aggiungi una pietanza ad-hoc (digitandola o dai suggerimenti), l\'algoritmo cerca direttamente all\'interno delle opzioni del tuo piano nutrizionale personale. Riconosce la categoria esatta e imposta come limite la grammatura massima prevista (es. se scrivi "couscous", trova "Cous cous" nei Carboidrati a 70g e propone 70g e non 100g).',
        howToUse: 'Digita il nome di qualsiasi alimento presente nella tua dieta: l\'app compilerà all\'istante categoria e dosaggio esatto.',
      },
      {
        type: 'fix',
        title: 'Cena Post Workout & Alternative Pasto Senza Falsi Allarmi',
        description:
          'Se nel piano nutrizionale hai configurato una variante come "Cena Post Workout" con quote proteiche più elevate (es. 250g di salmone), le quantità vengono mantenute al 100% senza essere appiattite a medie arbitrarie. Inoltre, i banner di allarme per superamento fabbisogno vengono disattivati per le alternative pasto, mostrando invece il badge verde dedicato.',
        howToUse: 'In fase di aggiunta ricetta o visualizzazione dettaglio, seleziona la variante "Cena Post Workout" per vedere le grammature calibrate.',
      },
      {
        type: 'feat',
        title: 'Motore AI Personale: Google Gemini Gratuito (BYOK) & Deterministico Offline',
        description:
          'Per evitare costi centralizzati per lo sviluppatore, ogni utente può ora scegliere il proprio motore AI preferito in Impostazioni > Servizi & API: Algoritmo Deterministico Locale (100% offline e gratuito a 0€), Google Gemini (con chiave gratuita personale da Google AI Studio fino a 15 req/min) oppure OpenAI.',
        howToUse: 'Vai in Impostazioni > Servizi & API, seleziona Google Gemini, inserisci la tua chiave gratuita e tocca "Verifica Chiave".',
      },
      {
        type: 'feat',
        title: 'Anti-Perdita Dati: Esportazione e Ripristino Backup JSON & Guida Google Cloud',
        description:
          'Aggiunta in Impostazioni > Privacy & Dati la possibilità di scaricare con un tocco un backup completo in formato JSON di tutte le ricette, piani, liste spesa e impostazioni, e di ripristinarlo su qualsiasi nuovo telefono o computer per non perdere mai nulla.',
        howToUse: 'Tocca "Esporta Backup Completo" per scaricare il file salvavita delle tue ricette sul tuo telefono o PC.',
      },
    ],
  },
  {
    version: '2.1.1',
    date: '27 Ottobre 2026',
    title: 'Riconoscimento Cous Cous, Modifica Categoria/Quantità Ad-Hoc & Icone Cibo Dedicate',
    isLatest: false,
    summary:
      'Versione 2.1.1: potenziato il riconoscimento dei carboidrati includendo cous cous, couscous, cuscus, farro, quinoa, bulgur e cereali; introdotta nella creazione ricette ad-hoc la possibilità di modificare sia la categoria (tramite selettore dropdown immediato) sia la quantità di ciascun ingrediente con pulsanti +/-; integrato il rilevamento automatico intelligente dell\'icona del piatto (es. Salmone → 🐟, Pollo → 🍗, Bistecca → 🥩, Pasta → 🍝) al posto delle sole icone del pasto; e aggiunta la possibilità di personalizzare e cambiare l\'icona sia in fase di creazione sia per tutte le ricette precedenti salvate nel ricettario.',
    changes: [
      {
        type: 'fix',
        title: 'Riconoscimento Cous Cous & Cereali tra i Carboidrati',
        description:
          'Il cous cous (scritto sia "cous cous" che "couscous" o "cuscus"), il farro, la quinoa e il bulgur vengono ora riconosciuti istantaneamente come carboidrati complessi e agganciati alla quota corretta del piano nutrizionale (standard 70g o quota cereali).',
        howToUse: 'Scrivendo "Cous cous" o selezionandolo dai suggerimenti, viene automaticamente inserito nel gruppo Carboidrati.',
      },
      {
        type: 'feat',
        title: 'Modifica Categoria e Quantità nella Creazione Ad-Hoc',
        description:
          'Nella schermata "Aggiungi Ricetta", ogni ingrediente presenta ora un menu a tendina per cambiare al volo la categoria (Carboidrati, Proteine, Verdure, Grassi, Latticini, Frutta, Altro) e comandi +/- e input numerico per personalizzare la grammatura.',
        howToUse: 'Tocca il menu della categoria accanto all\'ingrediente per riassegnarlo se finisce in "Altro", oppure usa +/- per regolarne la dose.',
      },
      {
        type: 'feat',
        title: 'Icone Specifiche del Piatto (Salmone 🐟, Pollo 🍗, Pasta 🍝, ecc.)',
        description:
          'Le ricette non mostrano più soltanto l\'icona generica del momento del giorno (☀️, 🌙, 🍳): l\'app rileva dal titolo e dagli ingredienti il cibo caratterizzante (es. Salmone in friggitrice ad aria riceve l\'icona 🐟).',
        howToUse: 'Scrivendo il titolo della ricetta, l\'icona si aggiorna in automatico e compare nel ricettario e nel Meal Planner.',
      },
      {
        type: 'feat',
        title: 'Personalizzazione Icona per Nuove Ricette e Ricette Precedenti',
        description:
          'Sia durante l\'aggiunta di una nuova ricetta sia entrando nel dettaglio di qualsiasi ricetta precedente salvata, puoi toccare l\'icona o il pulsante "Icona ✏️" per scegliere da una ricca griglia di emoji del cibo o inserire qualsiasi emoji dal tuo tastierino.',
        howToUse: 'Nel dettaglio di qualsiasi ricetta, tocca la grande icona o il pulsante "Icona ✏️" per cambiarla e salvare istantaneamente.',
      },
    ],
  },
  {
    version: '2.1.0',
    date: '27 Ottobre 2026',
    title: 'Modifica Quantità Spesa, Scadenza Dispensa, Fix Barra Checkout & Nuove Impostazioni Categorizzate',
    isLatest: false,
    summary:
      'Versione 2.1.0: introdotta la modifica delle quantità e delle unità di misura per ciascun articolo della lista della spesa; aggiunta la gestione e modifica rapida della data di scadenza per gli alimenti in dispensa; risolta la sovrapposizione tra il pulsante "Completa Spesa" e la barra di navigazione con calcolo dinamico della safe area; e riorganizzata radicalmente la schermata Impostazioni in sezioni categorizzate e pagine dedicate a schermo intero (Piano Nutrizionale, Privacy & Sicurezza, Altre Info, Buoni Pasto, Aspetto & Tema).',
    changes: [
      {
        type: 'feat',
        title: 'Modifica Quantità per i Singoli Articoli della Spesa',
        description:
          'Toccando la quantità o l\'icona matita su qualsiasi alimento della lista spesa si apre un dialog per modificare il valore numerico (con tasti rapidi +/-) e l\'unità di misura (g, kg, pz, ml, conf), oltre a poter eliminare l\'articolo.',
        howToUse: 'Tocca il badge della quantità (es. "200g ✏️") accanto a un articolo nella lista della spesa per regolarne la dose.',
      },
      {
        type: 'feat',
        title: 'Modifica Scadenza Singoli Elementi in Dispensa',
        description:
          'Nel tab Dispensa è ora possibile modificare o impostare al volo la data di scadenza di qualsiasi alimento tramite selettore di data e pulsanti veloci (+3 gg, +1 sett, +2 sett, +1 mese).',
        howToUse: 'Nella Dispensa, tocca il badge della data di scadenza o il pulsante "+ Scadenza 📅" su un alimento.',
      },
      {
        type: 'fix',
        title: 'Fix Sovrapposizione Bottone "Completa Spesa" con la Navbar',
        description:
          'La barra fluttuante di completamento spesa e riepilogo buoni pasto è stata posizionata rigorosamente al di sopra della barra di navigazione inferiore (tenendo conto della safe area di iOS e Android). Aggiunto anche il corretto padding inferiore per garantire lo scroll completo di tutta la lista.',
        howToUse: 'Il pulsante "Completa Spesa" è ora perfettamente visibile e reattivo in ogni condizione di navigazione.',
      },
      {
        type: 'design',
        title: 'Nuova Schermata Impostazioni & Info Categorizzata a Sezioni',
        description:
          'La pagina delle Impostazioni è stata riprogettata con una struttura pulita in stile iOS Settings: sezioni ordinate e righe con chevron (›) che aprono schermate dedicate per Piano Nutrizionale, Privacy & Sicurezza Dati, Altre Info sull\'App, Buoni Pasto, Aspetto e Icone.',
        howToUse: 'Vai su Impostazioni: tocca "Piano Nutrizionale >", "Privacy & Sicurezza >" o "Altre Info >" per accedere alle schermate dedicate.',
      },
    ],
  },
  {
    version: '2.0.3',
    date: '27 Ottobre 2026',
    title: 'Classificazione Feta nei Formaggi Stagionati (Limite Rigoroso 50g)',
    isLatest: false,
    summary:
      'Versione 2.0.3: la Feta viene ora classificata rigorosamente come formaggio stagionato ad alta densità proteica con limite di riferimento fissato a 50g (e mai ricadente sui 100g generici delle proteine). Se la ricetta contiene 40g di feta, l\'app calcola esattamente l\'80% del fabbisogno (40g su 50g); se abbinata ad un uovo (es. 10g di feta e 1 uovo), calcola la percentuale esatta del 70% (20% + 50%) e segnala come quota massima consentita 25g. Nel suggeritore rapido e nell\'adattamento automatico, la dose singola di riferimento per la feta è categoricamente 50g.',
    changes: [
      {
        type: 'fix',
        title: 'Classificazione Feta tra i Formaggi Stagionati (50g Max)',
        description:
          'La Feta non viene più trattata come formaggio fresco generico né ricade sui 100g del gruppo proteine. Viene agganciata all\'opzione dei formaggi stagionati del piano (standard 50g) o all\'opzione specifica "Feta" se presente nel piano nutrizionale.',
        howToUse: 'Inserendo la Feta o formaggi stagionati (parmigiano, grana, pecorino, scamorza), la quota mostrata è sempre di max 50g.',
      },
      {
        type: 'feat',
        title: 'Calcolo Matematico Percentuale su Feta & Abbinamenti Multi-Proteina',
        description:
          'Il calcolo del fabbisogno per la Feta è proporzionato ai 50g: 40g di feta corrispondono all\'80% della quota proteica; 10g di feta (20%) + 1 uovo (50%) corrispondono esattamente al 70% totale.',
        howToUse: 'Sia nel dettaglio ricetta che nella schermata di aggiunta piatto, le percentuali e il tasto ⚡ Max riflettono i 50g della feta.',
      },
      {
        type: 'fix',
        title: 'Suggeritore Rapido Ad-Hoc con Feta Greca a 50g',
        description:
          'Nei suggerimenti rapidi degli ingredienti e dal titolo ricetta, la Feta greca viene proposta con la dose calibrata di 50g (e 2 uova per le uova intere).',
        howToUse: 'Toccando il suggerimento "Feta greca", viene inserita con il corretto dosaggio a norma del piano.',
      },
    ],
  },
  {
    version: '2.0.2',
    date: '27 Ottobre 2026',
    title: 'Fix Schermata Nera nel Tab Spesa & Protezione Globale con ErrorBoundary',
    isLatest: false,
    summary:
      'Versione 2.0.2: risolto il problema di rendering per cui la schermata Spesa diventava completamente nera. È stato eliminato l\'ordinamento su campi IndexedDB non indicizzati (SchemaError su createdAt in Dexie) passando a un caricamento resiliente con toArray() e sort in memoria; aggiunte protezioni null-safe per gli ingredienti dei pasti pianificati; introdotta la migrazione versione 4 del database; ed integrato un ErrorBoundary globale a livello di applicazione per prevenire qualsiasi crash dell\'interfaccia.',
    changes: [
      {
        type: 'fix',
        title: 'Risoluzione Schermata Nera nel Tab Spesa (Dexie SchemaError)',
        description:
          'Il caricamento delle liste della spesa e degli alimenti in dispensa non tenta più di eseguire ordinamenti su proprietà non indicizzate nel database IndexedDB, causa della schermata nera all\'apertura della tab. I record vengono ora caricati ed ordinati istantaneamente in memoria in modo totalmente sicuro.',
        howToUse: 'Tocca "Spesa" dalla barra inferiore: la pagina si apre istantaneamente senza alcun blocco o schermo nero.',
      },
      {
        type: 'fix',
        title: 'Protezione Null-Safe per i Suggerimenti dal Meal Planner',
        description:
          'Aggiunti controlli di sicurezza su tutte le ricette pianificate e sulle relative grammature degli ingredienti (prevenendo eccezioni su adaptedQuantity non definita).',
        howToUse: 'I suggerimenti automatici dal Meal Planner appaiono in fondo alla lista spesa in modo stabile.',
      },
      {
        type: 'feat',
        title: 'ErrorBoundary Globale Anti-Crash',
        description:
          'Introdotto un componente ErrorBoundary che avvolge l\'intero albero di navigazione: se dovesse verificarsi un errore imprevisto, l\'app non collassa più a schermo nero ma mostra una schermata di recupero con pulsanti di ripristino immediato.',
        howToUse: 'Garantisce massima affidabilità e zero interruzioni di servizio durante la navigazione.',
      },
    ],
  },
  {
    version: '2.0.1',
    date: '27 Ottobre 2026',
    title: 'Quote Proporzionali su Alimenti Specifici & Promemoria Real-Time del Limite Massimo Consentito',
    isLatest: false,
    summary:
      'Versione 2.0.1: perfezionamento radicale del calcolo dei limiti di fabbisogno per gruppo nutrizionale. Il sistema ora riconosce il fabbisogno del singolo alimento modificato (es. se nel piano nutrizionale sono previsti 50g di feta o 2 uova, 40g di feta corrispondono esattamente all\'80% della quota proteica e non a un 40% generico su 100g). Con più alimenti dello stesso gruppo (es. 10g di feta e 1 uovo), calcola la ripartizione proporzionale esatta (20% + 50% = 70% totale). Durante la modifica manuale, l\'app indica in tempo reale il fabbisogno specifico del piano e il massimo inseribile per quell\'alimento tenendo conto della quota già occupata dagli altri ingredienti, con il pulsante rapido ⚡ Max per allineare la dose in un tocco.',
    changes: [
      {
        type: 'feat',
        title: 'Calcolo Quote Proporzionali sui Singoli Alimenti (Feta, Uova, Patate, ecc.)',
        description:
          'La percentuale di copertura del gruppo nutrizionale viene ora calcolata rigorosamente sul valore specifico assegnato a ciascun alimento nel tuo piano nutrizionale. Esempio: se hai 50g di feta o 2 uova nel piano, 40g di feta corrispondono all\'80% della quota proteica; 10g di feta (20%) + 1 uovo (50%) danno un totale esatto del 70%.',
        howToUse: 'Apri qualsiasi ricetta con alimenti combinati o alternativi: il banner del gruppo e ogni singolo alimento mostrano la percentuale precisa.',
      },
      {
        type: 'feat',
        title: 'Promemoria Dinamico del Massimo Inseribile per Ingrediente',
        description:
          'Sia nella schermata di dettaglio ricetta che nella creazione ad-hoc, ogni ingrediente mostra il limite del piano e calcola dinamicamente quanto ne puoi ancora inserire al massimo senza sforare, sottraendo la quota già assorbita dagli altri alimenti dello stesso gruppo (es. con 1 uovo presente, il massimo inseribile per la feta è 25g).',
        howToUse: 'Tocca "Modifica Dosi": vedrai "Piano: max 50g • Max con altri: 25g" e potrai cliccare "⚡ Max 25g" per applicare subito la dose ideale.',
      },
      {
        type: 'fix',
        title: 'Regolazione Intelligente delle Uova & Matching Multi-Livello',
        description:
          'I tasti +/- nella modifica dosi ora riconoscono automaticamente le uova intere regolando per 1 uovo alla volta (e non per 5g generici). Il motore di matching adotta un algoritmo a due livelli che privilegia sempre le opzioni specifiche del tuo piano (es. "Feta 50g") prima di ricorrere a categorie generali.',
        howToUse: 'Usa i tasti + e - accanto alle uova per aumentare o ridurre di 1 pezzo alla volta.',
      },
    ],
  },
  {
    version: '2.0.0',
    date: '27 Ottobre 2026',
    title: 'NutriRecipe 2.0: Spesa & Dispensa Intelligente, Buoni Pasto Automatici, Memoria Prezzi e Monitoraggio Scadenze',
    isLatest: false,
    summary:
      'NutriRecipe 2.0 segna una svolta fondamentale nell\'applicazione introducendo il modulo completo Spesa & Dispensa. La schermata della spesa è ora suddivisa in due sezioni integrate: la classica Lista della Spesa arricchita con aggiunta rapida e suggerimenti automatici dal Meal Planner (settimana corrente e della settimana prossima verso il weekend); un totale di spesa in alto a destra che cresce man mano che depenni gli articoli nel carrello; la gestione facoltativa dei Buoni Pasto (con calcolo istantaneo, es. "4 BP + 2.00 €"); la memoria dei prezzi con modale rapida di conferma quando spunti un alimento; il Checkout che azzera il conto e trasferisce gli alimenti direttamente nella tua Dispensa; e il nuovo tab Dispensa per monitorare scadenze, quantità residue e suggerire automaticamente di riordinare i cibi che stanno per scadere o esaurirsi.',
    changes: [
      {
        type: 'feat',
        title: 'Modulo Spesa & Dispensa a Doppio Tab Integrato',
        description:
          'La schermata Spesa include ora due sezioni navigabili con indicatori numerici: la Lista della Spesa organizzata per macro-categorie e la Dispensa di casa con l\'inventario degli alimenti già acquistati.',
        howToUse: 'Apri la sezione Spesa dalla barra di navigazione inferiore e passa liberamente tra Lista Spesa e Dispensa.',
      },
      {
        type: 'feat',
        title: 'Totale nel Carrello in Alto a Destra & Buoni Pasto Intelligenti',
        description:
          'Il totale della spesa in alto a destra aumenta esclusivamente quando metti un alimento nel carrello depennandolo. Se attivi i Buoni Pasto (configurabili sia dalle impostazioni che con un tocco sul widget), l\'app calcola esattamente quanti buoni pasto usare e il saldo residuo (es. con buoni da 8€: spesa di 32€ = 4 BP, spesa di 34€ = 4 BP + 2.00€).',
        howToUse: 'Tocca il widget del totale in alto a destra per configurare il valore del tuo buono pasto (es. 7€, 8€, 9.50€).',
      },
      {
        type: 'feat',
        title: 'Memoria Prezzi degli Alimenti & Modale di Conferma Prezzo al Tocco',
        description:
          'Quando spunti un ingrediente per metterlo nel carrello, si apre una modale rapida pre-compilata con l\'ultimo prezzo noto registrato in precedenza per quell\'alimento, con tasti veloci (+0.50€, +1.00€, +2.00€). Confermando, il prezzo viene memorizzato nel database per le spese future e sommato al conto totale.',
        howToUse: 'Tocca la casella di un ingrediente mentre fai la spesa: conferma o adegua il prezzo pagato in un istante.',
      },
      {
        type: 'feat',
        title: 'Checkout della Spesa con Trasferimento Automatico in Dispensa',
        description:
          'Terminata la spesa, il pulsante "Completa Spesa" apre il riepilogo finale con il totale e i buoni pasto da consegnare alla cassa. Al checkout, il conto totale si azzera, gli alimenti acquistati vengono rimossi dalla lista e trasferiti automaticamente nella Dispensa con una data di scadenza stimata intelligente in base alla tipologia di alimento.',
        howToUse: 'Premi "Completa Spesa" in basso per archiviare gli acquisti e riempire la dispensa di casa con un solo tocco.',
      },
      {
        type: 'feat',
        title: 'Tab Dispensa con Monitoraggio Scadenze & Scalamento Quantità',
        description:
          'La Dispensa mostra tutti gli alimenti disponibili a casa con badge cromatici di scadenza (verde = fresco, giallo = scade entro 3 giorni, rosso = scaduto!). Permette di scalare le quantità man mano che cucini (-50g, -100g) o segnare un cibo come finito, e con il tasto rapido "Riordina" permette di rimettere subito il cibo nella lista della spesa.',
        howToUse: 'Nel tab Dispensa monitora le scadenze e tocca "Riordina" per reinserire nella spesa gli alimenti che stanno terminando.',
      },
      {
        type: 'feat',
        title: 'Suggerimenti Intelligenti dal Meal Planner (Settimana Corrente e Prossima)',
        description:
          'In fondo alla lista della spesa compaiono due sezioni di suggerimenti con aggiunta in un tap: gli ingredienti necessari per i pasti pianificati nel Meal Planner (se è verso il weekend, include anche la settimana prossima!) e gli alimenti della dispensa che sono esauriti o vicini alla scadenza.',
        howToUse: 'Scorri in basso nella lista della spesa e tocca i chip suggeriti per aggiungere al volo gli ingredienti che mancano.',
      },
    ],
  },
  {
    version: '1.7.3',
    date: '27 Ottobre 2026',
    title: 'Adattamento Nutrizionale Deterministico Avanzato, Fix Macro Salmone, Multi-Proteina Legumi+Feta, Limiti Fabbisogno in Real-Time & Planner Sticky',
    isLatest: false,
    summary:
      'Versione 1.7.3: potenziamento dell\'algoritmo deterministico e risoluzione di tutti i casi limite di fabbisogno. Le patate vengono ora calcolate esattamente sui 200g previsti dal piano nutrizionale per il pranzo (e modulate su cena o post-workout); eliminato alla radice il bug delle 1023 kcal sul salmone; integrato il dimezzamento 50/50 per abbinamenti multi-proteina come Legumi e Feta; aggiunti i promemoria del limite massimo consentito per gruppo durante la modifica manuale; suggerimenti ingredienti intelligenti divisi per tipologia di pasto (Colazione con latte, yogurt e cioccolato fondente max 15g; Pranzo/Cena con salmone, verdure e patate); salvataggio manuale istantaneo e garantito in Recipe Detail con bottoni +/-; e barra settimanale del Meal Planner sticky con scorrimento fluido al tocco del giorno.',
    changes: [
      {
        type: 'ai',
        title: 'Calcolo Fabbisogno Patate & Carboidrati Specifici per Pasto',
        description:
          'L\'algoritmo deterministico ora riconosce specificamente le opzioni di patate all\'interno del piano nutrizionale e le calcola a 200g per il pranzo (oppure applica la proporzione equivalente ufficiale di 2.85x rispetto alla pasta), differenziando tra pranzo, cena e cena post-workout ed evitando che venga assegnata la dose base da 70g.',
        howToUse: 'Crea o aggiungi ricette con patate (es. Frittata patate e cipolla o Salmone con patate): le dosi rifletteranno fedelmente il tuo fabbisogno per quel momento della giornata.',
      },
      {
        type: 'fix',
        title: 'Risoluzione Definitiva Macro Salmone (Addio 1023 kcal)',
        description:
          'Risolto il bug nel calcolatore nutrizionale ad-hoc in cui le stringhe descrittive dell\'olio venivano erroneamente concatenate trasformando 10g in 101g. Il calcolo di calorie e macronutrienti per il salmone e tutti gli altri alimenti è ora rigoroso, centralizzato e conforme ai valori nutrizionali ufficiali.',
        howToUse: 'I valori nutrizionali calcolati per il salmone (circa 188 kcal/100g) e per l\'olio EVO (82 kcal/10g) sono ora precisi e visualizzati in tempo reale.',
      },
      {
        type: 'feat',
        title: 'Dimezzamento Multi-Proteina 50/50 per Legumi e Feta',
        description:
          'La Feta (e i formaggi freschi proteici da secondo piatto) e i legumi vengono ora riconosciuti entrambi come fonti proteiche principali del pasto: in presenza di entrambi, l\'algoritmo dimezza automaticamente al 50% la dose di ciascuno (es. 40g legumi secchi e 45g feta), garantendo il perfetto equilibrio dell\'apporto proteico.',
        howToUse: 'Componi piatti con legumi e formaggio o uova e formaggio: il sistema bilancerà le dosi al 50% di ciascun alimento in automatico.',
      },
      {
        type: 'feat',
        title: 'Promemoria Limite Massimo Fabbisogno per Gruppo in Real-Time',
        description:
          'Sia nella composizione ad-hoc che nella schermata di dettaglio ricetta, ogni gruppo nutrizionale (Carboidrati, Proteine, Verdure, Grassi) mostra ora il limite massimo previsto dal piano e la percentuale totale utilizzata dagli alimenti inseriti, con un avviso visivo immediato se la quota viene superata.',
        howToUse: 'Durante la modifica delle dosi, osserva l\'indicatore colorato sotto ciascun gruppo per sapere subito quanto margine hai dal tuo fabbisogno.',
      },
      {
        type: 'feat',
        title: 'Suggerimenti Ingredienti Contestuali al Pasto (Colazione vs Pranzo/Cena)',
        description:
          'I suggerimenti rapidi per le ricette ad-hoc cambiano dinamicamente in base al momento del giorno selezionato: per la Colazione appaiono latte, yogurt greco, avena, fette biscottate, marmellata e cioccolato fondente (con dose massima fissata a 15g e mai "q.b."); per Pranzo e Cena appaiono salmone, petto di pollo, legumi, uova, feta, patate, verdure fresche e olio EVO.',
        howToUse: 'In Aggiungi Ricetta > Crea Pietanza ad hoc, seleziona il momento del pasto e tocca i chip degli ingredienti consigliati per aggiungerli con un solo tap.',
      },
      {
        type: 'fix',
        title: 'Salvataggio Manuale Garantito in Recipe Detail con Tasti +/-',
        description:
          'Risolto il problema di salvataggio delle modifiche manuali sulle ricette con varianti: ora la modifica agisce esattamente sulla variante selezionata, aggiorna sia i grammi che i macronutrienti nel database Dexie e fornisce bottoni [-] e [+] per incrementare o decrementare rapidamente le dosi senza blocchi su mobile.',
        howToUse: 'In Dettaglio Ricetta tocca "Modifica", regola le dosi con i tasti +/- o scrivendo il valore e clicca "Salva Dosi".',
      },
      {
        type: 'design',
        title: 'Planner con Barra Settimana Sticky e Giorni Tappabili con Scroll Fluido',
        description:
          'Nel Meal Planner la barra di navigazione settimanale con la striscia dei giorni rimane ora fissa in alto durante lo scorrimento; toccando un giorno specifico (es. Mercoledì), la pagina scrolla fluidamente e posiziona la card del giorno direttamente sotto la barra, evidenziando il giorno selezionato.',
        howToUse: 'Apri il Planner, tocca un giorno qualsiasi nella barra superiore per raggiungerlo all\'istante.',
      },
    ],
  },
  {
    version: '1.7.2',
    date: '27 Ottobre 2026',
    title: 'Perfezionamento Dark Mode OLED Eye-Care & Audit Totale Superfici',
    isLatest: false,
    summary:
      'Versione 1.7.2: revisione completa e capillare del tema scuro in tutta l\'app per eliminare qualsiasi bagliore bianco o affaticamento visivo. Introdotte superfici profonde nero/slate OLED (#030712 / gray-950) con elevazioni morbide su tonalità grafite e titanio, testi attenuati ad alta leggibilità, e dark styling integrale su modali, cassetti, selettori dei giorni, tabelle grammature, riquadri pasti e liste della spesa.',
    changes: [
      {
        type: 'design',
        title: 'Dark Mode Eye-Care & Superfici Morbide Anti-Affaticamento',
        description:
          'Eliminati tutti i riquadri e sfondi bianchi residui nelle modali (Aggiungi al Piano, Scegli Ricetta, Modelli Settimanali, Ricalibra Dosi, Changelog), nel generatore di ricette ad hoc, nella lista della spesa e nel wizard della settimana standard. I colori sono ora calibrati su tonalità slate/grafite che non affaticano la vista anche al buio completo o a letto.',
        howToUse: 'Attiva la modalità scura in Impostazioni > Aspetto & Tema oppure lascia che l\'app segua automaticamente il tema del tuo telefono.',
      },
      {
        type: 'design',
        title: 'Contrasto e Tipografia per Schermi OLED',
        description:
          'I bottoni di selezione (pranzo/cena, vista singola vs riquadri insieme, per macro/componenti/lista) e le schede nutrizionali utilizzano gradienti scuri opacizzati e bordature sottili a contrasto morbido (gray-800 / gray-700), garantendo una lettura confortevole e un risparmio energetico ottimale su display OLED.',
        howToUse: 'Naviga tra ricettario, planner e dettagli ricetta per sperimentare il nuovo comfort visivo.',
      },
      {
        type: 'fix',
        title: 'Coerenza Grafica su Cassetti e Drawer Mobili',
        description:
          'Uniformati gli header, le aree di scorrimento touch e i footer fissi di tutte le modali di scelta pasto e varianti, impedendo stacchi cromatici bianchi durante lo scroll e preservando le safe area inferiori su iOS e Android.',
        howToUse: 'Disponibile automaticamente in tutta l\'applicazione.',
      },
    ],
  },
  {
    version: '1.7.1',
    date: '27 Ottobre 2026',
    title: 'Dark Mode Completa, Fix Pasto Libero a Pranzo, Tasto Ricalibra e Riadattamento Completo con Avanzamento Real-Time',
    isLatest: false,
    summary:
      'Aggiornamento 1.7.1: supporto completo alla Dark Mode (con selettore Chiaro / Scuro / Sistema), risoluzione definitiva del bug dello sgarro sul pranzo, nuovo tasto "Ricalibra Dosi" sulla singola ricetta con anteprima e opzioni AI/Manuale, calibrazione esatta delle grammature dal piano nutrizionale (Salmone 200/250/280g, Lenticchie + Uova 50/50 e fix grassi a 99g), e riadattamento totale di tutte le ricette precedenti con barra di avanzamento real-time nelle impostazioni.',
    changes: [
      {
        type: 'fix',
        title: 'Fix Pasto Libero / Sgarro a Pranzo e Cena',
        description:
          'Risolto il bug che impediva di assegnare il pasto libero al pranzo: toccando il tasto "Pasto Libero" sul pranzo nella creazione guidata veniva erroneamente impostata la cena. Ora lo sgarro può essere assegnato con 1 tocco sia a pranzo che a cena in qualsiasi schermata (calendario, modale e creazione guidata).',
        howToUse: 'Tocca il pulsante "🍕 Pasto Libero" sul riquadro del Pranzo o della Cena nel Planner o nella Creazione Guidata.',
      },
      {
        type: 'feat',
        title: 'Tasto "Ricalibra Dosi" sulla Singola Ricetta (Algoritmo, AI o Manuale)',
        description:
          'Aggiunto nella pagina della ricetta il tasto "⚡ Ricalibra Dosi con Algoritmo". Apre una modale di confronto prima/dopo che mostra le nuove dosi ricalcolate sul tuo piano attivo. Puoi confermare e applicare con 1 tocco, procedere invece con l\'AI se preferisci la narrazione generativa, oppure modificare manualmente qualsiasi grammatura con l\'editing inline.',
        howToUse: 'Apri una qualsiasi ricetta e tocca "⚡ Ricalibra Dosi" sotto i valori nutrizionali.',
      },
      {
        type: 'feat',
        title: 'Riadattamento Completo di Tutte le Ricette con Barra di Avanzamento',
        description:
          'Nelle Impostazioni è ora presente il tool per rifare l\'intero procedimento di adattamento su tutte le ricette già importate nel ricettario. Mostra una barra di avanzamento fluida in tempo reale con il nome della ricetta in lavorazione, il conteggio progressivo e la percentuale.',
        howToUse: 'Vai in "Impostazioni" e tocca "⚡ Riadatta tutte le ricette precedenti".',
      },
      {
        type: 'fix',
        title: 'Calibrazione Grammature Esatte da Piano & Correzione Calcolo Grassi',
        description:
          'L\'algoritmo ora interroga le opzioni specifiche del tuo piano nutrizionale: per il salmone assegna le grammature differenziate (es. 200g a pranzo, 250g a cena, 280g in cena post workout). Nelle ricette con legumi e uova (es. polpette di lenticchie) applica la corretta divisione al 50% (40g di lenticchie e 1 uovo intero con dosaggio calibrato degli addensanti). Corretto il calcolo nutrizionale eliminando l\'anomalia dei 99g di grassi sull\'olio.',
        howToUse: 'Attivo automaticamente su tutte le calibrazioni e varianti pasto.',
      },
      {
        type: 'design',
        title: 'Dark Mode Completa & Adattiva al Sistema',
        description:
          'Interfaccia ottimizzata per la modalità scura con sfondo ad alto contrasto, elementi in grafite e titanio, preservando la leggibilità. Nelle Impostazioni è ora disponibile il selettore "Aspetto & Tema" con 3 opzioni: Chiaro ☀️, Scuro 🌙 o Segui Sistema 🌗.',
        howToUse: 'Vai in Impostazioni > Aspetto & Tema per scegliere la modalità preferita.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '27 Ottobre 2026',
    title: 'Algoritmo Deterministico di Calibrazione Dosi, Creazione Ricette Ad-Hoc e Pasti Composti con Contorni',
    isLatest: false,
    summary:
      'Introdotto un nuovo algoritmo matematico/deterministico indipendente dall\'AI per la calibrazione esatta delle dosi: quando sono presenti uova e parmigiano vengono entrambi dimezzati al 50% riconoscendo il parmigiano come proteina nobile. Nuova schermata "Aggiungi Ricetta" con creazione rapida ad hoc e suggeritore ingredienti dal titolo senza testi artificiali, rilevamento automatico dei contorni e supporto a pasti composti nel Planner con ripartizione automatica delle verdure.',
    changes: [
      {
        type: 'feat',
        title: 'Algoritmo Deterministico Indipendente dall\'AI (Uova + Parmigiano Dimezzati)',
        description:
          'Creato un algoritmo matematico che confronta direttamente le quantità salvate nel tuo piano. Quando rileva combinazioni multi-fonte come uova e parmigiano (anche negli impasti), dimezza entrambi al 50% della quota, ricordandosi che il parmigiano oltre ad essere formaggio è a tutti gli effetti una proteina. Funziona sia in automatico che come garanzia/fallback per correggere eventuali imprecisioni.',
        howToUse: 'Applicato automaticamente a tutte le ricette create o importate.',
      },
      {
        type: 'feat',
        title: 'Nuova Schermata "Aggiungi Ricetta" con Creazione Ad-Hoc',
        description:
          'La sezione "Importa" diventa "Aggiungi": ora puoi creare una ricetta personalizzata da zero (es. "Salmone in friggitrice ad aria"). L\'AI non crea procedimenti artificiali: il sistema suggerisce istantaneamente gli ingredienti giusti dal titolo e l\'algoritmo calcola subito le dosi esatte.',
        howToUse: 'Tocca "➕ Aggiungi" nella barra in basso e seleziona "✍️ Crea".',
      },
      {
        type: 'feat',
        title: 'Rilevamento Contorni e Pasti Composti (Piatto + Contorno)',
        description:
          'Una ricetta di sole verdure viene etichettata come "🥗 Contorno". Nel Meal Planner puoi ora associare più piatti allo stesso pranzo o cena (es. Frittata di zucchine + Contorno di verdure): la quota totale di verdure (es. 200g) viene ripartita equamente tra entrambe le pietanze (100g e 100g).',
        howToUse: 'Aggiungi un contorno e un piatto principale nello stesso giorno: visualizzerai il badge "Pasto Composto Bilanciato".',
      },
      {
        type: 'design',
        title: 'Nuova Voce "Aggiungi" nella Barra di Navigazione',
        description:
          'La barra di navigazione inferiore è stata aggiornata con la dicitura "Aggiungi", offrendo un accesso unificato sia alla creazione ad hoc che all\'importazione da Instagram, TikTok e YouTube.',
        howToUse: 'Icona ➕ "Aggiungi" nella navbar inferiore.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '27 Ottobre 2026',
    title: 'Creazione Guidata Settimana Standard con Business Rules, Limiti Frequenze e Pasto Libero',
    isLatest: false,
    summary:
      'Nuova schermata dedicata "Crea Settimana Standard" giorno per giorno (da Lunedì a Domenica) con domanda a fuoco "Cosa vuoi mangiare oggi?". Il sistema monitora le frequenze alimentari del tuo piano in tempo reale: ti avvisa quando raggiungi il limite (es. max 3 volte carne rossa), ti suggerisce cosa mangiare (es. pesce se mangiato solo 2/4 volte) e ti ricorda di posizionare il tuo pasto libero al sabato sera se non l\'hai ancora fatto.',
    changes: [
      {
        type: 'feat',
        title: 'Creazione Guidata Modello Settimana (Lunedì → Domenica)',
        description:
          'Nuovo wizard a tutto schermo che ti guida giorno dopo giorno con un layout ad alto focus: "Cosa vuoi mangiare Lunedì?", "Cosa vuoi mangiare Martedì?", ecc. Puoi scorrere i 7 giorni, selezionare ricette con varianti, inserire pasti veloci o impostare pasti liberi.',
        howToUse: 'Dalla sezione Planner tocca "📋 Modelli" → "✨ Crea Settimana".',
      },
      {
        type: 'ai',
        title: 'Business Rules e Frequenze Nutrizionali in Tempo Reale',
        description:
          'Il sistema memorizza le frequenze alimentari del tuo piano (Carne Rossa, Pesce, Carne Bianca, Legumi, Uova, Latticini). Quando componi la settimana, un banner intelligente ti segnala se un alimento ha raggiunto il limite massimo e contrassegna le ricette nel selettore con badge "✨ Consigliato dal Piano" o "⚠️ Limite Raggiunto".',
        howToUse: 'I suggerimenti e i conteggi compaiono in cima alla schermata di creazione e nel selettore ricette.',
      },
      {
        type: 'feat',
        title: 'Gestione Pasto Libero (Cheat Meal) e Promemoria Sabato',
        description:
          'Puoi contrassegnare qualsiasi pasto come "🍕 Pasto Libero / Sgarro". Se arrivi al Sabato (o Domenica) e non hai ancora posizionato il tuo pasto libero settimanale, il sistema ti mostra un promemoria e ti permette di impostarlo sulla cena di Sabato con un solo tocco.',
        howToUse: 'Tocca il pulsante "🍕 Pasto Libero" su qualsiasi pasto o accetta il suggerimento al Sabato.',
      },
      {
        type: 'feat',
        title: 'Frequenze e Regole Settimanali Modificabili nel Profilo',
        description:
          'In "Visualizza e Modifica Piano" è presente una nuova scheda per consultare e personalizzare le frequenze settimanali consigliate dal nutrizionista per ogni gruppo alimentare.',
        howToUse: 'Vai in Impostazioni ⚙️ → "Visualizza e Modifica Piano" → "🎯 Frequenze Settimanali e Pasti Liberi".',
      },
    ],
  },
  {
    version: '1.5.2',
    date: '26 Ottobre 2026',
    title: 'Tasto Aggiungi Ricetta al Giorno, Spazio Navbar su Cassetti e Stepper Dosi (+ a sinistra, - a destra)',
    isLatest: false,
    summary:
      'Introdotto il pulsante esplicito "+ Aggiungi" nel selettore ricette del giorno, aggiunto padding per distanziare i cassetti dalla navbar inferiore, ottimizzato il cassetto "Aggiorna con AI" con scrolling fluido, e inseriti i tasti stepper + / - con risoluzione del blocco dello zero durante la digitazione delle dosi.',
    changes: [
      {
        type: 'feat',
        title: 'Tasto "+ Aggiungi" Chiaramente Visibile per Aggiungere Piatti al Giorno',
        description:
          'Nel cassetto per scegliere una ricetta dal ricettario ora ogni scheda presenta un tasto verde "+ Aggiungi", e toccando la ricetta compare in basso un grande pulsante verde di conferma: "Aggiungi [Nome Ricetta] a [Pasto] ✓". Se la ricetta ha alternative o varianti (es. Cena o Cena Post Workout), puoi selezionare la variante al volo.',
        howToUse: 'Dalla schermata del Meal Planner tocca "+ Aggiungi" su qualsiasi pasto: tocca la ricetta e premi il tasto verde.',
      },
      {
        type: 'design',
        title: 'Spazio e Padding tra la Navbar e la Fine del Cassetto',
        description:
          'Il cassetto non è più appiccicato al fondo dello schermo o a filo con la barra di navigazione. È stato aggiunto padding sul fondo e bordi arrotondati su tutti i lati (rounded-3xl) in modo da lasciare respiro visivo sopra la navbar.',
        howToUse: 'I cassetti ora fluttuano elegantemente sopra la barra senza sovrapposizioni o sensazione di oppressione.',
      },
      {
        type: 'fix',
        title: 'Cassetto "Aggiorna con AI" con Scroll Fluido e Padding',
        description:
          'Risolto il blocco del cassetto per aggiornare il piano nutrizionale con AI (da testo o PDF): ora scorre fluidamente, rispetta il padding sopra la navbar e blocca lo scroll della pagina di sfondo.',
        howToUse: 'Vai in Impostazioni ⚙️ → "Visualizza e Modifica Piano" → "Ricarica con AI".',
      },
      {
        type: 'feat',
        title: 'Stepper Quantità (+ a sinistra, - a destra) e Rimozione Blocco Zero',
        description:
          'Risolto il problema per cui cancellando il numero rimaneva lo 0 impedendo di digitare subito valori come "70". Aggiunti pratici tasti touch stepper: un "+" a sinistra per aumentare e un "-" a destra per diminuire comodamente di 5g (o 1 porzione).',
        howToUse: 'Nella modifica del piano nutrizionale o delle varianti, usa i tasti + e - oppure cancella e scrivi la cifra direttamente.',
      },
    ],
  },
  {
    version: '1.5.1',
    date: '26 Ottobre 2026',
    title: 'Fix Cassetti Mobile: Blocco Scroll Sfondo, Layout dvh e Pulsanti Salva Sempre Visibili',
    isLatest: false,
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
