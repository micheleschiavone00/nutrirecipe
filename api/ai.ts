import type { VercelRequest, VercelResponse } from '@vercel/node'

export async function runChatCompletion(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model = 'gpt-4o'
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { messages, model } = (req.body || {}) as {
    messages?: Array<{ role: string; content: string }>
    model?: string
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: 'Missing or invalid messages parameter' })
  }

  const adminSecret =
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'nutriadmin2026'

  const clientAdminKey = req.headers['x-admin-key'] as string | undefined
  const clientOpenAiKey = req.headers['x-openai-key'] as string | undefined

  const isAdmin = Boolean(clientAdminKey && clientAdminKey.trim() === adminSecret.trim())

  let effectiveApiKey = ''

  if (isAdmin) {
    // Authorized as Admin (Michele): allowed to use server's OPENAI_API_KEY
    effectiveApiKey = process.env.OPENAI_API_KEY || ''
    if (!effectiveApiKey) {
      return res.status(500).json({
        message: 'OpenAI API key non configurata nelle variabili Vercel (imposta OPENAI_API_KEY)',
      })
    }
  } else if (clientOpenAiKey && clientOpenAiKey.trim()) {
    // User provided their own personal OpenAI API key
    effectiveApiKey = clientOpenAiKey.trim()
  } else {
    // Unauthorized access: protect developer from paying for other users
    return res.status(403).json({
      message:
        'Accesso AI non autorizzato. Accedi come Amministratore (Michele) oppure inserisci la tua chiave API personale gratuita in Impostazioni > Servizi & API.',
    })
  }

  try {
    const content = await runChatCompletion(messages, effectiveApiKey, model)
    return res.status(200).json({ content })
  } catch (error: unknown) {
    console.error('ai API error:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore durante la chiamata a OpenAI',
    })
  }
}
