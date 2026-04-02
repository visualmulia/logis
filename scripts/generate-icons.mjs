// Script untuk generate icons sederhana
// Jalankan: node scripts/generate-icons.mjs
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync('./public/icons', { recursive: true })

for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, size, size)

  // Orange accent bar
  ctx.fillStyle = '#F97316'
  ctx.fillRect(0, size * 0.85, size, size * 0.15)

  // Text LOGIS
  ctx.fillStyle = '#f5f0eb'
  ctx.font = `bold ${size * 0.22}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('LOGIS', size / 2, size / 2)

  writeFileSync(
    `./public/icons/icon-${size}x${size}.png`,
    canvas.toBuffer('image/png')
  )
  console.log(`✓ Generated ${size}x${size}`)
}