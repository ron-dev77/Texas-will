import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface WillContent {
  title: string
  testatorName: string
  sections: { heading: string; paragraphs: string[] }[]
}

type RichRun = { text: string; bold: boolean }

type ExecRow =
  | { kind: 'text'; text: string }
  | { kind: 'sig'; label: string }
  | { kind: 'sigPair'; left: string; right: string }
  | { kind: 'seal'; label: string }

interface ExecSection {
  heading: string
  rows: ExecRow[]
}

/** Signature / witnesses / affidavit / notary — compact two-column witness lines. */
function buildExecutionBlock(testatorName: string): ExecSection[] {
  const name = testatorName || '[Testator]'
  return [
    {
      heading: 'SIGNATURE OF TESTATOR',
      rows: [
        {
          kind: 'text',
          text: `I, **${name}**, the Testator, sign my name to this instrument this ______ day of __________________, 20_____, and being first duly sworn, do declare to the undersigned authority that I sign and execute this instrument as my **Last Will**, that I sign it willingly, that I execute it as my free and voluntary act for the purposes therein expressed, and that I am eighteen years of age or older, of sound mind, and under no constraint or undue influence.`,
        },
        { kind: 'sig', label: 'Signature of Testator' },
        { kind: 'sig', label: 'Printed Name' },
      ],
    },
    {
      heading: 'WITNESSES',
      rows: [
        {
          kind: 'text',
          text: "We, the undersigned witnesses, each being competent to act as a witness, sign our names to this instrument, being first duly sworn, and declare to the undersigned authority that the Testator signs and executes this instrument as the Testator's **Last Will**, that the Testator signs it willingly, and that each of us, in the presence and hearing of the Testator and of each other, hereby signs this Will as witness to the Testator's signing, and that to the best of our knowledge the Testator is eighteen years of age or older, of sound mind, and under no constraint or undue influence.",
        },
        {
          kind: 'text',
          text: '**IMPORTANT:** Neither witness may be a beneficiary named in this Will. Both witnesses must be present at the same time when the Testator signs.',
        },
        { kind: 'sigPair', left: 'Signature of Witness 1', right: 'Signature of Witness 2' },
        { kind: 'sigPair', left: 'Printed Name', right: 'Printed Name' },
        { kind: 'sigPair', left: 'Address', right: 'Address' },
      ],
    },
    {
      heading: 'SELF-PROVING AFFIDAVIT',
      rows: [
        {
          kind: 'text',
          text: `(Texas Estates Code Section **251.104**)\n\n**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nBefore me, the undersigned authority, on this day personally appeared **${name}**, the Testator, and ____________________________ and ____________________________, Witnesses, known to me to be the Testator and the witnesses whose names are signed to the foregoing instrument, and all being duly sworn, the Testator declared to me and to the witnesses that the foregoing instrument is the Testator's **Last Will and Testament** and that the Testator had willingly signed and executed it as the Testator's free and voluntary act for the purposes therein expressed. Each of the witnesses stated that the witness signed the Will as witness in the presence and hearing of the Testator and that to the best of the witness's knowledge, the Testator was eighteen years of age or older, of sound mind, and under no constraint or undue influence.`,
        },
        { kind: 'sig', label: 'Signature of Testator' },
        { kind: 'sigPair', left: 'Signature of Witness 1', right: 'Signature of Witness 2' },
      ],
    },
    {
      heading: 'NOTARY ACKNOWLEDGMENT',
      rows: [
        {
          kind: 'text',
          text: 'Subscribed and sworn to before me by the said __________________, Testator, and by the said __________________ and __________________, witnesses, this ______ day of __________________, 20_____.',
        },
        { kind: 'sig', label: 'Notary Public, State of Texas' },
        { kind: 'sig', label: 'My Commission Expires' },
        { kind: 'seal', label: '[NOTARY SEAL]' },
      ],
    },
  ]
}

export function isExecutionBlockSection(heading: string): boolean {
  return /^(signature of testator|witnesses|self[-\s]?proving affidavit|notary acknowledgment)\b/i.test(
    heading.trim(),
  )
}

export function normalizeWillExecutionBlock(will: WillContent): WillContent {
  const exec = buildExecutionBlock(will.testatorName).map((section) => ({
    heading: section.heading,
    paragraphs: section.rows.map((row) => {
      if (row.kind === 'text') return row.text
      if (row.kind === 'sigPair') return `${row.left} / ${row.right}`
      if (row.kind === 'seal') return row.label
      return `______________________________  ${row.label}`
    }),
  }))
  return {
    ...will,
    sections: [
      ...will.sections.filter((s) => !isExecutionBlockSection(s.heading)),
      ...exec,
    ],
  }
}

function getRenderSections(willIn: WillContent): ExecSection[] {
  const nonExec = willIn.sections
    .filter((s) => !isExecutionBlockSection(s.heading))
    .map((s) => ({
      heading: s.heading,
      rows: s.paragraphs.map<ExecRow>((text) => ({ kind: 'text', text })),
    }))
  return [...nonExec, ...buildExecutionBlock(willIn.testatorName)]
}

function cleanLegalText(text: string): string {
  return text.replace(/[—–]/g, '-').replace(/ {2,}/g, ' ')
}

/** Parse **bold** markers into runs. */
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

function fontFor(run: RichRun, regular: PDFFont, bold: PDFFont) {
  return run.bold ? bold : regular
}

/** Wrap rich runs into visual lines (array of run segments per line). */
function wrapRichLines(
  text: string,
  regular: PDFFont,
  bold: PDFFont,
  size: number,
  maxWidth: number,
): RichRun[][] {
  const paragraphs = text.split(/\n/)
  const allLines: RichRun[][] = []

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push([])
      continue
    }
    const runs = parseRich(para)
    // Flatten to words preserving bold
    type Word = { text: string; bold: boolean; spaceBefore: boolean }
    const words: Word[] = []
    for (const run of runs) {
      const parts = run.text.split(/(\s+)/)
      for (const part of parts) {
        if (!part) continue
        if (/^\s+$/.test(part)) continue
        const needsSpace =
          words.length > 0 && !words[words.length - 1].text.endsWith('\n')
        words.push({ text: part, bold: run.bold, spaceBefore: needsSpace })
      }
    }

    let line: RichRun[] = []
    let lineWidth = 0
    const spaceW = regular.widthOfTextAtSize(' ', size)

    const pushWord = (w: Word) => {
      const f = w.bold ? bold : regular
      const wWidth = f.widthOfTextAtSize(w.text, size)
      const addSpace = line.length > 0 ? spaceW : 0
      if (line.length > 0 && lineWidth + addSpace + wWidth > maxWidth) {
        allLines.push(line)
        line = [{ text: w.text, bold: w.bold }]
        lineWidth = wWidth
      } else {
        if (line.length > 0) {
          line.push({ text: ' ' + w.text, bold: w.bold })
          lineWidth += addSpace + wWidth
        } else {
          line.push({ text: w.text, bold: w.bold })
          lineWidth = wWidth
        }
      }
    }

    for (const w of words) pushWord(w)
    if (line.length) allLines.push(line)
  }

  return allLines
}

function measureRichBlock(
  text: string,
  regular: PDFFont,
  bold: PDFFont,
  size: number,
  lineHeight: number,
  maxWidth: number,
  extraGap: number,
): number {
  const lines = wrapRichLines(text, regular, bold, size, maxWidth)
  let h = extraGap
  for (const line of lines) {
    h += line.length === 0 ? lineHeight * 0.5 : lineHeight
  }
  return h
}

const SIG_BLOCK = 72 // top gap + line + label + after
const SIG_PAIR_BLOCK = 72
const SEAL_BLOCK = 56

function measureRow(
  row: ExecRow,
  regular: PDFFont,
  bold: PDFFont,
  bodySize: number,
  lineHeight: number,
  contentWidth: number,
): number {
  if (row.kind === 'text') {
    return measureRichBlock(row.text, regular, bold, bodySize, lineHeight, contentWidth, 10)
  }
  if (row.kind === 'sigPair') return SIG_PAIR_BLOCK
  if (row.kind === 'seal') return SEAL_BLOCK
  return SIG_BLOCK
}

function measureSection(
  section: ExecSection,
  regular: PDFFont,
  bold: PDFFont,
  headingSize: number,
  bodySize: number,
  lineHeight: number,
  contentWidth: number,
): number {
  let h = 14 + headingSize + 12
  for (const row of section.rows) {
    h += measureRow(row, regular, bold, bodySize, lineHeight, contentWidth)
  }
  return h
}

/** Height of heading + text rows until first signature (glued preamble). */
function measurePreamble(
  section: ExecSection,
  regular: PDFFont,
  bold: PDFFont,
  headingSize: number,
  bodySize: number,
  lineHeight: number,
  contentWidth: number,
): number {
  let h = 14 + headingSize + 12
  for (const row of section.rows) {
    if (row.kind !== 'text') break
    h += measureRow(row, regular, bold, bodySize, lineHeight, contentWidth)
  }
  return h
}

/**
 * Classic Texas will layout with:
 * - **bold** emphasis in body copy
 * - two-column witness / affidavit signature pairs
 * - measured (responsive) page breaks — blocks move only when they do not fit
 */
export async function renderWillToPdf(willIn: WillContent): Promise<Uint8Array> {
  const sections = getRenderSections(willIn)
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)

  const pageWidth = 612
  const pageHeight = 792
  const marginX = 72
  const marginY = 72
  const footerReserve = 28
  const bottomLimit = marginY + footerReserve
  const contentWidth = pageWidth - marginX * 2
  const usableHeight = pageHeight - marginY - bottomLimit
  const bodySize = 11.5
  const labelSize = 9
  const headingSize = 11.5
  const titleSize = 15
  const nameSize = 13
  const lineHeight = 16

  const colGap = 24
  const colWidth = (contentWidth - colGap) / 2
  // Theme ivory: --background / --ivory oklch(0.975 0.012 85) ≈ #F7F3EA
  const pageBg = rgb(247 / 255, 243 / 255, 234 / 255)
  const ink = rgb(0.14, 0.16, 0.2)

  const pages: PDFPage[] = []
  const startPage = () => {
    const p = pdf.addPage([pageWidth, pageHeight])
    p.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: pageBg })
    pages.push(p)
    return p
  }

  let page = startPage()
  let y = pageHeight - marginY

  const spaceLeft = () => y - bottomLimit

  const newPage = () => {
    page = startPage()
    y = pageHeight - marginY
  }

  /** Move to next page only when needed height will not fit here. */
  const need = (height: number) => {
    if (height <= 0) return
    if (spaceLeft() < height && height <= usableHeight) newPage()
  }

  const drawCentered = (text: string, f: PDFFont, size: number, gap = 8) => {
    need(size + gap)
    const width = f.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y: y - size,
      size,
      font: f,
      color: ink,
    })
    y -= size + gap
  }

  const lineWidthOf = (runs: RichRun[]) =>
    runs.reduce((w, r) => w + fontFor(r, font, fontBold).widthOfTextAtSize(r.text, bodySize), 0)

  const drawRichLine = (runs: RichRun[], justify: boolean, allowBreak = true) => {
    if (allowBreak) need(lineHeight)
    const natural = lineWidthOf(runs)
    const words = runs.map((r) => ({ ...r, text: r.text }))

    if (!justify || natural >= contentWidth * 0.98 || natural < contentWidth * 0.75) {
      let x = marginX
      for (const r of words) {
        const f = fontFor(r, font, fontBold)
        page.drawText(r.text, { x, y: y - bodySize, size: bodySize, font: f, color: ink })
        x += f.widthOfTextAtSize(r.text, bodySize)
      }
      y -= lineHeight
      return
    }

    type Tok = { text: string; bold: boolean; isSpace: boolean }
    const toks: Tok[] = []
    for (const r of words) {
      const m = r.text.match(/^(\s*)([\s\S]*)$/)
      if (m && m[1]) toks.push({ text: m[1], bold: false, isSpace: true })
      if (m && m[2]) toks.push({ text: m[2], bold: r.bold, isSpace: false })
    }
    const gaps = toks.filter((t) => t.isSpace)
    const contentW = toks
      .filter((t) => !t.isSpace)
      .reduce((w, t) => w + fontFor(t, font, fontBold).widthOfTextAtSize(t.text, bodySize), 0)
    const extra = Math.max(0, contentWidth - contentW)
    const bump = gaps.length > 0 ? extra / gaps.length : 0

    let x = marginX
    for (const t of toks) {
      if (t.isSpace) {
        x += bump
        continue
      }
      const f = fontFor(t, font, fontBold)
      page.drawText(t.text, { x, y: y - bodySize, size: bodySize, font: f, color: ink })
      x += f.widthOfTextAtSize(t.text, bodySize)
    }
    y -= lineHeight
  }

  const drawRichParagraph = (text: string, extraGap = 10, allowBreak = true) => {
    const lines = wrapRichLines(text, font, fontBold, bodySize, contentWidth)
    const solid = lines.filter((l) => l.length > 0)
    if (allowBreak && solid.length > 1) need(Math.min(2, solid.length) * lineHeight)

    lines.forEach((line, idx) => {
      if (line.length === 0) {
        y -= lineHeight * 0.45
        return
      }
      const isLastSolid =
        idx === lines.length - 1 || lines.slice(idx + 1).every((l) => l.length === 0)
      drawRichLine(line, !isLastSolid, allowBreak)
    })
    y -= extraGap
  }

  const drawSigColumn = (label: string, x: number, width: number) => {
    const topGap = 30
    page.drawLine({
      start: { x, y: y - topGap },
      end: { x: x + width, y: y - topGap },
      thickness: 1,
      color: ink,
    })
    const labelW = fontItalic.widthOfTextAtSize(label, labelSize)
    page.drawText(label, {
      x: x + Math.max(0, (width - labelW) / 2),
      y: y - topGap - 6 - labelSize,
      size: labelSize,
      font: fontItalic,
      color: ink,
    })
  }

  /** Full-width signature on its own row (never shares a band with other content). */
  const drawSig = (label: string) => {
    // Page break handled by signature-cluster reservation in drawSection.
    const width = Math.min(320, contentWidth)
    const x = marginX + (contentWidth - width) / 2
    drawSigColumn(label, x, width)
    y -= SIG_BLOCK
  }

  const drawSigPair = (left: string, right: string) => {
    drawSigColumn(left, marginX, colWidth)
    drawSigColumn(right, marginX + colWidth + colGap, colWidth)
    y -= SIG_PAIR_BLOCK
  }

  /** Seal sits alone on the next line — left aligned, never beside a signature. */
  const drawSeal = (label: string) => {
    y -= 10
    page.drawText(label, {
      x: marginX,
      y: y - bodySize,
      size: bodySize,
      font: fontBold,
      color: ink,
    })
    y -= SEAL_BLOCK - 10
  }

  const drawSection = (section: ExecSection, isExec: boolean) => {
    const totalH = measureSection(
      section,
      font,
      fontBold,
      headingSize,
      bodySize,
      lineHeight,
      contentWidth,
    )
    const preambleH = measurePreamble(
      section,
      font,
      fontBold,
      headingSize,
      bodySize,
      lineHeight,
      contentWidth,
    )

    // Responsive: keep small execution sections (e.g. notary) whole when possible.
    // Otherwise reserve heading + opening text so titles are not orphaned.
    const reserve = isExec
      ? totalH <= usableHeight * 0.88
        ? totalH
        : Math.min(preambleH + SIG_BLOCK + SEAL_BLOCK, usableHeight * 0.9)
      : Math.min(
          Math.max(headingSize + lineHeight * 3 + 30, Math.min(totalH, usableHeight * 0.35)),
          usableHeight * 0.5,
        )

    need(reserve)

    y -= 12
    need(headingSize + 8)
    page.drawText(section.heading, {
      x: marginX,
      y: y - headingSize,
      size: headingSize,
      font: fontBold,
      color: ink,
    })
    y -= headingSize + 10

    let beforeSigs = true
    let i = 0
    const rows = section.rows
    while (i < rows.length) {
      const row = rows[i]
      if (row.kind === 'text') {
        drawRichParagraph(row.text, 10, !(isExec && beforeSigs))
        i += 1
        continue
      }

      // Keep signature / seal lines together — never orphan "Commission Expires" + seal.
      beforeSigs = false
      let end = i
      let clusterH = 0
      while (end < rows.length && rows[end].kind !== 'text') {
        clusterH += measureRow(rows[end], font, fontBold, bodySize, lineHeight, contentWidth)
        end += 1
      }
      need(Math.min(clusterH, usableHeight * 0.95))
      for (let j = i; j < end; j++) {
        const r = rows[j]
        if (r.kind === 'sigPair') drawSigPair(r.left, r.right)
        else if (r.kind === 'seal') drawSeal(r.label)
        else if (r.kind === 'sig') drawSig(r.label)
      }
      i = end
    }
  }

  const docTitle = (willIn.title || 'LAST WILL AND TESTAMENT').toUpperCase()
  const partyName = (willIn.testatorName || '').toUpperCase()
  drawCentered(docTitle, fontBold, titleSize, 10)
  drawCentered('of', fontItalic, 11, 10)
  drawCentered(partyName, fontBold, nameSize, 26)

  let hitExecution = false
  for (const section of sections) {
    const heading = section.heading
      .replace(/[—–−]/g, '.')
      .replace(/\.\s*\./g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toUpperCase()
    const normalized = { ...section, heading }
    const isExec = isExecutionBlockSection(heading)

    if (isExec && !hitExecution) {
      hitExecution = true
      // Start execution block on this page only if a meaningful chunk fits.
      const firstExecReserve = headingSize + lineHeight * 6 + SIG_BLOCK
      if (spaceLeft() < firstExecReserve) newPage()
      else y -= 18
    }

    drawSection(normalized, isExec)
  }

  pages.forEach((p, i) => {
    const label = `${i + 1}`
    const w = font.widthOfTextAtSize(label, 9)
    p.drawText(label, {
      x: (pageWidth - w) / 2,
      y: 40,
      size: 9,
      font,
      color: ink,
    })
  })

  return pdf.save()
}

export async function renderDocumentPdf(
  content: WillContent,
  kind: 'will' | 'rlt' = 'will',
): Promise<Uint8Array> {
  const title =
    kind === 'rlt'
      ? content.title || 'REVOCABLE LIVING TRUST'
      : content.title || 'LAST WILL AND TESTAMENT'
  return renderWillToPdf({ ...content, title })
}
