import { SECTIONS, type Field, type Section } from '@/lib/questionnaire'
import {
  resolveSkeletonToken,
  type SkeletonFillOptions,
} from '@/lib/skeleton-clauses'

export type TextAlign = 'left' | 'center' | 'right'

export type SkeletonBlockKind =
  | 'section'
  | 'heading'
  | 'paragraph'
  | 'signature'
  | 'signature_pair'
  | 'spacer'
  | 'page_break'

export type SkeletonBlock = {
  id: string
  kind: SkeletonBlockKind
  /** Section / heading title */
  heading: string
  /** Paragraph / section body (may include {{field_id}} tokens) */
  body: string
  /** Single signature label */
  label: string
  leftLabel: string
  rightLabel: string
  align: TextAlign
  /** Extra blank lines after this block (0–20) */
  blankLinesAfter: number
  /** Force a new A4 page before this block */
  pageBreakBefore: boolean
}

export type SkeletonDoc = {
  title: string
  pageSize: 'A4'
  blocks: SkeletonBlock[]
}

const MARKER_V1 = '<!-- texas-will-skeleton-v1 -->'
const MARKER_V2 = '<!-- texas-will-skeleton-v2 -->'
const BLOCK_SEP = '\n\n=====BLOCK=====\n'

export const BLOCK_KIND_OPTIONS: { value: SkeletonBlockKind; label: string }[] = [
  { value: 'section', label: 'Section (heading + text)' },
  { value: 'heading', label: 'Heading only' },
  { value: 'paragraph', label: 'Paragraph text' },
  { value: 'signature', label: 'Signature line' },
  { value: 'signature_pair', label: 'Two signatures (side by side)' },
  { value: 'spacer', label: 'Blank lines' },
  { value: 'page_break', label: 'Page break' },
]

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `blk_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeBlock(partial: Partial<SkeletonBlock> & { id?: string }): SkeletonBlock {
  const kind = partial.kind ?? 'section'
  return {
    id: partial.id ?? uid(),
    kind,
    heading: partial.heading ?? (kind === 'section' || kind === 'heading' ? 'Untitled' : ''),
    body: partial.body ?? '',
    label: partial.label ?? 'Signature',
    leftLabel: partial.leftLabel ?? 'Signature of Witness 1',
    rightLabel: partial.rightLabel ?? 'Signature of Witness 2',
    align: partial.align ?? 'left',
    blankLinesAfter: Math.max(0, Math.min(20, partial.blankLinesAfter ?? 0)),
    pageBreakBefore: Boolean(partial.pageBreakBefore),
  }
}

/** Insert a questionnaire answer token into template text. */
export function fieldToken(fieldId: string): string {
  return `{{${fieldId}}}`
}

export function listQuestionnaireFields(sections: readonly Section[] = SECTIONS): {
  sectionTitle: string
  fields: { id: string; label: string; type: Field['type'] }[]
}[] {
  return sections
    .filter((s) => !s.isReview)
    .map((s) => ({
      sectionTitle: s.title,
      fields: s.fields.map((f) => ({ id: f.id, label: f.label, type: f.type })),
    }))
    .filter((g) => g.fields.length > 0)
}

/** Persist as v2 JSON (layout-aware). Still human-readable with marker prefix. */
export function serializeSkeletonDoc(doc: SkeletonDoc): string {
  const payload = {
    version: 2,
    title: doc.title.trim() || 'LAST WILL AND TESTAMENT',
    pageSize: 'A4' as const,
    blocks: doc.blocks.map((b) => ({
      id: b.id,
      kind: b.kind,
      heading: b.heading,
      body: b.body,
      label: b.label,
      leftLabel: b.leftLabel,
      rightLabel: b.rightLabel,
      align: b.align,
      blankLinesAfter: b.blankLinesAfter,
      pageBreakBefore: b.pageBreakBefore,
    })),
  }
  return `${MARKER_V2}\n${JSON.stringify(payload, null, 2)}\n`
}

/**
 * Parse stored body into layout blocks.
 * Supports v2 JSON, v1 marked text, and classic ARTICLE-split plain text.
 */
export function parseSkeletonBody(raw: string): SkeletonDoc {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) {
    return { title: 'LAST WILL AND TESTAMENT', pageSize: 'A4', blocks: [emptyBlock('Preamble')] }
  }

  if (text.includes(MARKER_V2)) {
    const jsonStart = text.indexOf('{')
    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(text.slice(jsonStart)) as {
          title?: string
          blocks?: Partial<SkeletonBlock>[]
        }
        if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
          return {
            title: parsed.title?.trim() || 'LAST WILL AND TESTAMENT',
            pageSize: 'A4',
            blocks: parsed.blocks.map((b) => normalizeBlock(b)),
          }
        }
      } catch {
        // fall through
      }
    }
  }

  if (text.includes(MARKER_V1)) {
    return upgradeV1(parseMarkedSkeletonV1(text))
  }

  return upgradeV1(parseClassicSkeleton(text))
}

function upgradeV1(doc: { title: string; blocks: { id: string; heading: string; body: string }[] }): SkeletonDoc {
  return {
    title: doc.title,
    pageSize: 'A4',
    blocks: doc.blocks.map((b) =>
      normalizeBlock({
        id: b.id,
        kind: 'section',
        heading: b.heading,
        body: b.body,
        align: 'left',
        blankLinesAfter: 1,
      }),
    ),
  }
}

function parseMarkedSkeletonV1(text: string): { title: string; blocks: { id: string; heading: string; body: string }[] } {
  const withoutMarker = text.replace(MARKER_V1, '').trim()
  const titleMatch = withoutMarker.match(/^TITLE:\s*(.+)$/m)
  const title = titleMatch?.[1]?.trim() || 'LAST WILL AND TESTAMENT'
  let rest = withoutMarker
  if (titleMatch) {
    rest = withoutMarker.slice(withoutMarker.indexOf(titleMatch[0]) + titleMatch[0].length).trim()
  }

  if (rest.includes('=====BLOCK=====')) {
    const chunks = rest
      .split(BLOCK_SEP)
      .map((c) => c.trim())
      .filter(Boolean)
    return {
      title,
      blocks: chunks.map((chunk) => {
        const nl = chunk.indexOf('\n')
        if (nl === -1) return { id: uid(), heading: chunk, body: '' }
        return { id: uid(), heading: chunk.slice(0, nl).trim(), body: chunk.slice(nl + 1).trim() }
      }),
    }
  }

  return parseClassicSkeleton(`${title}\n\n${rest}`)
}

export function parseClassicSkeleton(text: string): {
  title: string
  blocks: { id: string; heading: string; body: string }[]
} {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  const lines = normalized.split('\n')

  let title = 'LAST WILL AND TESTAMENT'
  let startIdx = 0
  if (/^LAST WILL AND TESTAMENT/i.test(lines[0]?.trim() ?? '')) {
    title = 'LAST WILL AND TESTAMENT'
    let i = 0
    while (i < lines.length) {
      const t = lines[i].trim()
      if (/^ARTICLE\s+[IVXLC]+\b/i.test(t)) break
      if (i > 0 && t.length > 40 && !/^OF$/i.test(t) && !/^\[/.test(t)) {
        startIdx = i
        break
      }
      if (i > 6) {
        startIdx = i
        break
      }
      i++
    }
    if (startIdx === 0) startIdx = Math.min(6, lines.length)
  }

  const bodyText = lines.slice(startIdx).join('\n').trim()
  const splitRe =
    /(?=^ARTICLE\s+[IVXLC]+\b)|(?=^SIGNATURE OF TESTATOR\b)|(?=^WITNESSES\b)|(?=^SELF-PROVING AFFIDAVIT\b)|(?=^NOTARY ACKNOWLEDGMENT\b)|(?=^AI GENERATION INSTRUCTIONS\b)/gim

  const chunks = bodyText
    .split(splitRe)
    .map((c) => c.trim())
    .filter(Boolean)
  if (chunks.length === 0) {
    return { title, blocks: [{ id: uid(), heading: 'Document', body: normalized }] }
  }

  const blocks = chunks.map((chunk, idx) => {
    const chunkLines = chunk.split('\n')
    const first = chunkLines[0]?.trim() ?? ''

    if (/^ARTICLE\s+[IVXLC]+\b/i.test(first)) {
      let heading = first
      let bodyStart = 1
      for (let j = 1; j < Math.min(chunkLines.length, 6); j++) {
        const t = chunkLines[j].trim()
        if (!t) continue
        if (/^\d+\.\d+/.test(t) || t.length > 80) break
        heading = `${first} — ${t}`
        bodyStart = j + 1
        break
      }
      return {
        id: uid(),
        heading,
        body: chunkLines.slice(bodyStart).join('\n').replace(/^\n+/, '').trimEnd(),
      }
    }

    if (
      /^(SIGNATURE OF TESTATOR|WITNESSES|SELF-PROVING AFFIDAVIT|NOTARY ACKNOWLEDGMENT|AI GENERATION INSTRUCTIONS)/i.test(
        first,
      )
    ) {
      return {
        id: uid(),
        heading: first,
        body: chunkLines.slice(1).join('\n').replace(/^\n+/, '').trimEnd(),
      }
    }

    return {
      id: uid(),
      heading: idx === 0 ? 'Preamble' : `Section ${idx + 1}`,
      body: chunk.trimEnd(),
    }
  })

  return { title, blocks }
}

export function emptyBlock(heading = 'New section'): SkeletonBlock {
  return normalizeBlock({
    kind: 'section',
    heading,
    body: '',
    align: 'left',
    blankLinesAfter: 1,
  })
}

export function newLayoutBlock(kind: SkeletonBlockKind): SkeletonBlock {
  switch (kind) {
    case 'heading':
      return normalizeBlock({ kind, heading: 'ARTICLE', align: 'center', blankLinesAfter: 1 })
    case 'paragraph':
      return normalizeBlock({ kind, body: '', align: 'left', blankLinesAfter: 1 })
    case 'signature':
      return normalizeBlock({
        kind,
        label: 'Signature of Testator',
        align: 'center',
        blankLinesAfter: 2,
      })
    case 'signature_pair':
      return normalizeBlock({
        kind,
        leftLabel: 'Signature of Witness 1',
        rightLabel: 'Signature of Witness 2',
        align: 'left',
        blankLinesAfter: 2,
      })
    case 'spacer':
      return normalizeBlock({ kind, blankLinesAfter: 3, align: 'left' })
    case 'page_break':
      return normalizeBlock({ kind, pageBreakBefore: true, blankLinesAfter: 0 })
    case 'section':
    default:
      return emptyBlock('New section')
  }
}

export function moveBlock(blocks: SkeletonBlock[], index: number, dir: -1 | 1): SkeletonBlock[] {
  const next = index + dir
  if (next < 0 || next >= blocks.length) return blocks
  const copy = [...blocks]
  const tmp = copy[index]
  copy[index] = copy[next]
  copy[next] = tmp
  return copy
}

/** Insert token at caret position in a textarea value. */
export function insertAtCursor(
  value: string,
  token: string,
  start: number,
  end: number,
): { value: string; cursor: number } {
  const before = value.slice(0, start)
  const after = value.slice(end)
  const needsSpaceBefore = before.length > 0 && !/\s$/.test(before)
  const needsSpaceAfter = after.length > 0 && !/^\s/.test(after)
  const piece = `${needsSpaceBefore ? ' ' : ''}${token}${needsSpaceAfter ? ' ' : ''}`
  const next = before + piece + after
  return { value: next, cursor: before.length + piece.length }
}

export function skeletonCharCount(doc: SkeletonDoc): number {
  return serializeSkeletonDoc(doc).length
}

export type { SkeletonFillOptions }

/**
 * Replace {{field_id}} / {{clause_*}} tokens using questionnaire answers.
 * Computed clauses may include **bold** markers; wrap plain fields as **{{id}}** in the skeleton.
 */
export function fillSkeletonTokens(
  text: string,
  answers: Record<string, unknown> = {},
  options: SkeletonFillOptions = {},
): string {
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (full, id: string) => {
    const resolved = resolveSkeletonToken(id, answers, options)
    if (resolved == null || resolved === '') {
      if (id.toLowerCase().startsWith('clause_')) return ''
      return full
    }
    return resolved
  })
}
