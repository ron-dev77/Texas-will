import { supabase } from '@/integrations/supabase/client'
import type { SkeletonDoc } from '@/lib/skeleton-doc'
import type { DocumentKind } from '@/lib/document-kinds'

export type AiSkeletonReformatResult = {
  ok: true
  provider: string
  proposedSkeleton: SkeletonDoc
  summary: string
  risks: string[]
}

function normalizeHeadingKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[—–−]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim()
}

/** Fast local layout edits (no edge function). Returns null if instruction needs AI. */
export function tryLocalSkeletonReformat(
  instruction: string,
  current: SkeletonDoc,
): AiSkeletonReformatResult | null {
  const raw = instruction.trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  const next: SkeletonDoc = {
    title: current.title,
    pageSize: 'A4',
    blocks: current.blocks.map((b) => ({ ...b })),
  }
  const risks = ['Applied locally (no AI call). Review the PDF before saving.']

  // Clear all page breaks
  if (
    /no (new )?page|remove (all )?page break|skip page break|don't start on new page|do not start on new page/.test(
      lower,
    ) &&
    !/move |put |start |place |before /.test(lower)
  ) {
    for (const b of next.blocks) b.pageBreakBefore = false
    return {
      ok: true,
      provider: 'local',
      proposedSkeleton: next,
      summary: 'Cleared Start on new page / page breaks on all blocks.',
      risks,
    }
  }

  // Move / put / start <section> on next/new page
  const move =
    raw.match(/move\s+(.+?)\s+to\s+(?:the\s+)?(?:next|new)\s+page/i) ||
    raw.match(/(?:put|start|place)\s+(.+?)\s+on\s+(?:a\s+)?(?:next|new)\s+page/i) ||
    raw.match(/page\s*break\s+before\s+(.+)/i) ||
    raw.match(/(.+?)\s+(?:should|must)\s+(?:start|begin)\s+on\s+(?:a\s+)?(?:next|new)\s+page/i)

  if (move?.[1]) {
    const target = normalizeHeadingKey(move[1])
    const hit = next.blocks.find((b) => {
      const h = normalizeHeadingKey(b.heading || '')
      const bodyStart = normalizeHeadingKey((b.body || '').slice(0, 80))
      return (h && (h.includes(target) || target.includes(h))) || bodyStart.includes(target)
    })
    if (hit) {
      hit.pageBreakBefore = true
      return {
        ok: true,
        provider: 'local',
        proposedSkeleton: next,
        summary: `Set Start on new page before “${hit.heading || hit.kind}”.`,
        risks,
      }
    }
    // Fall through to AI if section not found locally
    return null
  }

  if (/force page break|page break before signature|signature on (a )?new page/.test(lower)) {
    const sig = next.blocks.find((b) => b.kind === 'signature' || b.kind === 'signature_pair')
    if (sig) {
      sig.pageBreakBefore = true
      return {
        ok: true,
        provider: 'local',
        proposedSkeleton: next,
        summary: 'Set page break before the first signature block.',
        risks,
      }
    }
  }

  if (/tighten|shorter|less space|reduce blank/.test(lower)) {
    for (const b of next.blocks) b.blankLinesAfter = Math.min(b.blankLinesAfter, 1)
    return {
      ok: true,
      provider: 'local',
      proposedSkeleton: next,
      summary: 'Reduced blank lines after blocks (max 1).',
      risks,
    }
  }

  // Unbold / bold headings (PDF headings default to bold)
  const unbold =
    /unbold|not bold|remove bold|make (?:this |the |all )?headings? (?:unbold|regular|normal|not bold)/i.test(
      raw,
    )
  const rebold = /make (?:this |the |all )?headings? bold/i.test(raw) && !unbold

  if (unbold || rebold) {
    const named =
      raw.match(/(?:unbold|bold)\s+(.+?)(?:\s+heading)?$/i)?.[1] ||
      raw.match(/make\s+(.+?)\s+(?:heading\s+)?(?:unbold|regular|normal|not bold|bold)/i)?.[1]
    const skipWords = /^(this|the|all|heading|headings)$/i
    let targets = next.blocks.filter((b) => b.kind === 'heading' || b.kind === 'section')
    if (named && !skipWords.test(named.trim())) {
      const target = normalizeHeadingKey(named)
      const matched = targets.filter((b) => {
        const h = normalizeHeadingKey(b.heading || '')
        return h && (h.includes(target) || target.includes(h))
      })
      if (matched.length) targets = matched
    }
    for (const b of targets) {
      b.headingBold = !unbold
      b.heading = b.heading.replace(/\*\*/g, '')
    }
    return {
      ok: true,
      provider: 'local',
      proposedSkeleton: next,
      summary: unbold
        ? `Set ${targets.length} heading(s) to regular (unbold) weight.`
        : `Set ${targets.length} heading(s) to bold.`,
      risks,
    }
  }

  return null
}

async function invokeErrorMessage(error: {
  message?: string
  context?: Response
}): Promise<string> {
  const base = error.message || 'AI reformat failed'
  try {
    const ctx = error.context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json()
      if (body?.error) return String(body.error)
      if (body?.message) return String(body.message)
    }
    if (ctx?.status) {
      if (ctx.status === 404) {
        return 'Edge function ai-skeleton-reformat is not deployed (404). Deploy it, or use a simple layout prompt like “move ARTICLE X to next page”.'
      }
      return `${base} (HTTP ${ctx.status})`
    }
  } catch {
    /* ignore */
  }
  return base
}

export async function proposeSkeletonReformat(params: {
  orderId: string
  documentKind: DocumentKind
  partnerNumber: 1 | 2
  instruction: string
  currentSkeleton: SkeletonDoc
}): Promise<AiSkeletonReformatResult> {
  // Instant local handling for page-break / spacing prompts (avoids edge 404/202).
  const local = tryLocalSkeletonReformat(params.instruction, params.currentSkeleton)
  if (local) return local

  const { data, error } = await supabase.functions.invoke('ai-skeleton-reformat', {
    body: {
      orderId: params.orderId,
      documentKind: params.documentKind,
      partnerNumber: params.partnerNumber,
      instruction: params.instruction,
      currentSkeleton: params.currentSkeleton,
    },
  })

  if (error) {
    // If edge is down, still try local again (in case pattern was missed)
    const fallback = tryLocalSkeletonReformat(params.instruction, params.currentSkeleton)
    if (fallback) return fallback
    throw new Error(await invokeErrorMessage(error))
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error: string }).error) {
    throw new Error(String((data as { error: string }).error))
  }

  const res = data as AiSkeletonReformatResult
  if (!res?.proposedSkeleton?.blocks) {
    throw new Error('AI returned an invalid skeleton proposal')
  }
  return res
}
