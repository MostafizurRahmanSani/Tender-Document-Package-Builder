// Draws a line of Bangla text to a PNG using the browser's own text engine, which shapes Bengali
// correctly (a PDF library cannot position the vowel signs). The PNG is then placed on the index page.

export interface TextImage {
  bytes: Uint8Array
  widthPt: number
  heightPt: number
  descentPt: number // how far the image extends below the text baseline
}

export type TextImageRenderer = (
  text: string,
  opts: { bold: boolean; sizePt: number; maxWidthPt: number; color: string },
) => Promise<TextImage | null>

const SCALE = 5 // canvas pixels per PDF point, so the text stays sharp when printed

export const renderBanglaText: TextImageRenderer = async (text, { bold, sizePt, maxWidthPt, color }) => {
  try {
    const weight = bold ? 600 : 400
    const px = sizePt * SCALE
    const family = '"Noto Sans Bengali", "Inter", ui-sans-serif, sans-serif'
    // Make sure the font files are loaded before measuring, otherwise a fallback font would be drawn.
    await document.fonts.load(`${weight} ${px}px "Noto Sans Bengali"`, text)
    await document.fonts.load(`${weight} ${px}px "Inter"`, 'Aa0')

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = `${weight} ${px}px ${family}`

    // Shorten with "..." only if the line is wider than its column.
    let line = text
    const maxPx = maxWidthPt * SCALE
    if (ctx.measureText(line).width > maxPx) {
      let s = text
      while (s.length > 1 && ctx.measureText(s + '...').width > maxPx) s = s.slice(0, -1)
      line = s + '...'
    }

    const width = Math.ceil(ctx.measureText(line).width) + 4
    const ascent = Math.ceil(px * 1.05)
    const descent = Math.ceil(px * 0.55) // Bengali has marks below the baseline
    canvas.width = width
    canvas.height = ascent + descent
    ctx.font = `${weight} ${px}px ${family}` // resizing the canvas resets its state
    ctx.fillStyle = color
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(line, 2, ascent)

    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) return null
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      widthPt: canvas.width / SCALE,
      heightPt: canvas.height / SCALE,
      descentPt: descent / SCALE,
    }
  } catch {
    return null
  }
}
