/**
 * Admin: propose SkeletonDoc JSON edits from a natural-language instruction.
 * Does not write the database — the admin UI Accepts and saves as a new version.
 */

import { requireAdmin } from '../_shared/require-admin.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_KINDS = new Set(['will', 'rlt', 'mpoa', 'dpoa', 'directive', 'hipaa'])
const BLOCK_KINDS = new Set([
  'section',
  'heading',
  'paragraph',
  'signature',
  'signature_pair',
  'spacer',
  'page_break',
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type SkeletonBlock = {
  id: string
  kind: string
  heading: string
  body: string
  label: string
  leftLabel: string
  rightLabel: string
  align: string
  blankLinesAfter: number
  pageBreakBefore: boolean
  headingBold: boolean
}

type SkeletonDoc = {
  title: string
  pageSize: 'A4'
  blocks: SkeletonBlock[]
}

function repairJson(raw: string): string {
  let s = raw
    .replace(/^\uFEFF/, '')
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
  // Truncated arrays/objects: close open brackets if parse still fails later
  return s
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fence ? fence[1].trim() : trimmed
  const start = raw.indexOf('{')
  if (start < 0) throw new Error('Model did not return JSON')
  let candidate = repairJson(raw.slice(start))
  const end = candidate.lastIndexOf('}')
  if (end > 0) candidate = candidate.slice(0, end + 1)

  try {
    return JSON.parse(candidate)
  } catch (first) {
    // Balance braces/brackets then retry
    let openCurly = 0
    let openSquare = 0
    for (const ch of candidate) {
      if (ch === '{') openCurly++
      if (ch === '}') openCurly--
      if (ch === '[') openSquare++
      if (ch === ']') openSquare--
    }
    let fixed = candidate
    while (openSquare > 0) {
      fixed += ']'
      openSquare--
    }
    while (openCurly > 0) {
      fixed += '}'
      openCurly--
    }
    fixed = repairJson(fixed)
    try {
      return JSON.parse(fixed)
    } catch {
      throw first instanceof Error
        ? first
        : new Error('Model returned invalid JSON')
    }
  }
}

function normalizeProposed(raw: unknown, fallback: SkeletonDoc): {
  proposedSkeleton: SkeletonDoc
  summary: string
  risks: string[]
} {
  const obj = raw as Record<string, unknown>
  const skeletonRaw = (obj.proposedSkeleton ?? obj.skeleton ?? obj) as Record<string, unknown>
  const title = String(skeletonRaw.title ?? fallback.title ?? 'Document').trim() || fallback.title
  const blocksIn = Array.isArray(skeletonRaw.blocks) ? skeletonRaw.blocks : fallback.blocks
  const blocks: SkeletonBlock[] = []
  for (const b of blocksIn) {
    const row = b as Record<string, unknown>
    const kind = String(row.kind ?? 'paragraph')
    if (!BLOCK_KINDS.has(kind)) continue
    blocks.push({
      id: String(row.id ?? crypto.randomUUID()),
      kind,
      heading: String(row.heading ?? ''),
      body: String(row.body ?? ''),
      label: String(row.label ?? 'Signature'),
      leftLabel: String(row.leftLabel ?? 'Signature of Witness 1'),
      rightLabel: String(row.rightLabel ?? 'Signature of Witness 2'),
      align: ['left', 'center', 'right'].includes(String(row.align))
        ? String(row.align)
        : 'left',
      blankLinesAfter: Math.max(0, Math.min(20, Number(row.blankLinesAfter) || 0)),
      pageBreakBefore: Boolean(row.pageBreakBefore),
      headingBold: row.headingBold === false ? false : true,
    })
  }
  if (blocks.length === 0) {
    throw new Error('Proposed skeleton has no valid blocks')
  }

  const summary = String(obj.summary ?? 'Proposed skeleton updates.').trim()
  const risks = Array.isArray(obj.risks)
    ? obj.risks.map((r) => String(r)).filter(Boolean).slice(0, 12)
    : []

  return {
    proposedSkeleton: { title, pageSize: 'A4', blocks },
    summary,
    risks,
  }
}

function collectTokens(doc: SkeletonDoc): Set<string> {
  const set = new Set<string>()
  const re = /\{\{([a-zA-Z0-9_]+)\}\}/g
  const scan = (text: string) => {
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) set.add(m[1])
  }
  scan(doc.title)
  for (const b of doc.blocks) {
    scan(b.heading)
    scan(b.body)
    scan(b.label)
    scan(b.leftLabel)
    scan(b.rightLabel)
  }
  return set
}

function tokenRisks(before: SkeletonDoc, after: SkeletonDoc): string[] {
  const a = collectTokens(before)
  const b = collectTokens(after)
  const missing: string[] = []
  for (const t of a) {
    if (!b.has(t)) missing.push(`Removed token {{${t}}}`)
  }
  return missing
}

async function callClaude(system: string, user: string): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  const model = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-4-20250514'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Claude error ${res.status}`)
  }
  const parts = Array.isArray(data?.content) ? data.content : []
  return parts
    .filter((p: { type?: string }) => p.type === 'text')
    .map((p: { text?: string }) => p.text ?? '')
    .join('\n')
}

async function callGemini(system: string, user: string): Promise<string> {
  const key = Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GOOGLE_AI_API_KEY is not set')
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemini error ${res.status}`)
  }
  const parts = data?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) throw new Error('Empty Gemini response')
  return parts.map((p: { text?: string }) => p.text ?? '').join('\n')
}

/** Lightweight local fallback when no AI keys — layout hints only. */
function localHeuristic(current: SkeletonDoc, instruction: string): {
  proposedSkeleton: SkeletonDoc
  summary: string
  risks: string[]
} {
  const raw = instruction.trim()
  const lower = raw.toLowerCase()
  const next: SkeletonDoc = {
    title: current.title,
    pageSize: 'A4',
    blocks: current.blocks.map((b) => ({ ...b })),
  }
  const risks: string[] = [
    'Used local heuristic (no AI API key). Review carefully before accepting.',
  ]
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[—–−]/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\-\s]/g, '')
      .trim()

  if (
    /no (new )?page|remove (all )?page break|skip page break|don't start on new page|do not start on new page/.test(
      lower,
    ) &&
    !/move |put |start |place |before /.test(lower)
  ) {
    for (const b of next.blocks) b.pageBreakBefore = false
    return {
      proposedSkeleton: next,
      summary: 'Cleared Start on new page / page breaks on all blocks.',
      risks,
    }
  }

  const move =
    raw.match(/move\s+(.+?)\s+to\s+(?:the\s+)?(?:next|new)\s+page/i) ||
    raw.match(/(?:put|start|place)\s+(.+?)\s+on\s+(?:a\s+)?(?:next|new)\s+page/i) ||
    raw.match(/page\s*break\s+before\s+(.+)/i) ||
    raw.match(/(.+?)\s+(?:should|must)\s+(?:start|begin)\s+on\s+(?:a\s+)?(?:next|new)\s+page/i)

  if (move?.[1]) {
    const target = norm(move[1])
    const hit = next.blocks.find((b) => {
      const h = norm(b.heading || '')
      return h && (h.includes(target) || target.includes(h))
    })
    if (hit) {
      hit.pageBreakBefore = true
      return {
        proposedSkeleton: next,
        summary: `Set Start on new page before “${hit.heading}”.`,
        risks,
      }
    }
    throw new Error(
      `Could not find a heading matching “${move[1].trim()}”. Check the exact ARTICLE title in the skeleton.`,
    )
  }

  if (/force page break|page break before signature|signature on (a )?new page/.test(lower)) {
    const sig = next.blocks.find((b) => b.kind === 'signature' || b.kind === 'signature_pair')
    if (sig) {
      sig.pageBreakBefore = true
      return {
        proposedSkeleton: next,
        summary: 'Set page break before the first signature block.',
        risks,
      }
    }
  }

  if (/tighten|shorter|less space|reduce blank/.test(lower)) {
    for (const b of next.blocks) {
      b.blankLinesAfter = Math.min(b.blankLinesAfter, 1)
    }
    return {
      proposedSkeleton: next,
      summary: 'Reduced blank lines after blocks (max 1).',
      risks,
    }
  }

  const unbold =
    /unbold|not bold|remove bold|make (?:this |the |all )?headings? (?:unbold|regular|normal|not bold)/i.test(
      raw,
    )
  const rebold = /make (?:this |the |all )?headings? bold/i.test(raw) && !unbold
  if (unbold || rebold) {
    let targets = next.blocks.filter((b) => b.kind === 'heading' || b.kind === 'section')
    for (const b of targets) {
      b.headingBold = !unbold
      b.heading = b.heading.replace(/\*\*/g, '')
    }
    return {
      proposedSkeleton: next,
      summary: unbold
        ? `Set ${targets.length} heading(s) to regular (unbold) weight.`
        : `Set ${targets.length} heading(s) to bold.`,
      risks,
    }
  }

  throw new Error(
    'No AI provider configured. Set AI_PROVIDER=claude|gemini and the matching API key, or use a layout hint like “move ARTICLE X to next page” / “make headings unbold”.',
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await requireAdmin(req)
    if ('error' in auth) {
      return json({ error: auth.error }, auth.status)
    }

    const body = await req.json()
    const orderId = String(body?.orderId ?? '').trim()
    const documentKind = String(body?.documentKind ?? '').trim()
    const partnerNumber = Number(body?.partnerNumber) === 2 ? 2 : 1
    const instruction = String(body?.instruction ?? '').trim()
    const currentSkeleton = body?.currentSkeleton as SkeletonDoc | undefined

    if (!orderId) return json({ error: 'orderId is required' }, 400)
    if (!ALLOWED_KINDS.has(documentKind)) {
      return json({ error: `Invalid documentKind: ${documentKind}` }, 400)
    }
    if (!instruction || instruction.length < 3) {
      return json({ error: 'instruction is required' }, 400)
    }
    if (!currentSkeleton?.blocks || !Array.isArray(currentSkeleton.blocks)) {
      return json({ error: 'currentSkeleton with blocks is required' }, 400)
    }

    const normalizedCurrent: SkeletonDoc = {
      title: String(currentSkeleton.title || 'Document'),
      pageSize: 'A4',
      blocks: currentSkeleton.blocks.map((b) => ({
        id: String(b.id),
        kind: String(b.kind),
        heading: String(b.heading ?? ''),
        body: String(b.body ?? ''),
        label: String(b.label ?? ''),
        leftLabel: String(b.leftLabel ?? ''),
        rightLabel: String(b.rightLabel ?? ''),
        align: String(b.align ?? 'left'),
        blankLinesAfter: Number(b.blankLinesAfter) || 0,
        pageBreakBefore: Boolean(b.pageBreakBefore),
        headingBold: b.headingBold === false ? false : true,
      })),
    }

    // Soft-load answers for context (field ids only + short values)
    const { data: answersRow } = await auth.sb
      .from('questionnaire_answers')
      .select('answers')
      .eq('order_id', orderId)
      .eq('partner_number', partnerNumber)
      .maybeSingle()

    const answers = (answersRow?.answers ?? {}) as Record<string, unknown>
    const answerPreview: Record<string, string> = {}
    for (const [k, v] of Object.entries(answers)) {
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      if (!s) continue
      answerPreview[k] = s.length > 120 ? `${s.slice(0, 117)}…` : s
    }

    const system = `You are a Texas estate-planning document layout assistant for My AI Will.
You edit SkeletonDoc JSON only. Rules:
- Preserve all {{field_id}} tokens unless the admin explicitly asks to remove one.
- Allowed block kinds: section, heading, paragraph, signature, signature_pair, spacer, page_break.
- pageSize must stay "A4".
- Texas jurisdiction only; do not invent statutes or change operative legal meaning unless asked.
- Prefer adjusting pageBreakBefore, blankLinesAfter, headingBold, headings, and paragraph wording over deleting signature/notary blocks.
- headingBold defaults to true; set false to render a heading in regular (not bold) weight.
- For small layout tweaks (page break / unbold), prefer changing only the affected fields — still return the full proposedSkeleton.
- Return ONLY valid JSON with shape:
{"proposedSkeleton":{"title":"...","pageSize":"A4","blocks":[...]},"summary":"...","risks":["..."]}`

    const user = `Document kind: ${documentKind}
Partner: ${partnerNumber}
Admin instruction:
${instruction}

Current SkeletonDoc:
${JSON.stringify(normalizedCurrent, null, 2)}

Answer field preview (truncated, for context only — do not hardcode values into the skeleton; keep {{tokens}}):
${JSON.stringify(answerPreview, null, 2)}`

    const provider = (Deno.env.get('AI_PROVIDER') || '').toLowerCase().trim()
    let text: string
    try {
      if (provider === 'claude' || provider === 'anthropic') {
        text = await callClaude(system, user)
      } else if (provider === 'gemini' || provider === 'google') {
        text = await callGemini(system, user)
      } else if (Deno.env.get('ANTHROPIC_API_KEY')) {
        text = await callClaude(system, user)
      } else if (Deno.env.get('GOOGLE_AI_API_KEY') || Deno.env.get('GEMINI_API_KEY')) {
        text = await callGemini(system, user)
      } else {
        const local = localHeuristic(normalizedCurrent, instruction)
        return json({
          ok: true,
          provider: 'local',
          ...local,
          risks: [...local.risks, ...tokenRisks(normalizedCurrent, local.proposedSkeleton)],
        })
      }
    } catch (err) {
      // Fall back to local heuristics for simple layout prompts
      try {
        const local = localHeuristic(normalizedCurrent, instruction)
        return json({
          ok: true,
          provider: 'local',
          ...local,
          risks: [
            ...local.risks,
            err instanceof Error ? `AI unavailable: ${err.message}` : 'AI unavailable',
            ...tokenRisks(normalizedCurrent, local.proposedSkeleton),
          ],
        })
      } catch (localErr) {
        return json(
          {
            error:
              localErr instanceof Error
                ? localErr.message
                : err instanceof Error
                  ? err.message
                  : 'AI reformat failed',
          },
          502,
        )
      }
    }

    let parsed: unknown
    try {
      parsed = extractJsonObject(text)
    } catch (parseErr) {
      try {
        const local = localHeuristic(normalizedCurrent, instruction)
        return json({
          ok: true,
          provider: 'local',
          ...local,
          risks: [
            ...local.risks,
            parseErr instanceof Error
              ? `AI JSON invalid, used local fix: ${parseErr.message}`
              : 'AI JSON invalid, used local fix',
            ...tokenRisks(normalizedCurrent, local.proposedSkeleton),
          ],
        })
      } catch {
        return json(
          {
            error:
              parseErr instanceof Error
                ? parseErr.message
                : 'Model returned invalid JSON. Try a simpler prompt like “make headings unbold”.',
          },
          502,
        )
      }
    }
    const normalized = normalizeProposed(parsed, normalizedCurrent)
    const risks = [
      ...normalized.risks,
      ...tokenRisks(normalizedCurrent, normalized.proposedSkeleton),
    ]

    return json({
      ok: true,
      provider: provider || 'auto',
      proposedSkeleton: normalized.proposedSkeleton,
      summary: normalized.summary,
      risks,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
