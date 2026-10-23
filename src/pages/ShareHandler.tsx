import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { LoadingSpinner } from '@/components/ui'

/**
 * Handles the Web Share Target.
 * When the user shares from TikTok/Instagram, iOS calls:
 * /share?url=<shared-url>&title=<title>&text=<text>
 *
 * This page immediately redirects to /import with the URL.
 */
export default function ShareHandler() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const url = params.get('url') || params.get('text') || ''
    const title = params.get('title') || ''

    // Small delay to let the PWA fully mount
    const timer = setTimeout(() => {
      if (url) {
        navigate(`/import?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, {
          replace: true,
        })
      } else {
        navigate('/import', { replace: true })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [params, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-primary-500 rounded-3xl flex items-center justify-center shadow-lg">
        <span className="text-3xl">🥗</span>
      </div>
      <LoadingSpinner size="md" label="Apertura NutriRecipe…" />
    </div>
  )
}
