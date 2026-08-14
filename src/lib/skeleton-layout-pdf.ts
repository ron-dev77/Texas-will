import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import {
  fillSkeletonTokens,
  type SkeletonBlock,
  type SkeletonDoc,
  type TextAlign,
  type SkeletonFillOptions,
} from '@/lib/skeleton-doc'

/** ISO A4 in PDF points */
export const A4_WIDTH = 595.28
export const A4_HEIGHT = 841.89

type RichRun = { text: string; bold: boolean }

function cleanLegalText(text: string): string {
  return text.replace(/[—–]/g, '-').replace(/ {2,}/g, ' ')
}

function parseRich(text: string): RichRun[] {
  const cleaned = cleanLegalText(text)
  const runs: RichRun[] = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned))) {
    if (m.index > last) runs.push({ text: cleaned.slice(last, m.index), bold: false })
    runs.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < cleaned.length) runs.push({ text: cleaned.slice(last), bold: false })
  if (runs.length === 0) runs.push({ text: cleaned, bold: false })
  return runs.filter((r) => r.text.length > 0)
}

function wrapRichLines(
  text: string,
  regular: PDFFont,
  bold: PDFFont,
  size: number,
  maxWidth: number,
): RichRun[][] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')
  const allLines: RichRun[][] = []

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push([])
      continue
    }
    const runs = parseRich(para)
    type Word = { text: string; bold: boolean }
    const words: Word[] = []
    for (const run of runs) {
      const parts = run.text.split(/(\s+)/)
      for (const part of parts) {
        if (!part || /^\s+$/.test(part)) continue
        words.push({ text: part, bold: run.bold })
      }
    }

    let line: RichRun[] = []
    let lineWidth = 0
    const spaceW = regular.widthOfTextAtSize(' ', size)

    for (const w of words) {
      const f = w.bold ? bold : regular
      const wWidth = f.widthOfTextAtSize(w.text, size)
      const addSpace = line.length > 0 ? spaceW : 0
      if (line.length > 0 && lineWidth + addSpace + wWidth > maxWidth) {
        allLines.push(line)
        line = [{ text: w.text, bold: w.bold }]
        lineWidth = wWidth
      } else if (line.length > 0) {
        line.push({ text: ' ' + w.text, bold: w.bold })
        lineWidth += addSpace + wWidth
      } else {
        line.push({ text: w.text, bold: w.bold })
        lineWidth = wWidth
      }
    }
    if (line.length) allLines.push(line)
  }
  return allLines
}

function measureRichLineWidth(line: RichRun[], regular: PDFFont, bold: PDFFont, size: number) {
  return line.reduce((sum, run) => {
    const f = run.bold ? bold : regular
    return sum + f.widthOfTextAtSize(run.text, size)
  }, 0)
}

function xForAlign(
  align: TextAlign,
  contentWidth: number,
  marginX: number,
  textWidth: number,
): number {
  if (align === 'center') return marginX + (contentWidth - textWidth) / 2
  if (align === 'right') return marginX + contentWidth - textWidth
  return marginX
}

/**
 * Render a skeleton layout document onto hardcoded A4 pages.
 * Honors alignment, signature lines, spacers, page breaks, and **bold** markers.
 */
export async function renderSkeletonLayoutPdf(
  doc: SkeletonDoc,
  answers: Record<string, unknown> = {},
  options: SkeletonFillOptions = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)

  const pageWidth = A4_WIDTH
  const pageHeight = A4_HEIGHT
  const marginX = 56.7 // ~20mm
  const marginY = 56.7
  const footerReserve = 22
  const bottomLimit = marginY + footerReserve
  const contentWidth = pageWidth - marginX * 2
  const usableHeight = pageHeight - marginY - bottomLimit
  /** Allow closing signature blocks a bit lower so they stay on the prior page. */
  const squeezeBottom = marginY + 10

  const bodySize = 11
  const headingSize = 12
  const titleSize = 16
  const lineHeight = 14
  const labelSize = 9
  const sigBlockH = 38
  const sigLineOffset = 20
  const ink = rgb(0.12, 0.14, 0.18)
  const pageBg = rgb(247 / 255, 243 / 255, 234 / 255)

  const pages: PDFPage[] = []
  const startPage = () => {
    const p = pdf.addPage([pageWidth, pageHeight])
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: pageBg })
    pages.push(p)
    return p
  }

  let page = startPage()
  let y = pageHeight - marginY

  const spaceLeft = (bottom = bottomLimit) => y - bottom
  const newPage = () => {
    page = startPage()
    y = pageHeight - marginY
  }
  const need = (h: number, bottom = bottomLimit) => {
    if (h <= 0) return
    if (spaceLeft(bottom) < h && h <= pageHeight - marginY - bottom) newPage()
  }

  const drawAlignedText = (
    text: string,
    f: PDFFont,
    size: number,
    align: TextAlign,
    gapAfter: number,
  ) => {
    const explicit = text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const lines: string[] =
      explicit.length > 1
        ? explicit
        : (() => {
            const single = explicit[0] ?? text.trim()
            if (f.widthOfTextAtSize(single, size) <= contentWidth) return [single]
            // Soft-wrap long titles to about two balanced lines
            const words = single.split(/\s+/).filter(Boolean)
            const mid = Math.ceil(words.length / 2)
            const a = words.slice(0, mid).join(' ')
            const b = words.slice(mid).join(' ')
            return b ? [a, b] : [a]
          })()

    const blockH = lines.length * (size + 4) + gapAfter
    need(blockH)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const w = f.widthOfTextAtSize(line, size)
      page.drawText(line, {
        x: xForAlign(align, contentWidth, marginX, w),
        y: y - size,
        size,
        font: f,
        color: ink,
      })
      y -= size + (i < lines.length - 1 ? 4 : gapAfter)
    }
  }

  const drawParagraph = (raw: string, align: TextAlign, size = bodySize) => {
    const text = fillSkeletonTokens(raw, answers, options).trim()
    if (!text) return
    const lines = wrapRichLines(text, font, fontBold, size, contentWidth)
    for (const line of lines) {
      if (!line.length) {
        y -= lineHeight * 0.5
        continue
      }
      need(lineHeight)
      const w = measureRichLineWidth(line, font, fontBold, size)
      let x = xForAlign(align, contentWidth, marginX, w)
      const baseline = y - size
      for (const run of line) {
        const f = run.bold ? fontBold : font
        page.drawText(run.text, { x, y: baseline, size, font: f, color: ink })
        x += f.widthOfTextAtSize(run.text, size)
      }
      y -= lineHeight
    }
  }

  const drawSigLine = (label: string, align: TextAlign, width = Math.min(280, contentWidth)) => {
    const blockH = sigBlockH
    need(blockH, squeezeBottom)
    let x = marginX
    if (align === 'center') x = marginX + (contentWidth - width) / 2
    if (align === 'right') x = marginX + contentWidth - width
    // Leave room above the line for a handwritten signature.
    const lineY = y - sigLineOffset
    page.drawLine({
      start: { x, y: lineY },
      end: { x: x + width, y: lineY },
      thickness: 1,
      color: ink,
    })
    const lw = fontItalic.widthOfTextAtSize(label, labelSize)
    page.drawText(label, {
      x: x + Math.max(0, (width - lw) / 2),
      y: lineY - 4 - labelSize,
      size: labelSize,
      font: fontItalic,
      color: ink,
    })
    y -= blockH
  }

  const drawSigPair = (left: string, right: string) => {
    const gap = 20
    const colW = (contentWidth - gap) / 2
    const blockH = sigBlockH
    need(blockH, squeezeBottom)
    const lineY = y - sigLineOffset
    page.drawLine({
      start: { x: marginX, y: lineY },
      end: { x: marginX + colW, y: lineY },
      thickness: 1,
      color: ink,
    })
    page.drawLine({
      start: { x: marginX + colW + gap, y: lineY },
      end: { x: marginX + contentWidth, y: lineY },
      thickness: 1,
      color: ink,
    })
    const leftW = fontItalic.widthOfTextAtSize(left, labelSize)
    const rightW = fontItalic.widthOfTextAtSize(right, labelSize)
    page.drawText(left, {
      x: marginX + Math.max(0, (colW - leftW) / 2),
      y: lineY - 4 - labelSize,
      size: labelSize,
      font: fontItalic,
      color: ink,
    })
    page.drawText(right, {
      x: marginX + colW + gap + Math.max(0, (colW - rightW) / 2),
      y: lineY - 4 - labelSize,
      size: labelSize,
      font: fontItalic,
      color: ink,
    })
    y -= blockH
  }

  const applyBlankLines = (n: number) => {
    if (n <= 0) return
    y -= lineHeight * n
  }

  const title = (doc.title || 'LAST WILL AND TESTAMENT').toUpperCase().replace(/\s+/g, ' ').trim()
  const normalizeHeading = (raw: string) =>
    fillSkeletonTokens(raw, answers, options)
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim()

  const titlesOverlap = (a: string, b: string) => a === b || a.includes(b) || b.includes(a)

  // Document title + one or more overlapping heading blocks → draw a single title only.
  let displayTitle = title
  const skipTitleBlockIdx = new Set<number>()
  for (let i = 0; i < doc.blocks.length; i++) {
    const b = doc.blocks[i]
    if ((b.kind !== 'heading' && b.kind !== 'section') || !b.heading.trim()) continue
    const h = normalizeHeading(b.heading)
    if (!titlesOverlap(h, title) && !titlesOverlap(h, displayTitle)) continue
    skipTitleBlockIdx.add(i)
    if (h.length > displayTitle.length) displayTitle = h
  }

  /** Rough height of blocks from `fromIdx` until the next enabled page break / end. */
  const estimateTrailingHeight = (fromIdx: number): number => {
    let h = 0
    for (let j = fromIdx; j < doc.blocks.length; j++) {
      if (skipTitleBlockIdx.has(j)) continue
      const b = doc.blocks[j]
      if (j > fromIdx && b.pageBreakBefore) break
      if (b.kind === 'page_break') {
        if (j === fromIdx) continue
        if (b.pageBreakBefore) break
        continue
      }
      if (b.kind === 'spacer') {
        h += lineHeight * Math.max(1, b.blankLinesAfter || 2)
        continue
      }
      if (b.kind === 'signature' || b.kind === 'signature_pair') {
        h += sigBlockH + 2 + lineHeight * (b.blankLinesAfter || 0)
        continue
      }
      const text =
        b.kind === 'heading'
          ? b.heading
          : b.kind === 'paragraph'
            ? b.body
            : `${b.heading}\n${b.body}`
      const filled = fillSkeletonTokens(text || '', answers, options)
      const lines = Math.max(1, Math.ceil(filled.length / 90) + filled.split('\n').length)
      h += lines * (b.kind === 'heading' ? headingSize + 4 : lineHeight)
      h += lineHeight * (b.blankLinesAfter || 0)
    }
    return h
  }

  const drawBlock = (block: SkeletonBlock, index: number) => {
    const wantsBreak = Boolean(block.pageBreakBefore)
    if (wantsBreak) {
      // Soft-skip forced breaks when remaining content still fits on this page —
      // avoids a nearly empty last page from a default page break.
      const remainingApprox = estimateTrailingHeight(index)
      if (remainingApprox <= 0 || remainingApprox > spaceLeft()) {
        newPage()
      }
      if (block.kind === 'page_break') {
        applyBlankLines(block.blankLinesAfter)
        return
      }
    } else if (block.kind === 'page_break') {
      // Unchecked page-break block: ignore (no forced new page).
      return
    }

    if (block.kind === 'spacer') {
      const lines = Math.max(1, block.blankLinesAfter || 2)
      need(lineHeight * Math.min(lines, 4))
      y -= lineHeight * lines
      return
    }

    if (block.kind === 'heading') {
      const heading = fillSkeletonTokens(block.heading || 'Heading', answers, options).toUpperCase()
      const headingFont = block.headingBold === false ? font : fontBold
      // Keep heading with following paragraph + signature lines when possible (prefer prior page).
      let keepWith = headingSize + 8 + lineHeight * (block.blankLinesAfter || 0)
      for (let j = index + 1; j < doc.blocks.length; j++) {
        if (skipTitleBlockIdx.has(j)) continue
        const next = doc.blocks[j]
        if (next.pageBreakBefore || next.kind === 'page_break') break
        if (next.kind === 'signature' || next.kind === 'signature_pair') {
          keepWith += sigBlockH + 2 + lineHeight * (next.blankLinesAfter || 0)
          continue
        }
        if (next.kind === 'spacer') {
          keepWith += lineHeight * Math.max(1, next.blankLinesAfter || 2)
          break
        }
        if (next.kind === 'paragraph' || next.kind === 'heading' || next.kind === 'section') {
          const filled = fillSkeletonTokens(
            next.kind === 'heading' ? next.heading : next.body || '',
            answers,
            options,
          ).trim()
          const rich = filled ? wrapRichLines(filled, font, fontBold, bodySize, contentWidth) : []
          for (const line of rich) keepWith += line.length ? lineHeight : lineHeight * 0.5
          keepWith += lineHeight * (next.blankLinesAfter || 0)
          // Also pull trailing signatures after that paragraph.
          for (let k = j + 1; k < doc.blocks.length; k++) {
            const trail = doc.blocks[k]
            if (trail.pageBreakBefore || trail.kind === 'page_break') break
            if (trail.kind === 'signature' || trail.kind === 'signature_pair') {
              keepWith += sigBlockH + 2 + lineHeight * (trail.blankLinesAfter || 0)
              continue
            }
            break
          }
        }
        break
      }
      // Prefer staying on this page: only break if it truly cannot fit with a slight footer squeeze.
      if (spaceLeft(squeezeBottom) < Math.min(keepWith, usableHeight * 0.5)) {
        need(Math.min(keepWith, usableHeight * 0.5), squeezeBottom)
      }
      drawAlignedText(heading, headingFont, headingSize, block.align, 6)
      applyBlankLines(block.blankLinesAfter)
      return
    }

    if (block.kind === 'paragraph') {
      const filled = fillSkeletonTokens(block.body || '', answers, options).trim()
      const richLines = filled ? wrapRichLines(filled, font, fontBold, bodySize, contentWidth) : []
      let paraH = 0
      for (const line of richLines) {
        paraH += line.length ? lineHeight : lineHeight * 0.5
      }
      paraH += lineHeight * (block.blankLinesAfter || 0)
      let keep = paraH
      for (let j = index + 1; j < doc.blocks.length; j++) {
        if (skipTitleBlockIdx.has(j)) continue
        const next = doc.blocks[j]
        if (next.pageBreakBefore || next.kind === 'page_break') break
        if (next.kind === 'signature' || next.kind === 'signature_pair') {
          keep += sigBlockH + 2 + lineHeight * (next.blankLinesAfter || 0)
          continue
        }
        break
      }
      if (spaceLeft(squeezeBottom) < Math.min(keep, usableHeight * 0.55)) {
        need(Math.min(keep, usableHeight * 0.55), squeezeBottom)
      }
      drawParagraph(block.body || '', block.align)
      applyBlankLines(block.blankLinesAfter)
      return
    }

    if (block.kind === 'signature') {
      drawSigLine(fillSkeletonTokens(block.label || 'Signature', answers, options), block.align)
      applyBlankLines(block.blankLinesAfter)
      return
    }

    if (block.kind === 'signature_pair') {
      drawSigPair(
        fillSkeletonTokens(block.leftLabel || 'Left', answers, options),
        fillSkeletonTokens(block.rightLabel || 'Right', answers, options),
      )
      applyBlankLines(block.blankLinesAfter)
      return
    }

    // section
    if (block.heading.trim()) {
      const heading = fillSkeletonTokens(block.heading, answers, options).toUpperCase()
      const headingFont = block.headingBold === false ? font : fontBold
      drawAlignedText(heading, headingFont, headingSize, block.align, 8)
    }
    if (block.body.trim()) {
      drawParagraph(block.body, block.align)
    }
    applyBlankLines(block.blankLinesAfter)
  }

  drawAlignedText(displayTitle, fontBold, titleSize, 'center', 10)

  for (let i = 0; i < doc.blocks.length; i++) {
    if (skipTitleBlockIdx.has(i)) continue
    drawBlock(doc.blocks[i], i)
  }

  pages.forEach((p, i) => {
    const label = `Page ${i + 1}`
    const w = font.widthOfTextAtSize(label, 9)
    p.drawText(label, {
      x: (pageWidth - w) / 2,
      y: 36,
      size: 9,
      font,
      color: ink,
    })
  })

  return pdf.save()
}
