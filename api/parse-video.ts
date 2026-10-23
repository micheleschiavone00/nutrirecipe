import type { VercelRequest, VercelResponse } from '@vercel/node'

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
 * Base64 alphabet used by Instagram to encode shortcodes into numeric media IDs
 */
const INSTAGRAM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/**
 * Converts an Instagram shortcode (e.g. 'DF5n04SvL0L') into its 64-bit integer media ID
 */
export function shortcodeToInstagramId(shortcode: string): string {
  let id = 0n
  for (const char of shortcode) {
    const index = INSTAGRAM_ALPHABET.indexOf(char)
    if (index === -1) {
      throw new Error(`Carattere non valido nello shortcode Instagram: ${char}`)
    }
    id = id * 64n + BigInt(index)
  }
  return id.toString()
}

/**
 * Extracts the numeric Media ID from an Instagram URL or raw numeric ID.
 * Supports:
 * - Direct IDs: "3565055737711082763"
 * - Reels: "https://www.instagram.com/reel/DF5n04SvL0L/"
 * - Posts: "https://www.instagram.com/p/DF5n04SvL0L/"
 * - Share links: "https://www.instagram.com/share/reel/DF5n04SvL0L/"
 * - IGTV: "https://www.instagram.com/tv/DF5n04SvL0L/"
 * - Short links: "https://instagr.am/p/DF5n04SvL0L/"
 */
export function extractInstagramId(urlOrId: string): string | null {
  if (!urlOrId) return null
  const clean = urlOrId.trim()

  // 1. Direct numeric ID
  if (/^\d+$/.test(clean)) return clean

  // 2. URL containing shortcode
  const match = clean.match(
    /(?:instagram\.com|instagr\.am)\/(?:[a-zA-Z0-9._]+\/)?(?:p|reel|reels|tv|share\/reel|share\/p)\/([A-Za-z0-9_-]+)/i
  )
  if (match && match[1]) {
    try {
      return shortcodeToInstagramId(match[1])
    } catch {
      // Ignore conversion errors and try next method
    }
  }

  // 3. Query parameter: ?id=... or ?media_id=...
  try {
    const parsed = new URL(clean)
    const idParam = parsed.searchParams.get('id') || parsed.searchParams.get('media_id')
    if (idParam && /^\d+$/.test(idParam)) {
      return idParam
    }
  } catch {
    // Ignore invalid URL
  }

  return null
}

/**
 * Parses video metadata from TikTok, Instagram, YouTube or generic OpenGraph.
 */
export async function parseVideoUrl(url: string, apiKey: string): Promise<VideoMetadata> {
  const isTikTok = url.includes('tiktok.com') || url.includes('vm.tiktok.com')
  const isInstagram = url.includes('instagram.com') || url.includes('instagr.am')
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

  if (isTikTok) {
    return parseTikTok(url, apiKey)
  } else if (isInstagram) {
    return parseInstagram(url, apiKey)
  } else if (isYouTube) {
    return parseYouTube(url, apiKey)
  } else {
    return parseOpenGraph(url)
  }
}

/**
 * POST /api/parse-video
 * Body: { url: string }
 * Headers (optional): x-rapidapi-key
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { url } = (req.body || {}) as { url?: string }

  if (!url) {
    return res.status(400).json({ message: 'Missing url parameter' })
  }

  const rapidApiKey =
    process.env.RAPIDAPI_KEY ||
    (req.headers['x-rapidapi-key'] as string) ||
    '569cddf354msh7e271c4e13f475ap15d3a8jsn09bab6180f59'
  if (!rapidApiKey) {
    return res.status(500).json({ message: 'RapidAPI key non configurata sul server' })
  }

  try {
    const metadata = await parseVideoUrl(url, rapidApiKey)
    return res.status(200).json(metadata)
  } catch (error: unknown) {
    console.error('parse-video error:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore nel parsing del video',
    })
  }
}

async function parseTikTok(url: string, apiKey: string): Promise<VideoMetadata> {
  const response = await fetch(
    `https://tiktok-video-no-watermark2.p.rapidapi.com/?url=${encodeURIComponent(url)}&hd=1`,
    {
      headers: {
        'x-rapidapi-host': 'tiktok-video-no-watermark2.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    }
  )

  if (!response.ok) throw new Error(`TikTok API error: ${response.status}`)
  const data = await response.json()

  return {
    title: data.data?.title || data.data?.desc || '',
    description: data.data?.desc || '',
    thumbnailUrl: data.data?.cover || data.data?.origin_cover || '',
    author: data.data?.author?.nickname || '',
    duration: data.data?.duration,
    transcript: data.data?.desc || '',
  }
}

async function parseInstagram(url: string, apiKey: string): Promise<VideoMetadata> {
  let mediaId = extractInstagramId(url)

  // Follow redirect if needed (e.g. short share link)
  if (!mediaId && url.startsWith('http')) {
    try {
      const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      if (headRes.url && headRes.url !== url) {
        mediaId = extractInstagramId(headRes.url)
      }
    } catch {
      // Ignore network errors when checking redirect
    }
  }

  if (!mediaId) {
    throw new Error("Impossibile estrarre l'ID del post o reel Instagram dal link fornito")
  }

  // Instagram API – Fast & Reliable Data Scraper via RapidAPI
  const response = await fetch(
    `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/media?id=${mediaId}`,
    {
      headers: {
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Errore RapidAPI Instagram (${response.status}): ${errorText || response.statusText}`)
  }

  const data = await response.json()

  // Extract caption text
  const captionText =
    typeof data.caption === 'string'
      ? data.caption
      : (data.caption?.text || data.title || '')

  // Title: take the first non-empty line of the caption, or default
  const firstLine = captionText
    .split('\n')
    .map((line: string) => line.trim())
    .find((line: string) => line.length > 3) || ''

  const title =
    firstLine.length > 0
      ? firstLine.slice(0, 100)
      : (data.title || 'Ricetta Instagram')

  const thumbnailUrl =
    data.image_versions2?.candidates?.[0]?.url ||
    data.thumbnail ||
    data.thumbnail_url ||
    data.display_url ||
    ''

  const author = data.user?.username || data.user?.full_name || data.owner?.username || ''

  return {
    title,
    description: captionText,
    thumbnailUrl,
    author,
    duration: data.video_duration,
    transcript: captionText,
  }
}

async function parseYouTube(url: string, apiKey: string): Promise<VideoMetadata> {
  const videoId = extractYouTubeId(url)
  if (!videoId) throw new Error('YouTube video ID not found')

  const response = await fetch(
    `https://youtube-v31.p.rapidapi.com/videos?part=snippet,contentDetails&id=${videoId}`,
    {
      headers: {
        'x-rapidapi-host': 'youtube-v31.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    }
  )

  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`)
  const data = await response.json()
  const item = data.items?.[0]

  return {
    title: item?.snippet?.title || '',
    description: item?.snippet?.description || '',
    thumbnailUrl: item?.snippet?.thumbnails?.high?.url || '',
    author: item?.snippet?.channelTitle || '',
    transcript: item?.snippet?.description || '',
  }
}

async function parseOpenGraph(url: string): Promise<VideoMetadata> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NutriRecipeBot/1.0)' },
  })
  const html = await response.text()

  const getMetaContent = (name: string) => {
    const match =
      html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, 'i'))
    return match?.[1] || ''
  }

  return {
    title: getMetaContent('og:title') || getMetaContent('twitter:title') || '',
    description: getMetaContent('og:description') || getMetaContent('description') || '',
    thumbnailUrl: getMetaContent('og:image') || '',
    transcript: getMetaContent('og:description') || '',
  }
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/)
  return match?.[1] || null
}
