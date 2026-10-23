import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/parse-pdf
 * Body: multipart/form-data with 'file' field (PDF)
 *
 * Extracts text from a PDF using a simple approach.
 * Returns: { text: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // For PDF parsing on the server we use a simple regex/text extraction
  // In production you'd use pdf-parse or pdf2json
  // The client side handles pdf.js directly, this is a fallback
  
  try {
    const chunks: Uint8Array[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Simple PDF text extraction (looks for text streams)
    const text = extractTextFromPDFBuffer(buffer)

    return res.status(200).json({ text })
  } catch (error: unknown) {
    console.error('parse-pdf error:', error)
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore nel parsing del PDF',
    })
  }
}

function extractTextFromPDFBuffer(buffer: Buffer): string {
  // Basic PDF text extraction — looks for BT/ET text blocks
  const str = buffer.toString('latin1')
  const textBlocks: string[] = []

  // Match text between BT and ET markers
  const btEtRegex = /BT([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1]
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    const TJRegex = /\[([^\]]*)\]\s*TJ/g
    
    let tm
    while ((tm = tjRegex.exec(block)) !== null) {
      textBlocks.push(tm[1])
    }
    while ((tm = TJRegex.exec(block)) !== null) {
      const parts = tm[1].match(/\(([^)]*)\)/g)
      if (parts) {
        textBlocks.push(parts.map(p => p.slice(1, -1)).join(''))
      }
    }
  }

  return textBlocks.join(' ').replace(/\s+/g, ' ').trim()
}
