import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download, FileText, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { cn, pdfEmbedSrc } from '@/lib/utils'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin'
import { buildDocumentFromAnswers } from '@/lib/will-content'
import { parseSkeletonBody, serializeSkeletonDoc, type SkeletonDoc } from '@/lib/skeleton-doc'
import {
  ANCILLARY_KINDS,
  DOCUMENT_KIND_BLURB,
  DOCUMENT_KIND_LABEL,
  type DocumentKind,
} from '@/lib/document-kinds'
import {
  getOrderDetail,
  listWillVersions,
  updateOrderStatus,
  upsertWillDocument,
  type AnswersRow,
  type OrderDetail,
  type WillVersionRow,
} from '@/lib/admin-order'
import {
  deliverDocumentsToClient,
  orderedDocumentKindsForDelivery,
  pdfBytesToBase64,
  pdfFilenameFor,
} from '@/lib/admin-deliver'
import {
  buildPdfForOrderKind,
  loadSkeletonsForPartner,
  renderOrderDocumentPdf,
  sha256Hex,
  type SkeletonMeta,
} from '@/lib/admin-document-preview'
import { proposeSkeletonReformat } from '@/lib/ai-skeleton-reformat'

type VersionSelection = 'live' | 'current' | string

type Proposal = {
  summary: string
  risks: string[]
  provider: string
  skeleton: SkeletonDoc
  instruction: string
}

const STEPS = [
  { id: 'default', label: 'Default layout' },
  { id: 'prompt', label: 'Prompt / edit' },
  { id: 'version', label: 'Version saved' },
  { id: 'final', label: 'Final' },
  { id: 'dispatched', label: 'Dispatched' },
] as const

export default function OrderDocumentReviewPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partner, setPartner] = useState<1 | 2>(1)
  const [docKind, setDocKind] = useState<DocumentKind>('will')
  const [versionSel, setVersionSel] = useState<VersionSelection>('live')
  const [versions, setVersions] = useState<WillVersionRow[]>([])
  const [notes, setNotes] = useState('')
  const [prompt, setPrompt] = useState('')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfHash, setPdfHash] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [hashCopied, setHashCopied] = useState(false)
  const [skeletonByKind, setSkeletonByKind] = useState<Partial<Record<DocumentKind, SkeletonDoc>>>(
    {},
  )
  const [skeletonMetaByKind, setSkeletonMetaByKind] = useState<
    Partial<Record<DocumentKind, SkeletonMeta>>
  >({})
  const [sendKinds, setSendKinds] = useState<DocumentKind[]>(['will'])
  const [sendPartners, setSendPartners] = useState<(1 | 2)[]>([1])
  const [markedFinal, setMarkedFinal] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const detail = await getOrderDetail(orderId)
      setData(detail)
      const addOns = (detail.order.add_ons ?? {}) as { documents?: unknown; trust?: boolean }
      const kinds = orderedDocumentKindsForDelivery({
        documents: addOns.documents,
        includeTrust: Boolean(addOns.trust),
      })
      setSendKinds(kinds.length ? kinds : ['will'])
      const partners: (1 | 2)[] = detail.answers.some((a) => a.partner_number === 2)
        ? [1, 2]
        : [1]
      setSendPartners(partners)
      if (detail.order.status === 'approved' || detail.order.status === 'delivered') {
        setMarkedFinal(true)
      }
      if (detail.order.status === 'submitted' || detail.order.status === 'ready_for_review') {
        void updateOrderStatus({ orderId, status: 'in_review', note: 'Opened document review' }).catch(
          () => undefined,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    if (!data) return
    const kinds: DocumentKind[] = ['will', 'rlt', ...ANCILLARY_KINDS]
    void loadSkeletonsForPartner(data, partner, kinds)
      .then(({ docs, meta }) => {
        setSkeletonByKind(docs)
        setSkeletonMetaByKind(meta)
      })
      .catch(() => {
        setSkeletonByKind({})
        setSkeletonMetaByKind({})
      })
  }, [data, partner])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    setVersionSel('live')
    setProposal(null)
  }, [partner, docKind])

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    void listWillVersions({ orderId, partnerNumber: partner, kind: docKind })
      .then((rows) => {
        if (!cancelled) setVersions(rows)
      })
      .catch(() => {
        if (!cancelled) setVersions([])
      })
    return () => {
      cancelled = true
    }
  }, [orderId, partner, docKind, data?.wills])

  const answersRow: AnswersRow | undefined = useMemo(
    () => data?.answers.find((a) => a.partner_number === partner),
    [data, partner],
  )
  const includeTrust = Boolean(data?.order.add_ons?.trust)
  const isCouples = data?.order.plan_type === 'couples'
  const packageKinds = useMemo(
    () =>
      orderedDocumentKindsForDelivery({
        documents: (data?.order.add_ons as { documents?: unknown } | null)?.documents,
        includeTrust,
      }),
    [data, includeTrust],
  )
  const partnerDoc = data?.wills.find(
    (w) => w.partner_number === partner && w.document_kind === docKind,
  )
  const activeSavedDoc = partnerDoc
  const selectedHistory = useMemo(
    () =>
      versionSel !== 'live' && versionSel !== 'current'
        ? (versions.find((v) => v.id === versionSel) ?? null)
        : null,
    [versionSel, versions],
  )
  const viewingHistorical = Boolean(selectedHistory)
  const liveContent = useMemo(() => {
    if (!answersRow) return null
    return buildDocumentFromAnswers(docKind, answersRow.answers, { includeTrust })
  }, [answersRow, docKind, includeTrust])

  const workingSkeleton = useMemo(() => {
    if (proposal?.skeleton) return proposal.skeleton
    return skeletonByKind[docKind] ?? null
  }, [proposal, skeletonByKind, docKind])

  const activeStep = useMemo(() => {
    if (data?.order.status === 'delivered') return 4
    if (markedFinal || data?.order.status === 'approved') return 3
    if (versions.length > 0 || (activeSavedDoc?.version ?? 0) > 0) return 2
    if (proposal) return 1
    return 0
  }, [data, markedFinal, versions.length, activeSavedDoc, proposal])

  useEffect(() => {
    if (!answersRow && versionSel === 'live') {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfHash(null)
      return
    }

    let cancelled = false
    setPreviewLoading(true)

    const run = async () => {
      if (versionSel === 'live' && workingSkeleton && answersRow) {
        return renderOrderDocumentPdf({
          kind: docKind,
          answers: answersRow.answers,
          skeleton: workingSkeleton,
          includeTrust,
        })
      }
      const content =
        versionSel === 'current'
          ? (activeSavedDoc?.will_content ?? liveContent)
          : (selectedHistory?.will_content ?? liveContent)
      if (!content) throw new Error('No document content')
      if (workingSkeleton && answersRow && (versionSel === 'live' || versionSel === 'current')) {
        return renderOrderDocumentPdf({
          kind: docKind,
          answers: answersRow.answers,
          skeleton: workingSkeleton,
          includeTrust,
          fallbackContent: content,
        })
      }
      return renderOrderDocumentPdf({
        kind: docKind,
        answers: answersRow?.answers ?? {},
        skeleton: null,
        includeTrust,
        fallbackContent: content,
      })
    }

    void run()
      .then(async (bytes) => {
        if (cancelled) return
        const copy = new Uint8Array(bytes)
        const hash = await sha256Hex(copy)
        const blob = new Blob([copy], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfHash(hash)
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      })
      .catch((err) => {
        if (cancelled) return
        setActionMsg(err instanceof Error ? err.message : 'Could not render preview')
        setPdfHash(null)
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
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
    versionSel,
    includeTrust,
    liveContent,
    activeSavedDoc,
    selectedHistory,
  ])

  async function runPrompt() {
    if (!workingSkeleton) {
      setActionMsg('No skeleton loaded for this document.')
      return
    }
    if (!prompt.trim()) {
      setActionMsg('Enter a reformat instruction first.')
      return
    }
    setBusy('prompt')
    setActionMsg(null)
    try {
      const res = await proposeSkeletonReformat({
        orderId,
        documentKind: docKind,
        partnerNumber: partner,
        instruction: prompt.trim(),
        currentSkeleton: workingSkeleton,
      })
      setProposal({
        summary: res.summary,
        risks: res.risks ?? [],
        provider: res.provider,
        skeleton: parseSkeletonBody(serializeSkeletonDoc(res.proposedSkeleton)),
        instruction: prompt.trim(),
      })
      setActionMsg(`Proposal ready (${res.provider}). Accept to apply, then Save as new version.`)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Prompt reformat failed')
    } finally {
      setBusy(null)
    }
  }

  function acceptProposal() {
    if (!proposal) return
    setSkeletonByKind((prev) => ({ ...prev, [docKind]: proposal.skeleton }))
    setSkeletonMetaByKind((prev) => ({
      ...prev,
      [docKind]: { ...(prev[docKind] ?? { formName: null }), source: 'order' },
    }))
    setNotes((n) => {
      const tag = `Reformat: ${proposal.instruction}`
      return n.trim() ? `${n.trim()}\n${tag}` : tag
    })
    setProposal(null)
    setPrompt('')
    setActionMsg('Proposal accepted into working layout — Save as new version to keep it.')
  }

  function rejectProposal() {
    setProposal(null)
    setActionMsg('Proposal discarded.')
  }

  async function saveAsNewVersion() {
    if (!answersRow) {
      setActionMsg('No questionnaire answers for this partner yet.')
      return
    }
    const skel = skeletonByKind[docKind]
    if (!skel) {
      setActionMsg('No skeleton loaded.')
      return
    }
    setBusy('save')
    setActionMsg(null)
    try {
      const draft = buildDocumentFromAnswers(docKind, answersRow.answers, { includeTrust })
      const saved = await upsertWillDocument({
        orderId,
        partnerNumber: partner,
        kind: docKind,
        content: draft,
        attorneyNotes: notes,
        skeletonBody: serializeSkeletonDoc(skel),
      })
      await updateOrderStatus({
        orderId,
        status: 'ready_for_review',
        note: `Saved ${DOCUMENT_KIND_LABEL[docKind]} (v${saved.version})${notes.trim() ? `: ${notes.trim()}` : ''}`,
      })
      await load()
      setVersionSel('current')
      setActionMsg(`${DOCUMENT_KIND_LABEL[docKind]} saved as v${saved.version}`)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  async function markFinal() {
    setBusy('final')
    setActionMsg(null)
    try {
      await updateOrderStatus({
        orderId,
        status: 'approved',
        note: `Marked final for dispatch (${DOCUMENT_KIND_LABEL[docKind]})`,
        patch: { approved_at: new Date().toISOString() },
      })
      setMarkedFinal(true)
      await load()
      setActionMsg('Marked final — ready to approve & send.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Could not mark final')
    } finally {
      setBusy(null)
    }
  }

  async function approveAndSend() {
    if (!data) return
    if (sendKinds.length === 0) {
      setActionMsg('Select at least one document to send.')
      return
    }
    setBusy('send')
    setActionMsg(null)
    try {
      const couples = data.order.plan_type === 'couples'
      const attachments: {
        kind: DocumentKind
        partnerNumber: 1 | 2
        filename: string
        label: string
        contentBase64: string
      }[] = []

      for (const partnerNumber of sendPartners) {
        for (const kind of sendKinds) {
          if (kind === 'rlt' && !includeTrust) continue
          const bytes = await buildPdfForOrderKind({
            detail: data,
            kind,
            partnerNumber,
            skeletonByKind: partnerNumber === partner ? skeletonByKind : undefined,
          })
          if (!bytes) {
            throw new Error(
              `Could not build ${DOCUMENT_KIND_LABEL[kind]} for partner ${partnerNumber} (missing answers?).`,
            )
          }
          attachments.push({
            kind,
            partnerNumber,
            filename: pdfFilenameFor(kind, partnerNumber, couples),
            label: DOCUMENT_KIND_LABEL[kind],
            contentBase64: await pdfBytesToBase64(bytes),
          })
        }
      }

      if (attachments.length === 0) throw new Error('No PDFs were generated to send.')

      const result = await deliverDocumentsToClient({
        orderId,
        attachments,
        markDelivered: true,
      })
      await load()
      setActionMsg(
        `Sent ${result.sentCount} PDF${result.sentCount === 1 ? '' : 's'} and marked delivered.`,
      )
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(null)
    }
  }

  async function markDeliveredNoEmail() {
    setBusy('delivered')
    try {
      await updateOrderStatus({
        orderId,
        status: 'delivered',
        note: 'Marked delivered by admin (no email)',
      })
      await load()
      setActionMsg('Marked delivered')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  function downloadPdf() {
    if (!pdfUrl || !data) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${data.order.customer_name ?? 'Document'} - ${DOCUMENT_KIND_LABEL[docKind]} (preview).pdf`
    a.click()
  }

  async function copyHash() {
    if (!pdfHash) return
    await navigator.clipboard.writeText(pdfHash)
    setHashCopied(true)
    setTimeout(() => setHashCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading document review…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-sm text-destructive">{error ?? 'Order not found'}</p>
      </div>
    )
  }

  const { order } = data
  const partner1Label = order.customer_name ?? order.user_email ?? 'Partner 1'
  const partner2Label = order.partner_name ?? order.partner_email ?? 'Partner 2'
  const skelMeta = skeletonMetaByKind[docKind]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-2 gap-1.5 text-muted-foreground"
            onClick={() => navigate(`/admin/orders/${orderId}`)}
          >
            <ArrowLeft className="h-4 w-4" /> Order detail
          </Button>
          <h1 className="font-serif text-3xl tracking-tight text-foreground">Document review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customer_name ?? order.user_email} · default layout → prompt → version → dispatch
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 font-medium',
                STATUS_TONE[order.status] ?? 'bg-secondary',
              )}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 capitalize">
              {order.plan_type}
            </span>
          </div>
        </div>
        <Button type="button" variant="outline" className="rounded-full" asChild>
          <Link to={`/admin/orders/${orderId}`}>Edit answers / layouts</Link>
        </Button>
      </div>

      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className={cn(
              'rounded-lg border px-3 py-2 text-center text-xs font-medium',
              i <= activeStep
                ? 'border-foreground/30 bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            <span className="block opacity-70">{i + 1}</span>
            {step.label}
          </li>
        ))}
      </ol>

      {isCouples ? (
        <div className="flex flex-wrap gap-2">
          {([1, 2] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPartner(p)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                partner === p
                  ? 'bg-foreground text-background shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              Partner {p}{' '}
              <span className="font-normal opacity-80">
                ({p === 1 ? partner1Label : partner2Label})
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {actionMsg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{actionMsg}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,320px)]">
        <section className="space-y-3">
          <h2 className="font-serif text-lg">Package</h2>
          <p className="text-xs text-muted-foreground">
            Preview reflows from this order’s answers (any length). Page count updates automatically.
          </p>
          <ul className="space-y-2">
            {packageKinds.map((kind) => {
              const doc = data.wills.find(
                (w) => w.partner_number === partner && w.document_kind === kind,
              )
              const ready = Boolean(answersRow)
              return (
                <li key={kind}>
                  <button
                    type="button"
                    onClick={() => setDocKind(kind)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-3 text-left transition',
                      docKind === kind
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card hover:border-foreground/30',
                    )}
                  >
                    <span className="block text-sm font-medium">{DOCUMENT_KIND_LABEL[kind]}</span>
                    <span
                      className={cn(
                        'mt-1 block text-[11px]',
                        docKind === kind ? 'opacity-80' : 'text-muted-foreground',
                      )}
                    >
                      {ready ? (doc ? `Saved v${doc.version}` : 'Live default') : 'Waiting on answers'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">{DOCUMENT_KIND_BLURB[docKind]}</p>
          {skelMeta ? (
            <p className="text-[11px] text-muted-foreground">
              Skeleton source: {skelMeta.source}
              {skelMeta.formName ? ` · ${skelMeta.formName}` : ''}
            </p>
          ) : null}
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl">{DOCUMENT_KIND_LABEL[docKind]} preview</h2>
              <p className="text-xs text-muted-foreground">
                {proposal
                  ? 'Showing proposed layout (not saved yet).'
                  : viewingHistorical
                    ? 'Read-only history snapshot.'
                    : 'Live A4 from skeleton + answers.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={versionSel}
                onChange={(e) => setVersionSel(e.target.value as VersionSelection)}
                className="h-9 min-w-[11rem] rounded-full border border-border bg-background px-3 text-sm"
              >
                <option value="live">Live preview</option>
                {activeSavedDoc?.will_content ? (
                  <option value="current">Saved current (v{activeSavedDoc.version})</option>
                ) : null}
                {versions
                  .filter((v) => v.version !== activeSavedDoc?.version)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version} · {new Date(v.created_at).toLocaleString()}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                disabled={!pdfUrl || previewLoading}
                onClick={() => downloadPdf()}
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
          </div>

          {previewLoading ? (
            <div className="flex h-[640px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground">
              <Loader2 className="mb-2 h-6 w-6 animate-spin opacity-50" />
              Building preview…
            </div>
          ) : pdfUrl ? (
            <iframe
              title="Document preview"
              src={pdfEmbedSrc(pdfUrl)}
              className="h-[640px] w-full rounded-md border border-border bg-white"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
              <FileText className="mb-2 h-8 w-8 opacity-40" />
              No answers yet — preview appears when the questionnaire is filled.
            </div>
          )}

          {pdfHash ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Artifact SHA-256</span>
              <code className="max-w-full truncate rounded bg-secondary/50 px-2 py-1 font-mono">
                {pdfHash}
              </code>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2"
                onClick={() => void copyHash()}
              >
                {hashCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {hashCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 font-serif text-lg">
              <Sparkles className="h-4 w-4" />
              Prompt reformat
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Default layout is already loaded. If spacing or wording looks off, describe the fix.
              AI proposes skeleton JSON only — you Accept, then Save as a new version.
            </p>
            <Textarea
              className="mt-3 min-h-24"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Remove page breaks before signatures" or "Tighten the MPOA intro"'
              disabled={viewingHistorical || busy !== null}
            />
            <Button
              type="button"
              className="mt-2 w-full rounded-full"
              disabled={viewingHistorical || busy !== null || !prompt.trim()}
              onClick={() => void runPrompt()}
            >
              {busy === 'prompt' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run prompt
            </Button>

            {proposal ? (
              <div className="mt-3 space-y-2 rounded-md border border-border/70 bg-secondary/30 p-3 text-xs">
                <p className="font-medium text-foreground">{proposal.summary}</p>
                <p className="text-muted-foreground">Provider: {proposal.provider}</p>
                {proposal.risks.length ? (
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {proposal.risks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" size="sm" className="rounded-full" onClick={acceptProposal}>
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={rejectProposal}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-serif text-lg">Save version</h2>
            <Textarea
              className="mt-2 min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Version note (prompt is appended on Accept)"
              disabled={viewingHistorical}
            />
            <Button
              type="button"
              className="mt-2 w-full rounded-full"
              disabled={busy !== null || !answersRow || viewingHistorical}
              onClick={() => void saveAsNewVersion()}
            >
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save as new version
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h2 className="font-serif text-lg">Final &amp; dispatch</h2>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Documents to email</p>
              <ul className="space-y-1.5">
                {packageKinds.map((kind) => (
                  <li key={kind}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        checked={sendKinds.includes(kind)}
                        disabled={kind === 'will'}
                        onCheckedChange={(v) => {
                          setSendKinds((prev) => {
                            if (v === true) return prev.includes(kind) ? prev : [...prev, kind]
                            if (kind === 'will') return prev
                            return prev.filter((k) => k !== kind)
                          })
                        }}
                        className="mt-0.5"
                      />
                      {DOCUMENT_KIND_LABEL[kind]}
                    </label>
                  </li>
                ))}
              </ul>
              {isCouples ? (
                <div className="flex flex-wrap gap-3 border-t border-border/60 pt-2">
                  {([1, 2] as const).map((pn) => (
                    <label key={pn} className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={sendPartners.includes(pn)}
                        onCheckedChange={(v) => {
                          setSendPartners((prev) => {
                            if (v === true) return prev.includes(pn) ? prev : [...prev, pn]
                            if (prev.length <= 1) return prev
                            return prev.filter((p) => p !== pn)
                          })
                        }}
                      />
                      Partner {pn}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full rounded-full"
              disabled={busy !== null}
              onClick={() => void markFinal()}
            >
              {busy === 'final' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mark final
            </Button>
            <Button
              type="button"
              className="w-full rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={busy !== null || sendKinds.length === 0}
              onClick={() => void approveAndSend()}
            >
              {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Approve &amp; send documents
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              disabled={busy !== null}
              onClick={() => void markDeliveredNoEmail()}
            >
              Mark delivered (no email)
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
