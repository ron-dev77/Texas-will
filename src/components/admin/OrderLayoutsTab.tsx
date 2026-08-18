import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, PackagePlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PreviewLoadingEffect } from '@/components/ui/loading-block'
import { cn, pdfEmbedSrc } from '@/lib/utils'
import { VisualSkeletonWorkspace } from '@/components/admin/VisualSkeletonWorkspace'
import { buildDocumentFromAnswers } from '@/lib/will-content'
import {
  parseSkeletonBody,
  serializeSkeletonDoc,
  type SkeletonDoc,
} from '@/lib/skeleton-doc'
import {
  DOCUMENT_KIND_LABEL,
  type DocumentKind,
} from '@/lib/document-kinds'
import {
  listWillVersions,
  updateOrderStatus,
  upsertWillDocument,
  type AnswersRow,
  type OrderDetail,
  type WillVersionRow,
} from '@/lib/admin-order'
import { orderedDocumentKindsForDelivery } from '@/lib/admin-deliver'
import {
  renderOrderDocumentPdf,
  sha256Hex,
  type SkeletonMeta,
} from '@/lib/admin-document-preview'
import { proposeSkeletonReformat } from '@/lib/ai-skeleton-reformat'
import {
  readDocumentBucket,
  saveDocumentBucket,
  upsertBucketItem,
  type DocumentBucket,
} from '@/lib/admin-document-bucket'
import type { Section } from '@/lib/questionnaire'

type Props = {
  orderId: string
  data: OrderDetail
  partner: 1 | 2
  onPartnerChange: (p: 1 | 2) => void
  skeletonByKind: Partial<Record<DocumentKind, SkeletonDoc>>
  skeletonMetaByKind: Partial<Record<DocumentKind, SkeletonMeta>>
  setSkeletonByKind: React.Dispatch<
    React.SetStateAction<Partial<Record<DocumentKind, SkeletonDoc>>>
  >
  layoutSchema: Section[]
  onReload: () => Promise<void>
}

export function OrderLayoutsTab({
  orderId,
  data,
  partner,
  onPartnerChange,
  skeletonByKind,
  skeletonMetaByKind,
  setSkeletonByKind,
  layoutSchema,
  onReload,
}: Props) {
  const includeTrust = Boolean(data.order.add_ons?.trust)
  const isCouples = data.order.plan_type === 'couples'
  const packageKinds = useMemo(
    () =>
      orderedDocumentKindsForDelivery({
        documents: (data.order.add_ons as { documents?: unknown } | null)?.documents,
        includeTrust,
      }),
    [data.order.add_ons, includeTrust],
  )

  const [docKind, setDocKind] = useState<DocumentKind>(packageKinds[0] ?? 'will')
  const [prompt, setPrompt] = useState('')
  const [notes, setNotes] = useState('')
  const [lastAi, setLastAi] = useState<{
    before: SkeletonDoc
    summary: string
    instruction: string
    provider: string
  } | null>(null)
  const [versions, setVersions] = useState<WillVersionRow[]>([])
  const [previewSource, setPreviewSource] = useState<'working' | string>('working')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfHash, setPdfHash] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [bucketLocal, setBucketLocal] = useState<DocumentBucket | null>(null)

  const answersRow = data.answers.find((a) => a.partner_number === partner) as
    | AnswersRow
    | undefined
  const liveDoc = data.wills.find(
    (w) => w.partner_number === partner && w.document_kind === docKind,
  )
  const workingSkeleton = skeletonByKind[docKind] ?? null
  const bucket = bucketLocal ?? readDocumentBucket(data.order.add_ons as Record<string, unknown> | null)

  useEffect(() => {
    setBucketLocal(null)
  }, [data.order.add_ons])

  function isInBucket(kind: DocumentKind) {
    return bucket.items.some((i) => i.kind === kind && i.partnerNumber === partner)
  }

  useEffect(() => {
    if (!packageKinds.includes(docKind)) setDocKind(packageKinds[0] ?? 'will')
  }, [packageKinds, docKind])

  useEffect(() => {
    setLastAi(null)
    setPreviewSource('working')
    void listWillVersions({ orderId, partnerNumber: partner, kind: docKind })
      .then(setVersions)
      .catch(() => setVersions([]))
  }, [orderId, partner, docKind, data.wills])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const selectedVersion =
    previewSource === 'working'
      ? null
      : versions.find((v) => v.id === previewSource) ?? null

  useEffect(() => {
    if (!answersRow) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfHash(null)
      return
    }

    const useWorking = previewSource === 'working' || !selectedVersion
    if (useWorking && !workingSkeleton) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfHash(null)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    void renderOrderDocumentPdf({
      kind: docKind,
      answers: answersRow.answers,
      skeleton: useWorking ? workingSkeleton : null,
      includeTrust,
      fallbackContent: useWorking ? null : selectedVersion!.will_content,
    })
      .then(async (bytes) => {
        if (cancelled) return
        const copy = new Uint8Array(bytes)
        const hash = await sha256Hex(copy)
        const url = URL.createObjectURL(new Blob([copy], { type: 'application/pdf' }))
        setPdfHash(hash)
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      })
      .catch((err) => {
        if (!cancelled) setMsg(err instanceof Error ? err.message : 'Preview failed')
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    answersRow,
    workingSkeleton,
    docKind,
    includeTrust,
    previewSource,
    selectedVersion,
  ])

  async function runPrompt() {
    if (!workingSkeleton || !prompt.trim()) return
    setBusy('prompt')
    setMsg(null)
    const instruction = prompt.trim()
    const before = parseSkeletonBody(serializeSkeletonDoc(workingSkeleton))
    try {
      const res = await proposeSkeletonReformat({
        orderId,
        documentKind: docKind,
        partnerNumber: partner,
        instruction,
        currentSkeleton: workingSkeleton,
      })
      const next = parseSkeletonBody(serializeSkeletonDoc(res.proposedSkeleton))
      setLastAi({
        before,
        summary: res.summary,
        instruction,
        provider: res.provider,
      })
      setSkeletonByKind((prev) => ({ ...prev, [docKind]: next }))
      setNotes((n) => {
        const tag = `AI (${res.provider}): ${instruction}`
        return n.trim() ? `${n.trim()}\n${tag}` : tag
      })
      setPrompt('')
      setMsg(`${res.summary} Text boxes and preview updated — edit anytime or run AI again.`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Prompt failed')
    } finally {
      setBusy(null)
    }
  }

  function undoLastAi() {
    if (!lastAi) return
    setSkeletonByKind((prev) => ({ ...prev, [docKind]: lastAi.before }))
    setMsg('Undid last AI change. Text boxes and preview restored.')
    setLastAi(null)
  }

  async function saveLiveVersion() {
    if (!answersRow || !skeletonByKind[docKind]) {
      setMsg('Need answers and a skeleton to save.')
      return
    }
    setBusy('save')
    setMsg(null)
    try {
      const draft = buildDocumentFromAnswers(docKind, answersRow.answers, { includeTrust })
      const saved = await upsertWillDocument({
        orderId,
        partnerNumber: partner,
        kind: docKind,
        content: draft,
        attorneyNotes: notes,
        skeletonBody: serializeSkeletonDoc(skeletonByKind[docKind]!),
      })
      await updateOrderStatus({
        orderId,
        status: 'ready_for_review',
        note: `Live ${DOCUMENT_KIND_LABEL[docKind]} v${saved.version}`,
      })
      await onReload()
      setMsg(`${DOCUMENT_KIND_LABEL[docKind]} saved as live v${saved.version}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  async function makeVersionLive(v: WillVersionRow) {
    if (!answersRow) return
    setBusy(`live-${v.id}`)
    setMsg(null)
    try {
      const skel = skeletonByKind[docKind]
      const saved = await upsertWillDocument({
        orderId,
        partnerNumber: partner,
        kind: docKind,
        content: v.will_content,
        attorneyNotes: `Restored live from v${v.version}${notes.trim() ? `: ${notes.trim()}` : ''}`,
        skeletonBody: skel ? serializeSkeletonDoc(skel) : undefined,
      })
      await onReload()
      setMsg(`v${v.version} restored as live v${saved.version}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not make live')
    } finally {
      setBusy(null)
    }
  }

  async function movePreviewToBucket() {
    if (!answersRow) {
      setMsg('Need answers before moving to bucket.')
      return
    }
    setBusy('bucket')
    setMsg(null)
    try {
      const viewingWorking = previewSource === 'working' || !selectedVersion
      // Always save the current layout so the bucket can match the Layouts preview PDF.
      let skeletonSnap =
        viewingWorking && skeletonByKind[docKind]
          ? serializeSkeletonDoc(skeletonByKind[docKind]!)
          : liveDoc?.skeleton_body?.trim() ||
            (skeletonByKind[docKind] ? serializeSkeletonDoc(skeletonByKind[docKind]!) : null)

      let versionRow = selectedVersion
      if (viewingWorking || !versionRow) {
        if (!skeletonByKind[docKind]) {
          setMsg('Need a layout to save before moving to bucket.')
          return
        }
        skeletonSnap = serializeSkeletonDoc(skeletonByKind[docKind]!)
        const draft = buildDocumentFromAnswers(docKind, answersRow.answers, { includeTrust })
        const saved = await upsertWillDocument({
          orderId,
          partnerNumber: partner,
          kind: docKind,
          content: draft,
          attorneyNotes: notes.trim() || 'Saved for bucket',
          skeletonBody: skeletonSnap,
        })
        const rows = await listWillVersions({
          orderId,
          partnerNumber: partner,
          kind: docKind,
        })
        versionRow = rows.find((r) => r.version === saved.version) ?? rows[0] ?? null
        if (!versionRow) throw new Error('Saved version snapshot not found')
        setVersions(rows)
        setPreviewSource(versionRow.id)
      } else if (!skeletonSnap && skeletonByKind[docKind]) {
        // Version selected in preview, but keep the layout PDF the user has been editing.
        skeletonSnap = serializeSkeletonDoc(skeletonByKind[docKind]!)
      }

      const bucketNow = readDocumentBucket(data.order.add_ons as Record<string, unknown> | null)
      const next = upsertBucketItem(bucketNow, {
        kind: docKind,
        partnerNumber: partner,
        versionId: versionRow.id,
        version: versionRow.version,
        skeletonBody: skeletonSnap,
      })
      await saveDocumentBucket({
        orderId,
        addOns: data.order.add_ons as Record<string, unknown> | null,
        bucket: next,
      })
      setBucketLocal(next)
      // Soft refresh — no full-page loading flash.
      void onReload()
      setMsg(
        `${DOCUMENT_KIND_LABEL[docKind]} v${versionRow.version} is in the bucket — same layout as preview.`,
      )
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not move to bucket')
    } finally {
      setBusy(null)
    }
  }

  const partner1 = data.order.customer_name ?? data.order.user_email ?? 'Partner 1'
  const partner2 = data.order.partner_name ?? data.order.partner_email ?? 'Partner 2'
  const skel = skeletonByKind[docKind]

  return (
    <div className="space-y-5">
      {msg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Document
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {packageKinds.map((kind) => {
                const docRow = data.wills.find(
                  (w) => w.partner_number === partner && w.document_kind === kind,
                )
                const inBucket = isInBucket(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setDocKind(kind)}
                    className={cn(
                      'rounded-xl px-3 pt-3 pb-2 text-center text-sm transition',
                      docKind === kind
                        ? 'bg-foreground text-background'
                        : 'border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
                    )}
                  >
                    <span className="block font-medium">{DOCUMENT_KIND_LABEL[kind]}</span>
                    <span
                      className={cn(
                        'mt-0.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px]',
                        docKind === kind ? 'opacity-80' : 'text-muted-foreground',
                      )}
                    >
                      <span>{docRow ? `Live v${docRow.version}` : 'No live version'}</span>
                      {inBucket ? (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 font-medium',
                            docKind === kind
                              ? 'bg-background/20 text-background'
                              : 'bg-emerald-100 text-emerald-800',
                          )}
                        >
                          In bucket
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {isCouples ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Partner
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([1, 2] as const).map((p) => {
                  const name = p === 1 ? partner1 : partner2
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPartnerChange(p)}
                      className={cn(
                        'min-w-[10rem] rounded-xl px-3 py-2.5 text-left text-sm transition',
                        partner === p
                          ? 'bg-foreground text-background'
                          : 'border border-border text-foreground hover:border-foreground/40',
                      )}
                    >
                      <span className="block font-medium leading-snug">{name}</span>
                      <span
                        className={cn(
                          'mt-0.5 block text-[11px]',
                          partner === p ? 'opacity-80' : 'text-muted-foreground',
                        )}
                      >
                        Partner {p}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plan
              </p>
              <div className="mt-2">
                <div className="min-w-[10rem] rounded-xl bg-foreground px-3 py-2.5 text-left text-sm font-medium text-background">
                  <span className="block leading-snug">{partner1}</span>
                  <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                    Individual
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Preview, AI, and block edits apply to{' '}
          <span className="font-medium text-foreground">{DOCUMENT_KIND_LABEL[docKind]}</span>
          {isCouples ? (
            <>
              {' '}
              · Partner {partner} (
              {partner === 1 ? partner1 : partner2})
            </>
          ) : null}
          .
        </p>
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium">Document preview</h3>
            <p className="text-[11px] text-muted-foreground">
              {previewLoading
                ? 'Updating…'
                : selectedVersion
                  ? `Saved v${selectedVersion.version}${
                      liveDoc?.version === selectedVersion.version ? ' (live)' : ''
                    }`
                  : 'Working draft — answers + current layout'}
              {isInBucket(docKind) ? ' · In bucket' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0">Version</span>
              <select
                className="h-9 min-w-[12rem] rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                value={previewSource}
                onChange={(e) =>
                  setPreviewSource(e.target.value === 'working' ? 'working' : e.target.value)
                }
              >
                <option value="working">Working draft</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}
                    {liveDoc?.version === v.version ? ' · live' : ''}
                    {' · '}
                    {new Date(v.created_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              className="rounded-full gap-1"
              disabled={busy !== null || !answersRow}
              onClick={() => void movePreviewToBucket()}
            >
              {busy === 'bucket' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PackagePlus className="h-3.5 w-3.5" />
              )}
              Move to bucket
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full gap-1"
              disabled={!pdfUrl}
              onClick={() => {
                if (!pdfUrl) return
                const a = document.createElement('a')
                a.href = pdfUrl
                a.download = `${DOCUMENT_KIND_LABEL[docKind]}.pdf`
                a.click()
              }}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </div>
        {previewLoading ? (
          <PreviewLoadingEffect className="h-[36rem]" />
        ) : pdfUrl ? (
          <iframe
            title="Preview"
            src={pdfEmbedSrc(pdfUrl)}
            className="h-[42rem] w-full bg-white"
          />
        ) : (
          <p className="px-4 py-16 text-center text-sm text-muted-foreground">
            Fill answers to preview.
          </p>
        )}
        {pdfHash ? (
          <p className="truncate border-t border-border/60 px-3 py-2 font-mono text-[10px] text-muted-foreground">
            {pdfHash.slice(0, 24)}…
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI formatting
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Applies to {DOCUMENT_KIND_LABEL[docKind]}
            {isCouples ? ` · Partner ${partner}` : ''}
          </p>
          <Textarea
            className="mt-2 min-h-24 rounded-xl"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "move ARTICLE X to next page"'
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              className="min-w-0 flex-1 rounded-xl"
              disabled={busy !== null || !prompt.trim() || !workingSkeleton}
              onClick={() => void runPrompt()}
            >
              {busy === 'prompt' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply with AI
            </Button>
            {lastAi ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={busy !== null}
                onClick={undoLastAi}
              >
                Undo AI
              </Button>
            ) : null}
          </div>
          {lastAi ? (
            <p className="mt-2 text-xs text-muted-foreground">{lastAi.summary}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium">Live version</h3>
          <Textarea
            className="mt-2 min-h-14 rounded-xl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Version note (optional)"
          />
          <Button
            type="button"
            className="mt-2 w-full rounded-xl"
            disabled={busy !== null || !answersRow}
            onClick={() => void saveLiveVersion()}
          >
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save live version
          </Button>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs">
            {liveDoc ? (
              <li className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-emerald-900">
                Live v{liveDoc.version}
                {liveDoc.draft_generated_at
                  ? ` · ${new Date(liveDoc.draft_generated_at).toLocaleString()}`
                  : ''}
              </li>
            ) : (
              <li className="text-muted-foreground">No live version yet</li>
            )}
            {versions
              .filter((v) => v.version !== liveDoc?.version)
              .map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
                >
                  <span>
                    v{v.version} · {new Date(v.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-full px-2"
                    disabled={busy !== null}
                    onClick={() => void makeVersionLive(v)}
                  >
                    Make live
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <div className="min-w-0">
        {skel ? (
          <VisualSkeletonWorkspace
            doc={skel}
            onChange={(next) => {
              setLastAi(null)
              setSkeletonByKind((prev) => ({ ...prev, [docKind]: next }))
            }}
            schema={layoutSchema}
            answers={answersRow?.answers}
            fillOptions={{ includeTrust }}
            sidebarTitle="Answers"
            showEmbeddedPdf={false}
            showFieldSidebar
            header={
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl">{DOCUMENT_KIND_LABEL[docKind]}</h2>
                <p className="text-xs text-muted-foreground">
                  {skeletonMetaByKind[docKind]?.source ?? 'bundled'}
                  {liveDoc ? ` · live v${liveDoc.version}` : ''}
                </p>
              </div>
            }
            onSave={() => void saveLiveVersion()}
            saving={busy === 'save'}
            saveLabel="Save live version"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Loading skeleton…</p>
        )}
      </div>
    </div>
  )
}
