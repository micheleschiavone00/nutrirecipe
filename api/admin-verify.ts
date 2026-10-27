import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { password } = (req.body || {}) as { password?: string }
  const adminSecret =
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'nutriadmin2026'

  if (!password || password.trim() !== adminSecret.trim()) {
    return res.status(401).json({
      success: false,
      message: 'Password amministratore errata.',
    })
  }

  return res.status(200).json({
    success: true,
    message: 'Accesso Amministratore (Michele) autorizzato.',
    adminKey: adminSecret.trim(),
  })
}
