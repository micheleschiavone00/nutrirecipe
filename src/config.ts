/**
 * Configurazione privata dell'applicazione (Uso Personale)
 * Le chiavi API sono gestite sul server (api/parse-video.ts e api/ai.ts)
 * tramite variabili d'ambiente protette (RAPIDAPI_KEY e OPENAI_API_KEY).
 */

export const CONFIG = {
  rapidApiKey: (import.meta.env?.VITE_RAPIDAPI_KEY as string | undefined) || '',
  openAIApiKey: (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined) || '',
}

export function isOpenAIConfigured(): boolean {
  return true
}

export function isRapidAPIConfigured(): boolean {
  return true
}
