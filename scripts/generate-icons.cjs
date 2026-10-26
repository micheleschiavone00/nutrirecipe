const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = '/Users/micheleschiavone/.gemini/antigravity/brain/28eca1c1-95d4-4a72-a843-bea9964f9c5b';
const publicIconsDir = path.resolve(__dirname, '../public/icons');

const liquidGlassSrc = path.join(brainDir, 'nutrirecipe_liquid_glass_app_icon_1793052353923.jpg');
const darkSrc = path.join(brainDir, 'nutrirecipe_dark_clean_1793052406985.jpg');
const materialSvg = path.join(publicIconsDir, 'icon-material.svg');

function getSquircleMask(size, radius) {
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/></svg>`
  );
}

async function run() {
  console.log('Generating NutriRecipe burger icons...');

  // 1. Process Liquid Glass 3D Icon
  if (fs.existsSync(liquidGlassSrc)) {
    console.log('Processing Liquid Glass 3D icon...');
    await sharp(liquidGlassSrc)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-512.png'));

    await sharp(liquidGlassSrc)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-liquidglass.png'));

    await sharp(liquidGlassSrc)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-192.png'));

    const mask180 = getSquircleMask(180, 40);
    await sharp(liquidGlassSrc)
      .resize(180, 180, { fit: 'cover' })
      .composite([{ input: mask180, blend: 'dest-in' }])
      .png()
      .toFile(path.join(publicIconsDir, 'apple-touch-icon.png'));
  }

  // 2. Process Dark Mode Icon
  if (fs.existsSync(darkSrc)) {
    console.log('Processing Dark Mode icon...');
    await sharp(darkSrc)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-dark-512.png'));

    await sharp(darkSrc)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-dark.png'));

    await sharp(darkSrc)
      .resize(192, 192, { fit: 'cover' })
      .png()
      .toFile(path.join(publicIconsDir, 'icon-dark-192.png'));

    const mask180 = getSquircleMask(180, 40);
    await sharp(darkSrc)
      .resize(180, 180, { fit: 'cover' })
      .composite([{ input: mask180, blend: 'dest-in' }])
      .png()
      .toFile(path.join(publicIconsDir, 'apple-touch-icon-dark.png'));
  }

  // 3. Process Material SVG to PNG
  if (fs.existsSync(materialSvg)) {
    console.log('Processing Material icon...');
    await sharp(materialSvg)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicIconsDir, 'icon-material.png'));
  }

  console.log('All icons generated successfully!');
}

run().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
