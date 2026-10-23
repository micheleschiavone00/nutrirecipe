# 🥗 NutriRecipe

**PWA per adattare ricette dai social al tuo piano nutrizionale personale.**

## Funzionalità

- 📄 **Analisi PDF** del piano nutrizionale (con OpenAI GPT-4o)
- 🎥 **Import ricette** da TikTok, Instagram, YouTube
- 🤖 **Adattamento AI** delle quantità al tuo piano
- 📚 **Ricettario personale** con filtri e ricerca
- 📅 **Meal Planner** settimanale
- 🛒 **Lista della spesa** generata automaticamente
- 📱 **PWA installabile** su iPhone (senza Apple Developer Account)

---

## Setup Locale

### 1. Prerequisiti
- Node.js 18+
- npm o pnpm

### 2. Installa dipendenze
```bash
cd nutrirecipe
npm install
```

### 3. Avvia in sviluppo
```bash
npm run dev
```

Apri `http://localhost:5173` in Safari su iPhone (o sul Mac per testare).

---

## Deploy su Vercel (per accedere da iPhone)

### 1. Crea repository GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create nutrirecipe --private
git push -u origin main
```

### 2. Deploy su Vercel
1. Vai su [vercel.com](https://vercel.com) e accedi con GitHub
2. Clicca **"New Project"** → importa il repo `nutrirecipe`
3. In **Environment Variables** aggiungi:
   - `RAPIDAPI_KEY` = la tua chiave RapidAPI
4. Clicca **Deploy** — sarà live in ~1 minuto!

### 3. Configura le API Keys nell'app
1. Apri l'URL Vercel su Safari iPhone
2. Vai in **Impostazioni** → inserisci la tua **OpenAI API Key**
3. La RapidAPI key è già nel server (Vercel env var)

### 4. Installa come PWA su iPhone
1. Apri l'URL Vercel in **Safari** (non Chrome!)
2. Tocca il pulsante **Condividi** (□↑)
3. Scorri → **"Aggiungi a schermata Home"**
4. Dai un nome e tocca **Aggiungi**

✅ NutriRecipe apparirà automaticamente nel menu **Condividi** di TikTok e Instagram!

---

## Come usare

### Importare una ricetta da TikTok
1. Apri TikTok, trova una ricetta
2. Tocca **Condividi** → **NutriRecipe**
3. L'app estrae automaticamente gli ingredienti
4. L'AI adatta le quantità al tuo piano
5. Salva nel ricettario e/o aggiungi al Meal Planner

### Caricare il piano nutrizionale
1. Vai in **Setup** all'apertura dell'app
2. Scegli **"Carica PDF"** e seleziona il documento della tua nutrizionista
3. L'AI analizza il PDF e imposta tutti i gruppi alimentari automaticamente
4. Puoi modificare manualmente qualsiasi valore

---

## Architettura

```
src/
├── pages/           # Setup, Import, Recipes, RecipeDetail, Planner, Shopping, Settings
├── components/ui/   # BottomNav, PageHeader, Badge, LoadingSpinner, NutriBar...
├── lib/
│   ├── db.ts        # IndexedDB con Dexie.js
│   ├── ai.ts        # Chiamate OpenAI (analisi PDF + adattamento)
│   ├── social.ts    # Parsing link social
│   └── utils.ts     # Helper e costanti
├── types/           # TypeScript types
api/
├── parse-video.ts   # Edge Function: parsing TikTok/IG
└── parse-pdf.ts     # Edge Function: fallback PDF parsing
```

### Privacy & Sicurezza
- I tuoi dati (piano nutrizionale, ricette, meal plan) vengono salvati **solo nel browser**
- La OpenAI API key è salvata in `localStorage` — non va mai su server terzi
- La RapidAPI key è in Vercel env var (server-side only)

---

## API Keys necessarie

| Servizio | Dove ottenerla | Costo |
|----------|---------------|-------|
| **OpenAI GPT-4o** | [platform.openai.com](https://platform.openai.com/api-keys) | ~$0.01/ricetta |
| **RapidAPI** | [rapidapi.com](https://rapidapi.com) | Gratis (100 req/mese) |
| **Vercel** | [vercel.com](https://vercel.com) | Gratis |

---

## Tech Stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** (UI mobile-first)
- **Dexie.js** (IndexedDB wrapper)
- **vite-plugin-pwa** (Service Worker + Web Share Target)
- **Vercel Edge Functions** (backend serverless)
- **OpenAI GPT-4o** (AI engine)
- **RapidAPI** (social scraping)
