import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export interface WillContent {
  title: string
  testatorName: string
  sections: { heading: string; paragraphs: string[] }[]
}

type ExecRow =
  | { kind: 'text'; text: string }
  | { kind: 'sigUnder'; label: string }
  | { kind: 'sigRight'; label: string }

interface ExecSection {
  heading: string
  rows: ExecRow[]
}

/** Same legal wording as whisper — signature / witnesses / affidavit / notary. */
function buildExecutionBlock(testatorName: string): ExecSection[] {
  const name = testatorName || '[Testator]'
  return [
    {
      heading: 'SIGNATURE OF TESTATOR',
      rows: [
        {
          kind: 'text',
          text: `I, ${name}, the Testator, sign my name to this instrument, this ______ day of __________________, 20_____, and being first duly sworn, do declare to the undersigned authority that I sign and execute this instrument as my Last Will and that I sign it willingly, that I execute it as my free and voluntary act for the purposes therein expressed, and that I am eighteen years of age or older, of sound mind, and under no constraint or undue influence.`,
        },
        { kind: 'sigUnder', label: 'Signature of Testator' },
        { kind: 'sigUnder', label: 'Printed Name' },
      ],
    },
    {
      heading: 'WITNESSES',
      rows: [
        {
          kind: 'text',
          text: "We, the undersigned witnesses, each being competent to be a witness and sign our names to this instrument, being first duly sworn, do declare to the undersigned authority that the Testator signs and executes this instrument as the Testator's Last Will and that the Testator signs it willingly, and that each of us, in the presence and hearing of the Testator and in the presence of each other, hereby signs this Will as witness to the Testator's signing, and that to the best of our knowledge the Testator is eighteen years of age or older, of sound mind, and under no constraint or undue influence.",
        },
        {
          kind: 'text',
          text: 'IMPORTANT: Neither witness may be a beneficiary named in this Will. Both witnesses must be present at the same time when the Testator signs.',
        },
        { kind: 'sigRight', label: 'Signature of Witness 1' },
        { kind: 'sigRight', label: 'Printed Name' },
        { kind: 'sigRight', label: 'Address' },
        { kind: 'sigRight', label: 'Signature of Witness 2' },
        { kind: 'sigRight', label: 'Printed Name' },
        { kind: 'sigRight', label: 'Address' },
      ],
    },
    {
      heading: 'SELF-PROVING AFFIDAVIT',
      rows: [
        { kind: 'text', text: '(Texas Estates Code Section 251.104)' },
        {
          kind: 'text',
          text: `STATE OF TEXAS\nCOUNTY OF ____________________________\n\nBefore me, the undersigned authority, on this day personally appeared ${name}, the Testator, and [WITNESS 1 FULL NAME] and [WITNESS 2 FULL NAME], Witnesses, known to me to be the Testator and the witnesses whose names are signed to the foregoing instrument, and all being duly sworn, the Testator declared to me and to the witnesses that the foregoing instrument is the Testator's Last Will and Testament and that the Testator had willingly signed and executed it as the Testator's free and voluntary act for the purposes therein expressed. Each of the witnesses stated that the witness signed the Will as witness in the presence and hearing of the Testator and that to the best of the witness's knowledge, the Testator was eighteen years of age or older, of sound mind, and under no constraint or undue influence.`,
        },
        { kind: 'sigRight', label: 'Signature of Testator' },
        { kind: 'sigRight', label: 'Signature of Witness 1' },
        { kind: 'sigRight', label: 'Signature of Witness 2' },
      ],
    },
    {
      heading: 'NOTARY ACKNOWLEDGMENT',
      rows: [
        {
          kind: 'text',
          text: 'Subscribed and sworn to before me by the said __________________, Testator, and by the said __________________ and __________________, witnesses, this ______ day of __________________, 20_____.',
        },
        { kind: 'sigRight', label: 'Notary Public, State of Texas' },
        { kind: 'sigRight', label: 'My Commission Expires' },
        { kind: 'text', text: '[NOTARY SEAL]' },
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
    paragraphs: section.rows.map((row) =>
      row.kind === 'text' ? row.text : `______________________________  ${row.label}`,
    ),
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

function wrapWords(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split(/\n/)
  const out: string[] = []
  for (const para of paragraphs) {
    if (!para.trim()) {
      out.push('')
      continue
    }
    const words = para.split(/\s+/).filter(Boolean)
    let current = ''
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) current = trial
      else {
        if (current) out.push(current)
        current = word
      }
    }
    if (current) out.push(current)
  }
  return out
}

function estimateSectionHeight(
  section: ExecSection,
  font: PDFFont,
  sizes: { body: number; heading: number; label: number },
  contentWidth: number,
): number {
  let h = sizes.heading + 16
  for (const row of section.rows) {
    if (row.kind === 'text') {
      const lines = wrapWords(row.text, font, sizes.body, contentWidth)
      h += lines.length * (sizes.body + 4) + 10
    } else if (row.kind === 'sigUnder') {
      h += 42
    } else {
      h += sizes.label + 18
    }
  }
  return h
}

/**
 * Professional US Letter PDF:
 * - justified body text
 * - page break before execution block
 * - signature lines right-aligned
 * - keep-together for signature sections
 * - page numbers
 */
export async function renderWillToPdf(willIn: WillContent): Promise<Uint8Array> {
  const sections = getRenderSections(willIn)
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)

  const pageWidth = 612
  const pageHeight = 792
  const margin = 72
  const contentWidth = pageWidth - margin * 2
  const bodySize = 12
  const labelSize = 10
  const headingSize = 12
  const titleSize = 16
  const lineHeight = bodySize + 4

  const SIG_WIDTH_UNDER = 220
  const SIG_WIDTH_RIGHT = 200

  const pages: PDFPage[] = []
  let page = pdf.addPage([pageWidth, pageHeight])
  pages.push(page)
  let y = pageHeight - margin

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight])
    pages.push(page)
    y = pageHeight - margin
  }

  const ensureRoom = (needed: number) => {
    if (y - needed < margin + 28) newPage()
  }

  const drawCentered = (text: string, f: PDFFont, size: number, gap = 8) => {
    const width = f.widthOfTextAtSize(text, size)
    ensureRoom(size + gap)
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y: y - size,
      size,
      font: f,
      color: rgb(0, 0, 0),
    })
    y -= size + gap
  }

  const drawJustifiedLine = (line: string, isLast: boolean, size: number) => {
    ensureRoom(lineHeight)
    const words = line.split(/\s+/).filter(Boolean)
    if (words.length <= 1 || isLast) {
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font,
        color: rgb(0, 0, 0),
      })
      y -= lineHeight
      return
    }
    const textWidth = font.widthOfTextAtSize(line, size)
    const extra = contentWidth - textWidth
    const gaps = words.length - 1
    const bump = extra / gaps
    let x = margin
    for (let i = 0; i < words.length; i++) {
      page.drawText(words[i], {
        x,
        y: y - size,
        size,
        font,
        color: rgb(0, 0, 0),
      })
      if (i < gaps) {
        x += font.widthOfTextAtSize(words[i], size) + font.widthOfTextAtSize(' ', size) + bump
      }
    }
    y -= lineHeight
  }

  const drawWrappedJustified = (text: string, extraGap = 10) => {
    const lines = wrapWords(text, font, bodySize, contentWidth)
    lines.forEach((line, idx) => {
      if (line === '') {
        y -= lineHeight * 0.6
        return
      }
      drawJustifiedLine(line, idx === lines.length - 1, bodySize)
    })
    y -= extraGap
  }

  /** Signature line + label flush to the right margin. */
  const drawSigUnder = (label: string) => {
    const block = 8 + 2 + labelSize + 14
    ensureRoom(block)
    y -= 10
    const lineX = margin + contentWidth - SIG_WIDTH_UNDER
    page.drawLine({
      start: { x: lineX, y },
      end: { x: lineX + SIG_WIDTH_UNDER, y },
      thickness: 0.9,
      color: rgb(0, 0, 0),
    })
    y -= 4
    const labelW = font.widthOfTextAtSize(label, labelSize)
    page.drawText(label, {
      x: lineX + SIG_WIDTH_UNDER - labelW,
      y: y - labelSize,
      size: labelSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
    })
    y -= labelSize + 14
  }

  /** Line on the right; label immediately to the left of the line. */
  const drawSigRight = (label: string) => {
    const rowHeight = labelSize + 16
    ensureRoom(rowHeight)
    const baselineY = y - labelSize
    const lineX = margin + contentWidth - SIG_WIDTH_RIGHT
    const labelW = font.widthOfTextAtSize(label, labelSize)
    const labelX = Math.max(margin, lineX - 10 - labelW)
    page.drawText(label, {
      x: labelX,
      y: baselineY,
      size: labelSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
    })
    page.drawLine({
      start: { x: lineX, y: baselineY - 1 },
      end: { x: lineX + SIG_WIDTH_RIGHT, y: baselineY - 1 },
      thickness: 0.9,
      color: rgb(0, 0, 0),
    })
    y -= rowHeight
  }

  const drawSection = (section: ExecSection, forceKeepTogether: boolean) => {
    if (forceKeepTogether) {
      const needed = estimateSectionHeight(
        section,
        font,
        { body: bodySize, heading: headingSize, label: labelSize },
        contentWidth,
      )
      ensureRoom(Math.min(needed, pageHeight - margin * 2 - 40))
    }

    y -= 4
    ensureRoom(headingSize + 20)
    page.drawText(section.heading, {
      x: margin,
      y: y - headingSize,
      size: headingSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
    y -= headingSize + 10

    for (const row of section.rows) {
      if (row.kind === 'text') drawWrappedJustified(row.text, 10)
      else if (row.kind === 'sigUnder') drawSigUnder(row.label)
      else drawSigRight(row.label)
    }
  }

  // Title — avoid redundant "of Name" duplication under a long title; keep classic form
  drawCentered(willIn.title, fontBold, titleSize, 6)
  drawCentered(willIn.testatorName, fontItalic, 13, 16)

  // Thin rule under title
  ensureRoom(12)
  page.drawLine({
    start: { x: margin + 40, y },
    end: { x: pageWidth - margin - 40, y },
    thickness: 0.6,
    color: rgb(0, 0, 0),
  })
  y -= 18

  let hitExecution = false
  for (const section of sections) {
    const isExec = isExecutionBlockSection(section.heading)
    if (isExec && !hitExecution) {
      hitExecution = true
      newPage() // execution / signature pages start clean
    }
    drawSection(section, isExec)
  }

  // Page numbers
  const total = pages.length
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${total}`
    const w = font.widthOfTextAtSize(label, 9)
    p.drawText(label, {
      x: (pageWidth - w) / 2,
      y: 36,
      size: 9,
      font,
      color: rgb(0.35, 0.35, 0.35),
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
