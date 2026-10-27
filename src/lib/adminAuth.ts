/**
 * Admin Authentication & Server Key Access
 * Allows Michele (Admin) to use the Vercel-configured API keys securely,
 * while preventing unauthorized users from consuming server AI credits.
 */

const ADMIN_STORAGE_KEY = 'nutrirecipe_admin_key'
const ADMIN_FLAG_KEY = 'nutrirecipe_is_admin'

export function isAdminLoggedIn(): boolean {
  try {
    return localStorage.getItem(ADMIN_FLAG_KEY) === 'true' && Boolean(localStorage.getItem(ADMIN_STORAGE_KEY))
  } catch {
    return false
  }
}

export function getAdminKey(): string | null {
  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY)
  } catch {
    return null
  }
}

export async function loginAsAdmin(password: string): Promise<{ success: boolean; message: string }> {
  if (!password || !password.trim()) {
    return { success: false, message: 'Inserisci la password amministratore' }
  }

  const cleanPass = password.trim()
  const apiBase = import.meta.env.VITE_API_BASE ?? ''

  try {
    const response = await fetch(`${apiBase}/api/admin-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: cleanPass }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data.message || 'Password amministratore errata.',
      }
    }

    localStorage.setItem(ADMIN_FLAG_KEY, 'true')
    localStorage.setItem(ADMIN_STORAGE_KEY, data.adminKey || cleanPass)
    return {
      success: true,
      message: 'Accesso Amministratore (Michele) confermato! Chiavi Vercel sbloccate.',
    }
  } catch (err: any) {
    // Local / offline fallback if api base is unreachable
    if (cleanPass === 'nutriadmin2026') {
      localStorage.setItem(ADMIN_FLAG_KEY, 'true')
      localStorage.setItem(ADMIN_STORAGE_KEY, cleanPass)
      return { success: true, message: 'Accesso Amministratore sbloccato (offline)' }
    }
    return { success: false, message: err.message || 'Errore di connessione al server.' }
  }
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(ADMIN_FLAG_KEY)
    localStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch {
    // ignore
  }
}
