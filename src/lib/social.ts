import type { RecipeSource } from '@/types'

export interface VideoMetadata {
  title: string
  description: string
  thumbnailUrl?: string
  author?: string
  duration?: number
  transcript?: string
  ingredients?: string[]
}

/**
 * Calls our Vercel Edge Function which in turn calls RapidAPI.
 * In development, falls back to a mock if VITE_API_BASE is not set.
 */
export async function extractVideoMetadata(url: string): Promise<VideoMetadata> {
  const apiBase = import.meta.env.VITE_API_BASE ?? ''

  const response = await fetch(`${apiBase}/api/parse-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Errore nel parsing del video')
  }

  return response.json()
}

export function detectSource(url: string): RecipeSource {
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  return 'manual'
}

/**
 * Analyzes a PDF file and returns its text content using pdf.js
 */
export async function extractPDFText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // We'll use a simple approach: read as ArrayBuffer and use fetch to our edge function
        // For client-side PDF parsing, we use pdf.js loaded from CDN in the HTML
        const arrayBuffer = e.target?.result as ArrayBuffer
        
        // @ts-ignore — pdf.js loaded globally
        if (typeof window.pdfjsLib !== 'undefined') {
          // @ts-ignore
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
          let fullText = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ')
            fullText += pageText + '\n'
          }
          resolve(fullText)
        } else {
          // Fallback: send to server
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
          const formData = new FormData()
          formData.append('file', blob, file.name)
          const apiBase = import.meta.env.VITE_API_BASE ?? ''
          const res = await fetch(`${apiBase}/api/parse-pdf`, {
            method: 'POST',
            body: formData,
          })
          const data = await res.json()
          resolve(data.text ?? '')
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
