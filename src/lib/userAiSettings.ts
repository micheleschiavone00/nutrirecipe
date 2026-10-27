/**
 * User AI Settings and Direct Provider Integration
 * Allows "Bring Your Own Key" (BYOK) so users utilize their own personal
 * Google Gemini (free via Google AI Studio) or OpenAI keys without incurring
 * costs for the app developer.
 */

export type AiProvider = 'deterministic' | 'gemini' | 'openai'

export interface UserAiConfig {
  provider: AiProvider
  geminiApiKey: string
  geminiModel: string
  openaiApiKey: string
  openaiModel: string
}

const STORAGE_KEY = 'nutrirecipe_user_ai_config'

export const DEFAULT_AI_CONFIG: UserAiConfig = {
  provider: 'deterministic',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
}

export function getUserAiConfig(): UserAiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_AI_CONFIG
    return { ...DEFAULT_AI_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export function saveUserAiConfig(config: Partial<UserAiConfig>): UserAiConfig {
  const current = getUserAiConfig()
  const updated = { ...current, ...config }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Direct client-side call to Google Gemini REST API.
 * Uses the user's personal Gemini API key.
 * 100% client-side, zero server load, zero cost for the application developer.
 */
export async function callGeminiDirect(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  apiKey: string,
  model = 'gemini-1.5-flash'
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Nessuna chiave API Gemini fornita. Inserisci la tua chiave in Impostazioni > Servizi & API.')
  }

  // Combine system instructions and user/assistant messages for Gemini format
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const nonSystemMessages = messages.filter(m => m.role !== 'system')

  const contents = nonSystemMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // If no user messages (rare), synthesize one
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: systemMessage }] })
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  }

  if (systemMessage) {
    requestBody.systemInstruction = {
      parts: [{ text: systemMessage }],
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const errMsg = errData.error?.message || response.statusText
    throw new Error(`Errore Gemini API (${response.status}): ${errMsg}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Risposta vuota da Gemini API.')
  }

  return text
}

/**
 * Tests connection to Google Gemini API with a dummy prompt.
 */
export async function testGeminiConnection(apiKey: string, model = 'gemini-1.5-flash'): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const start = Date.now()
  try {
    const res = await callGeminiDirect(
      [
        { role: 'system', content: 'Rispondi sempre e solo con un JSON contenente {"status": "ok"}' },
        { role: 'user', content: 'Ping' },
      ],
      apiKey,
      model
    )
    const latency = Date.now() - start
    const parsed = JSON.parse(res)
    if (parsed.status === 'ok') {
      return { success: true, message: `Connessione a Gemini riuscita! (${latency}ms)`, latencyMs: latency }
    }
    return { success: true, message: `Connesso (${latency}ms)`, latencyMs: latency }
  } catch (err: any) {
    return { success: false, message: err.message || 'Errore di connessione', latencyMs: Date.now() - start }
  }
}
