import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const AI_IMAGE_PATH = '/Users/micheleschiavone/.gemini/antigravity/brain/28eca1c1-95d4-4a72-a843-bea9964f9c5b/nutrirecipe_app_icon_1793047668530.jpg'
const ICONS_DIR = path.resolve(process.cwd(), 'public/icons')

async function run() {
  fs.mkdirSync(ICONS_DIR, { recursive: true })

  // 1. Create squircle mask SVG (22.5% radius standard for iOS icons)
  const maskSvg = Buffer.from(`
    <svg width="1024" height="1024">
      <rect x="0" y="0" width="1024" height="1024" rx="230" ry="230" fill="#ffffff" />
    </svg>
  `)

  // 2. Process the master image with rounded corners
  const masked1024 = await sharp(AI_IMAGE_PATH)
    .resize(1024, 1024)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // 3. Save 512x512 icon
  await sharp(masked1024)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'))
  console.log('✅ Generated public/icons/icon-512.png (512x512)')

  // 4. Save 192x192 icon
  await sharp(masked1024)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'))
  console.log('✅ Generated public/icons/icon-192.png (192x192)')

  // 5. Save 180x180 apple-touch-icon
  await sharp(masked1024)
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'))
  console.log('✅ Generated public/icons/apple-touch-icon.png (180x180)')

  // 6. Also copy full 1024 image to docs/screenshots for display
  fs.copyFileSync(AI_IMAGE_PATH, path.resolve(process.cwd(), 'docs/screenshots/app-icon.jpg'))
  console.log('✅ Copied master image to docs/screenshots/app-icon.jpg')
}

run().catch(console.error)
