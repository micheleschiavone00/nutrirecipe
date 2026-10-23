import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/parse-video
 * Body: { url: string }
 *
 * Uses RapidAPI to extract video metadata from TikTok/Instagram/YouTube.
 * Returns: VideoMetadata
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { url } = req.body as { url?: string }

  if (!url) {
    return res.status(400).json({ message: 'Missing url parameter' })
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY
  if (!rapidApiKey) {
    return res.status(500).json({ message: 'RapidAPI key not configured on server' })
  }

  try {
    // Detect platform
    const isTikTok = url.includes('tiktok.com') || url.includes('vm.tiktok.com')
    const isInstagram = url.includes('instagram.com') || url.includes('instagr.am')
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

    let metadata

    if (isTikTok) {
      metadata = await parseTikTok(url, rapidApiKey)
    } else if (isInstagram) {
      metadata = await parseInstagram(url, rapidApiKey)
    } else if (isYouTube) {
      metadata = await parseYouTube(url, rapidApiKey)
    } else {
      // Generic OpenGraph fallback
      metadata = await parseOpenGraph(url)
    }

    return res.status(200).json(metadata)
  } catch (error: unknown) {
    console.error('parse-video error:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore nel parsing del video',
    })
  }
}

async function parseTikTok(url: string, apiKey: string) {
  // Using TikTok API on RapidAPI
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

async function parseInstagram(url: string, apiKey: string) {
  // Instagram Downloader API on RapidAPI
  const response = await fetch(
    `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`,
    {
      headers: {
        'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com',
        'x-rapidapi-key': apiKey,
      },
    }
  )

  if (!response.ok) throw new Error(`Instagram API error: ${response.status}`)
  const data = await response.json()

  return {
    title: data.title || data.caption || '',
    description: data.caption || data.title || '',
    thumbnailUrl: data.thumbnail || data.thumbnail_url || '',
    author: data.owner?.username || '',
    transcript: data.caption || '',
  }
}

async function parseYouTube(url: string, apiKey: string) {
  // YouTube v3 via RapidAPI - extract video ID first
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

async function parseOpenGraph(url: string) {
  // Fallback: fetch and parse OG tags
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NutriRecipeBot/1.0)' },
  })
  const html = await response.text()

  const getMetaContent = (name: string) => {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${name}"`, 'i'))
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
