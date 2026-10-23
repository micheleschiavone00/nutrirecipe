/**
 * Configurazione privata dell'applicazione (Uso Personale)
 * Le chiavi API sono cablate qui e/o lette da variabili d'ambiente.
 */

export const CONFIG = {
  // RapidAPI Key per lo scraping video (Instagram, TikTok, YouTube)
  rapidApiKey:
    (import.meta.env?.VITE_RAPIDAPI_KEY as string | undefined) ||
    '569cddf354msh7e271c4e13f475ap15d3a8jsn09bab6180f59',

  // OpenAI API Key per l'analisi PDF e l'adattamento delle ricette con GPT-4o
  // Letta in modo sicuro da .env.local (in locale) o dalle Environment Variables di Vercel (in produzione)
  openAIApiKey:
    (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined) ||
    '',
}

export function isOpenAIConfigured(): boolean {
  return Boolean(
    CONFIG.openAIApiKey ||
    import.meta.env?.VITE_OPENAI_API_KEY ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('openai_api_key'))
  )
}

export function isRapidAPIConfigured(): boolean {
  return Boolean(CONFIG.rapidApiKey)
}
