import { useState } from 'react'
import { loginAsAdmin } from '@/lib/adminAuth'

interface AdminLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await loginAsAdmin(password)
    setLoading(false)

    if (result.success) {
      setPassword('')
      onSuccess()
      onClose()
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-black">
              👑
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                Accesso Admin
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Uso esclusivo per Michele (Sviluppatore)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          Accedendo come Admin, l&apos;applicazione sblocca l&apos;accesso alle <strong>chiavi API centrali configurate sul tuo server Vercel</strong>, consentendoti di utilizzare l&apos;AI e le importazioni social senza dover configurare chiavi personali su questo dispositivo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide block mb-1">
              Password Amministratore
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Inserisci password admin..."
                autoFocus
                className="w-full text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 pr-10 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2 text-xs font-bold"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="btn-primary flex-1 py-2 text-xs font-bold disabled:opacity-50"
            >
              {loading ? 'Verifica…' : 'Accedi come Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
