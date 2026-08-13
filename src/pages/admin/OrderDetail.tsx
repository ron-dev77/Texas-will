import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn, pdfEmbedSrc } from '@/lib/utils'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin'
import { getActiveQuestionnaireSchema, resolveSkeletonForOrder } from '@/lib/admin-forms'
import { buildDocumentFromAnswers } from '@/lib/will-content'
import { renderDocumentPdf, type WillContent } from '@/lib/will-render'
import { parseSkeletonBody, serializeSkeletonDoc, type SkeletonDoc } from '@/lib/skeleton-doc'
import { renderSkeletonLayoutPdf } from '@/lib/skeleton-layout-pdf'
import {
  ANCILLARY_KINDS,
  DOCUMENT_KIND_BLURB,
  DOCUMENT_KIND_LABEL,
  type AncillaryKind,
  type DocumentKind,
} from '@/lib/document-kinds'
import {
  getOrderDetail,
  listWillVersions,
  saveOrderSkeleton,
  updateOrderStatus,
  upsertWillDocument,
  type AnswersRow,
  type OrderDetail,
  type WillDocRow,
  type WillVersionRow,
} from '@/lib/admin-order'
import {
  deliverDocumentsToClient,
  orderedDocumentKindsForDelivery,
  pdfBytesToBase64,
  pdfFilenameFor,
} from '@/lib/admin-deliver'
import { Checkbox } from '@/components/ui/checkbox'
import { VisualSkeletonWorkspace } from '@/components/admin/VisualSkeletonWorkspace'
import { formatAnswerPreview, getActiveSections, getVisibleFields, SECTIONS, type Section } from '@/lib/questionnaire'

type TabId = 'answers' | 'will_layout' | 'trust_layout' | 'ancillary_layout' | 'documents' | 'timeline'
/** live = answers draft; current = latest saved row; otherwise a history version id */
type VersionSelection = 'live' | 'current' | string

type SkeletonMeta = {
  source: 'order' | 'form' | 'bundled'
  formName: string | null
}

const TABS_BASE: { id: TabId; label: string }[] = [
  { id: 'answers', label: 'Answers' },
  { id: 'will_layout', label: 'Will layout' },
  { id: 'trust_layout', label: 'Trust layout' },
  { id: 'ancillary_layout', label: 'Ancillary layouts' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' },
]

export default function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('answers')
  const [partner, setPartner] = useState<1 | 2>(1)
  const [docKind, setDocKind] = useState<DocumentKind>('will')
  const [ancillaryLayoutKind, setAncillaryLayoutKind] = useState<AncillaryKind>('mpoa')
  const [versionSel, setVersionSel] = useState<VersionSelection>('live')
  const [versions, setVersions] = useState<WillVersionRow[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [skeletonByKind, setSkeletonByKind] = useState<Partial<Record<DocumentKind, SkeletonDoc>>>(
    {},
  )
  const [skeletonMetaByKind, setSkeletonMetaByKind] = useState<
    Partial<Record<DocumentKind, SkeletonMeta>>
  >({})
  const [layoutSchema, setLayoutSchema] = useState<Section[]>([...SECTIONS])
  const [layoutBusy, setLayoutBusy] = useState(false)
  const [sendKinds, setSendKinds] = useState<DocumentKind[]>(['will'])
  const [sendPartners, setSendPartners] = useState<(1 | 2)[]>([1])

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
      if (detail.order.status === 'submitted' || detail.order.status === 'ready_for_review') {
        void updateOrderStatus({ orderId, status: 'in_review', note: 'Opened by admin' }).catch(
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

  async function loadSkeletons(detail: OrderDetail, partnerNumber: 1 | 2) {
    const kinds: DocumentKind[] = ['will', 'rlt', ...ANCILLARY_KINDS]
    const schemaRes = await getActiveQuestionnaireSchema().catch(() => ({
      sections: [...SECTIONS] as Section[],
    }))
    setLayoutSchema(schemaRes.sections)

    const results = await Promise.all(
      kinds.map(async (kind) => {
        const doc = detail.wills.find(
          (w) => w.partner_number === partnerNumber && w.document_kind === kind,
        )
        const res = await resolveSkeletonForOrder({
          orderFormId: detail.order.questionnaire_form_id,
          orderSkeletonBody: doc?.skeleton_body,
          kind,
        })
        return { kind, res }
      }),
    )

    const nextDocs: Partial<Record<DocumentKind, SkeletonDoc>> = {}
    const nextMeta: Partial<Record<DocumentKind, SkeletonMeta>> = {}
    for (const { kind, res } of results) {
      nextDocs[kind] = parseSkeletonBody(res.body)
      nextMeta[kind] = { source: res.source, formName: res.formName }
    }
    setSkeletonByKind(nextDocs)
    setSkeletonMetaByKind(nextMeta)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    if (!data) return
    void loadSkeletons(data, partner).catch(() => {
      setSkeletonByKind({})
      setSkeletonMetaByKind({})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, partner])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    setVersionSel('live')
  }, [partner, docKind])

  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    setVersionsLoading(true)
    void listWillVersions({ orderId, partnerNumber: partner, kind: docKind })
      .then((rows) => {
        if (!cancelled) setVersions(rows)
      })
      .catch(() => {
        if (!cancelled) setVersions([])
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false)
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
  const partnerWill = data?.wills.find(
    (w) => w.partner_number === partner && (w.document_kind ?? 'will') === 'will',
  )
  const partnerTrust = data?.wills.find(
    (w) => w.partner_number === partner && w.document_kind === 'rlt',
  )
  const partnerDoc = data?.wills.find(
    (w) => w.partner_number === partner && w.document_kind === docKind,
  )
  const activeSavedDoc = partnerDoc

  const willSkeletonDoc = skeletonByKind.will ?? null
  const trustSkeletonDoc = skeletonByKind.rlt ?? null
  const willSkeletonMeta = skeletonMetaByKind.will ?? { source: 'bundled' as const, formName: null }
  const trustSkeletonMeta = skeletonMetaByKind.rlt ?? { source: 'bundled' as const, formName: null }
  const ancillarySkeletonDoc = skeletonByKind[ancillaryLayoutKind] ?? null
  const ancillarySkeletonMeta = skeletonMetaByKind[ancillaryLayoutKind] ?? {
    source: 'bundled' as const,
    formName: null,
  }

  const liveContent = useMemo((): WillContent | null => {
    if (!answersRow) return null
    return buildDocumentFromAnswers(docKind, answersRow.answers, { includeTrust })
  }, [answersRow, docKind, includeTrust])

  const selectedHistory = useMemo(
    () =>
      versionSel !== 'live' && versionSel !== 'current'
        ? (versions.find((v) => v.id === versionSel) ?? null)
        : null,
    [versionSel, versions],
  )

  const previewContent = useMemo((): WillContent | null => {
    if (versionSel === 'live') return liveContent
    if (versionSel === 'current') return activeSavedDoc?.will_content ?? liveContent
    return selectedHistory?.will_content ?? liveContent
  }, [versionSel, liveContent, activeSavedDoc, selectedHistory])

  const viewingHistorical = Boolean(selectedHistory)
  const viewingSavedCurrent = versionSel === 'current' && Boolean(activeSavedDoc?.will_content)

  useEffect(() => {
    if (tab !== 'documents') return
    if (!answersRow && versionSel === 'live') {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    let cancelled = false
    setPreviewLoading(true)

    const run = async () => {
      const skel = skeletonByKind[docKind]
      if (versionSel === 'live' && skel && answersRow) {
        return renderSkeletonLayoutPdf(
          skel,
          answersRow.answers,
          docKind === 'will' ? { includeTrust } : {},
        )
      }
      if (!previewContent) throw new Error('No document content')
      return renderDocumentPdf(previewContent, docKind)
    }

    void run()
      .then((bytes) => {
        if (cancelled) return
        const copy = new Uint8Array(bytes)
        const blob = new Blob([copy], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
      })
      .catch((err) => {
        if (cancelled) return
        setActionMsg(err instanceof Error ? err.message : 'Could not render preview')
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
  }, [tab, previewContent, docKind, versionSel, skeletonByKind, answersRow, includeTrust])

  async function saveDocument(kind: DocumentKind) {
    if (!answersRow) {
      setActionMsg('No questionnaire answers for this partner yet.')
      return
    }
    if (kind === 'will' && partnerWill && !notes.trim()) {
      setActionMsg('Add attorney notes before saving an updated will.')
      return
    }
    setBusy(`save-${kind}`)
    setActionMsg(null)
    try {
      const draft = buildDocumentFromAnswers(kind, answersRow.answers, { includeTrust })
      const skel = skeletonByKind[kind]
      const saved = await upsertWillDocument({
        orderId,
        partnerNumber: partner,
        kind,
        content: draft,
        attorneyNotes: notes,
        skeletonBody: skel ? serializeSkeletonDoc(skel) : undefined,
      })
      await updateOrderStatus({
        orderId,
        status: 'ready_for_review',
        note: `Saved ${DOCUMENT_KIND_LABEL[kind]} (v${saved.version})${notes.trim() ? `: ${notes.trim()}` : ''}`,
      })
      await load()
      setDocKind(kind)
      setVersionSel('current')
      setActionMsg(`${DOCUMENT_KIND_LABEL[kind]} saved to order`)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(null)
    }
  }

  async function markStatus(status: 'delivered' | 'needs_revision' | 'approved') {
    setBusy(status)
    setActionMsg(null)
    try {
      await updateOrderStatus({
        orderId,
        status,
        note:
          status === 'delivered'
            ? 'Marked delivered by admin'
            : status === 'approved'
              ? 'Approved by admin (not emailed yet)'
              : 'Needs revision',
        patch: status === 'approved' ? { approved_at: new Date().toISOString() } : undefined,
      })
      await load()
      setActionMsg(
        status === 'delivered'
          ? 'Marked delivered'
          : status === 'approved'
            ? 'Marked approved'
            : 'Marked needs revision',
      )
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  async function buildPdfForKind(
    kind: DocumentKind,
    partnerNumber: 1 | 2,
  ): Promise<Uint8Array | null> {
    if (!data) return null
    const answersForPartner = data.answers.find((a) => a.partner_number === partnerNumber)
    if (!answersForPartner) return null

    const trustOn = Boolean((data.order.add_ons as { trust?: boolean } | null)?.trust)
    let skel = skeletonByKind[kind]
    if (!skel || partnerNumber !== partner) {
      const doc = data.wills.find(
        (w) => w.partner_number === partnerNumber && w.document_kind === kind,
      )
      const resolved = await resolveSkeletonForOrder({
        orderFormId: data.order.questionnaire_form_id,
        orderSkeletonBody: doc?.skeleton_body,
        kind,
      })
      skel = parseSkeletonBody(resolved.body)
    }

    if (skel) {
      return renderSkeletonLayoutPdf(
        skel,
        answersForPartner.answers,
        kind === 'will' ? { includeTrust: trustOn } : {},
      )
    }

    const content = buildDocumentFromAnswers(kind, answersForPartner.answers, {
      includeTrust: trustOn,
    })
    return renderDocumentPdf(content, kind)
  }

  async function approveAndSendDocuments() {
    if (!data) return
    if (sendKinds.length === 0) {
      setActionMsg('Select at least one document to send.')
      return
    }
    if (sendPartners.length === 0) {
      setActionMsg('Select at least one partner to send to.')
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
          const bytes = await buildPdfForKind(kind, partnerNumber)
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

      if (attachments.length === 0) {
        throw new Error('No PDFs were generated to send.')
      }

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

  function toggleSendKind(kind: DocumentKind, on: boolean) {
    setSendKinds((prev) => {
      if (on) return prev.includes(kind) ? prev : [...prev, kind]
      if (kind === 'will') return prev // will required in delivery package when purchased
      return prev.filter((k) => k !== kind)
    })
  }

  function toggleSendPartner(pn: 1 | 2, on: boolean) {
    setSendPartners((prev) => {
      if (on) return prev.includes(pn) ? prev : [...prev, pn]
      if (prev.length <= 1) return prev
      return prev.filter((p) => p !== pn)
    })
  }

  async function saveLayoutOnly(kind: DocumentKind) {
    const skel = skeletonByKind[kind]
    if (!skel) {
      setActionMsg('No skeleton loaded.')
      return
    }
    setLayoutBusy(true)
    setActionMsg(null)
    try {
      await saveOrderSkeleton({
        orderId,
        partnerNumber: partner,
        skeletonBody: serializeSkeletonDoc(skel),
        kind,
      })
      await load()
      setSkeletonMetaByKind((prev) => ({
        ...prev,
        [kind]: { ...(prev[kind] ?? { formName: null }), source: 'order' },
      }))
      setActionMsg(`${DOCUMENT_KIND_LABEL[kind]} layout saved on this order.`)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Could not save layout')
    } finally {
      setLayoutBusy(false)
    }
  }

  async function resetLayoutToForm(kind: DocumentKind) {
    if (!data) return
    setLayoutBusy(true)
    try {
      const resolved = await resolveSkeletonForOrder({
        orderFormId: data.order.questionnaire_form_id,
        orderSkeletonBody: null,
        kind,
      })
      const parsed = parseSkeletonBody(resolved.body)
      setSkeletonByKind((prev) => ({ ...prev, [kind]: parsed }))
      setSkeletonMetaByKind((prev) => ({
        ...prev,
        [kind]: { source: resolved.source, formName: resolved.formName },
      }))
      setActionMsg('Reloaded form skeleton — Save layout to keep it on this order.')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLayoutBusy(false)
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${data?.order.customer_name ?? 'Document'} - ${DOCUMENT_KIND_LABEL[docKind]} (preview).pdf`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading order…
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

  const { order, events } = data
  const amount = `$${(order.amount_paid / 100).toFixed(2)}`
  const partner1Label = order.customer_name ?? order.user_email ?? 'Partner 1'
  const partner2Label = order.partner_name ?? order.partner_email ?? 'Partner 2'
  const TABS = TABS_BASE.filter((t) => t.id !== 'trust_layout' || includeTrust)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 mb-2 gap-1.5 text-muted-foreground"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-4 w-4" /> Review queue
          </Button>
          <h1 className="font-serif text-3xl tracking-tight text-foreground">
            {order.customer_name ?? order.user_email}
          </h1>
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
            {includeTrust ? (
              <span className="rounded-full border border-border px-2.5 py-0.5">+ Trust</span>
            ) : null}
            <span className="text-muted-foreground">{amount}</span>
          </div>
        </div>
      </div>

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

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition',
              tab === t.id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionMsg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{actionMsg}</p>
      ) : null}

      {tab === 'answers' ? (
        <AnswersTab
          answers={answersRow}
          includeTrust={includeTrust}
          documents={
            Array.isArray(data?.order.add_ons?.documents)
              ? (data.order.add_ons.documents as string[])
              : ['will']
          }
        />
      ) : null}

      {tab === 'will_layout' && willSkeletonDoc ? (
        <VisualSkeletonWorkspace
          doc={willSkeletonDoc}
          onChange={(next) => setSkeletonByKind((prev) => ({ ...prev, will: next }))}
          schema={layoutSchema}
          answers={answersRow?.answers}
          fillOptions={{ includeTrust }}
          sidebarTitle="Answers on this order"
          sidebarHint="Drag into blocks to place tokens. Values shown are what this customer entered."
          saving={layoutBusy}
          saveLabel="Save will layout on order"
          onSave={() => void saveLayoutOnly('will')}
          header={
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl">Will layout</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Same visual skeleton builder as the form template — edits apply only to this order.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Source:{' '}
                  <span className="font-medium text-foreground">
                    {willSkeletonMeta.source === 'order'
                      ? 'Corrected on this order'
                      : willSkeletonMeta.source === 'form'
                        ? willSkeletonMeta.formName ?? 'Form skeleton'
                        : 'Built-in default'}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={layoutBusy}
                onClick={() => void resetLayoutToForm('will')}
              >
                Reset to form skeleton
              </Button>
            </div>
          }
        />
      ) : null}

      {tab === 'trust_layout' && includeTrust && trustSkeletonDoc ? (
        <VisualSkeletonWorkspace
          doc={trustSkeletonDoc}
          onChange={(next) => setSkeletonByKind((prev) => ({ ...prev, rlt: next }))}
          schema={layoutSchema}
          answers={answersRow?.answers}
          sidebarTitle="Answers on this order"
          sidebarHint="Drag into blocks to place tokens. Values shown are what this customer entered."
          saving={layoutBusy}
          saveLabel="Save trust layout on order"
          onSave={() => void saveLayoutOnly('rlt')}
          header={
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl">Trust layout</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Same visual skeleton builder — edits apply only to this order’s trust.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Source:{' '}
                  <span className="font-medium text-foreground">
                    {trustSkeletonMeta.source === 'order'
                      ? 'Corrected on this order'
                      : trustSkeletonMeta.source === 'form'
                        ? trustSkeletonMeta.formName ?? 'Form skeleton'
                        : 'Built-in default'}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                disabled={layoutBusy}
                onClick={() => void resetLayoutToForm('rlt')}
              >
                Reset to form skeleton
              </Button>
            </div>
          }
        />
      ) : null}

      {tab === 'ancillary_layout' && ancillarySkeletonDoc ? (
        <VisualSkeletonWorkspace
          doc={ancillarySkeletonDoc}
          onChange={(next) =>
            setSkeletonByKind((prev) => ({ ...prev, [ancillaryLayoutKind]: next }))
          }
          schema={layoutSchema}
          answers={answersRow?.answers}
          sidebarTitle="Answers on this order"
          sidebarHint="Drag into blocks to place tokens. Values shown are what this customer entered."
          saving={layoutBusy}
          saveLabel={`Save ${DOCUMENT_KIND_LABEL[ancillaryLayoutKind]} layout on order`}
          onSave={() => void saveLayoutOnly(ancillaryLayoutKind)}
          header={
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl">Ancillary layouts</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Four separate papers — pick one below. Medical POA is not the same as Durable POA,
                    Directive, or HIPAA.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source:{' '}
                    <span className="font-medium text-foreground">
                      {ancillarySkeletonMeta.source === 'order'
                        ? 'Corrected on this order'
                        : ancillarySkeletonMeta.source === 'form'
                          ? ancillarySkeletonMeta.formName ?? 'Form skeleton'
                          : 'Built-in default'}
                    </span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  disabled={layoutBusy}
                  onClick={() => void resetLayoutToForm(ancillaryLayoutKind)}
                >
                  Reset to form skeleton
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {ANCILLARY_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    title={DOCUMENT_KIND_BLURB[k]}
                    onClick={() => setAncillaryLayoutKind(k)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      ancillaryLayoutKind === k
                        ? 'bg-foreground text-background'
                        : 'border border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {DOCUMENT_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{DOCUMENT_KIND_BLURB[ancillaryLayoutKind]}</p>
            </div>
          }
        />
      ) : null}

      {tab === 'documents' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              One questionnaire feeds <strong>separate papers</strong>. Click a card to preview that
              document — Medical POA is only one of four ancillaries.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DocCard
              title={DOCUMENT_KIND_LABEL.will}
              blurb={DOCUMENT_KIND_BLURB.will}
              doc={partnerWill}
              active={docKind === 'will'}
              onSelect={() => setDocKind('will')}
            />
            {includeTrust ? (
              <DocCard
                title={DOCUMENT_KIND_LABEL.rlt}
                blurb={DOCUMENT_KIND_BLURB.rlt}
                doc={partnerTrust}
                active={docKind === 'rlt'}
                onSelect={() => setDocKind('rlt')}
              />
            ) : null}
            {ANCILLARY_KINDS.map((k) => {
              const doc = data.wills.find(
                (w) => w.partner_number === partner && w.document_kind === k,
              )
              return (
                <DocCard
                  key={k}
                  title={DOCUMENT_KIND_LABEL[k]}
                  blurb={DOCUMENT_KIND_BLURB[k]}
                  doc={doc}
                  active={docKind === k}
                  onSelect={() => setDocKind(k)}
                />
              )
            })}
            </div>
          </div>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl">{DOCUMENT_KIND_LABEL[docKind]} preview</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {viewingHistorical
                    ? 'Read-only history snapshot.'
                    : viewingSavedCurrent
                      ? 'Viewing the latest saved copy on this order.'
                      : 'Live A4 preview from this document’s skeleton + this partner’s answers. Save stores a copy on the order.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0">Version</span>
                  <select
                    value={versionSel}
                    disabled={versionsLoading}
                    onChange={(e) => setVersionSel(e.target.value as VersionSelection)}
                    className="h-9 min-w-[11rem] rounded-full border border-border bg-background px-3 text-sm text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
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
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5"
                  disabled={!pdfUrl || previewLoading}
                  onClick={() => void downloadPdf()}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download preview
                </Button>
              </div>
            </div>
            {selectedHistory?.attorney_notes ? (
              <p className="mt-3 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Notes for this version:</span>{' '}
                {selectedHistory.attorney_notes}
              </p>
            ) : null}
            {previewLoading ? (
              <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground">
                <Loader2 className="mb-2 h-6 w-6 animate-spin opacity-50" />
                Building preview…
              </div>
            ) : pdfUrl ? (
              <iframe
                title="Document preview"
                src={pdfEmbedSrc(pdfUrl)}
                className="mt-4 h-[720px] w-full rounded-md border border-border bg-white"
              />
            ) : (
              <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground">
                <FileText className="mb-2 h-8 w-8 opacity-40" />
                No answers yet for this partner — preview will appear when the questionnaire is filled.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="font-serif text-xl">Review &amp; deliver</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update status as you review, then approve &amp; send only the documents this customer
              purchased (will required; others optional; trust if paid). PDFs attach to the
              documents-ready email.
            </p>
            <Textarea
              className="mt-3 min-h-28"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Change the executor to John Smith. Strengthen the residuary clause."
              disabled={viewingHistorical}
            />

            <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-secondary/30 p-4">
              <p className="text-sm font-medium text-foreground">Documents to email</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {orderedDocumentKindsForDelivery({
                  documents: (data?.order.add_ons as { documents?: unknown } | null)?.documents,
                  includeTrust,
                }).map((kind) => {
                  const checked = sendKinds.includes(kind)
                  return (
                    <li key={kind}>
                      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                        <Checkbox
                          checked={checked}
                          disabled={kind === 'will'}
                          onCheckedChange={(v) => toggleSendKind(kind, v === true)}
                          className="mt-0.5"
                        />
                        <span>
                          {DOCUMENT_KIND_LABEL[kind]}
                          {kind === 'will' ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              Required
                            </span>
                          ) : kind === 'rlt' ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              +$50 add-on
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              {isCouples ? (
                <div className="flex flex-wrap gap-4 border-t border-border/60 pt-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={sendPartners.includes(1)}
                      onCheckedChange={(v) => toggleSendPartner(1, v === true)}
                    />
                    Partner 1 ({order.user_email})
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={sendPartners.includes(2)}
                      onCheckedChange={(v) => toggleSendPartner(2, v === true)}
                    />
                    Partner 2 ({order.partner_email ?? 'no email'})
                  </label>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy !== null || !answersRow || viewingHistorical}
                onClick={() => void saveDocument(docKind)}
                className="rounded-full"
              >
                {busy === `save-${docKind}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save {DOCUMENT_KIND_LABEL[docKind]}
              </Button>
              {docKind !== 'will' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null || !answersRow || viewingHistorical}
                  onClick={() => void saveDocument('will')}
                  className="rounded-full"
                >
                  {busy === 'save-will' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save will
                </Button>
              ) : null}
              {includeTrust && docKind !== 'rlt' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null || !answersRow || viewingHistorical}
                  onClick={() => void saveDocument('rlt')}
                  className="rounded-full"
                >
                  {busy === 'save-rlt' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save trust
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void markStatus('approved')}
                className="rounded-full"
              >
                {busy === 'approved' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mark approved
              </Button>
              <Button
                type="button"
                disabled={busy !== null || sendKinds.length === 0}
                onClick={() => void approveAndSendDocuments()}
                className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Approve &amp; send documents
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void markStatus('delivered')}
                className="rounded-full"
              >
                Mark delivered (no email)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => void markStatus('needs_revision')}
                className="rounded-full"
              >
                Mark needs revision
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'timeline' ? <TimelineTab order={order} events={events} /> : null}
    </div>
  )
}

function DocCard({
  title,
  blurb,
  doc,
  active,
  onSelect,
}: {
  title: string
  blurb?: string
  doc?: WillDocRow
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-4 text-left transition',
        active ? 'border-foreground bg-card shadow-sm' : 'border-border bg-card/60 hover:border-foreground/40',
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      {blurb ? <p className="mt-1 text-xs leading-snug text-muted-foreground">{blurb}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        {doc
          ? `Saved v${doc.version} · ${STATUS_LABEL[doc.status] ?? doc.status}${doc.draft_generated_at ? ` · ${new Date(doc.draft_generated_at).toLocaleString()}` : ''}`
          : 'Preview only · not saved yet'}
      </p>
    </button>
  )
}

function AnswersTab({
  answers,
  includeTrust,
  documents = ['will'],
}: {
  answers?: AnswersRow
  includeTrust?: boolean
  documents?: string[]
}) {
  const [schema, setSchema] = useState<Section[]>([...SECTIONS])

  useEffect(() => {
    getActiveQuestionnaireSchema()
      .then((res) => setSchema(res.sections))
      .catch(() => setSchema([...SECTIONS]))
  }, [])

  if (!answers) {
    return <p className="text-sm text-muted-foreground">No answers submitted for this partner.</p>
  }

  const sections = getActiveSections(Boolean(includeTrust), schema, documents).filter(
    (s) => !s.isReview && s.id !== 'review',
  )

  const knownIds = new Set(sections.flatMap((s) => s.fields.map((f) => f.id)))
  const extraKeys = Object.keys(answers.answers).filter((k) => {
    if (knownIds.has(k)) return false
    const v = answers.answers[k]
    if (v == null || v === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  })

  const visibleSections = sections
    .map((section) => {
      const fields = getVisibleFields(section, answers.answers).filter((f) => {
        const v = answers.answers[f.id]
        if (v == null || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        return true
      })
      return { section, fields }
    })
    .filter((row) => row.fields.length > 0)

  return (
    <div className="space-y-3">
      {visibleSections.map(({ section, fields }, idx) => (
          <section
            key={section.id}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_0_rgba(15,23,42,0.03)]"
          >
            <div className="flex items-center gap-3 bg-secondary/30 px-4 py-3 sm:px-5">
              <span className="font-serif text-lg tabular-nums text-accent">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h2 className="font-serif text-[1.05rem] leading-tight text-foreground">
                {section.title}
              </h2>
            </div>
            <dl className="grid gap-0 sm:grid-cols-2">
              {fields.map((field) => {
                const wide =
                  field.type === 'longtext' ||
                  field.type === 'people' ||
                  field.type === 'gifts' ||
                  field.type === 'charitable_gifts' ||
                  field.type === 'radio'
                const preview = formatAnswerPreview(field, answers.answers[field.id])
                return (
                  <div
                    key={field.id}
                    className={cn(
                      'border-t border-border/40 px-4 py-3.5 sm:px-5',
                      wide && 'sm:col-span-2',
                    )}
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {field.label.replace(/ \(optional\)$/i, '')}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[13.5px] leading-snug text-foreground">
                      {preview === '—' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        preview
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
      ))}
      {extraKeys.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="bg-secondary/30 px-4 py-3 sm:px-5">
            <h2 className="font-serif text-[1.05rem] text-foreground">Other answers</h2>
          </div>
          <dl className="grid gap-0 sm:grid-cols-2">
            {extraKeys.map((key) => {
              const v = answers.answers[key]
              const text =
                typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v ?? '—')
              return (
                <div key={key} className="border-t border-border/40 px-4 py-3.5 sm:px-5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[13.5px] leading-snug text-foreground">
                    {text}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ) : null}
    </div>
  )
}

function TimelineTab({
  order,
  events,
}: {
  order: OrderDetail['order']
  events: OrderDetail['events']
}) {
  const synthetic = [
    { at: order.created_at, label: 'Order created', note: null as string | null },
    order.submitted_at
      ? { at: order.submitted_at, label: 'Questionnaire submitted', note: null }
      : null,
    order.approved_at ? { at: order.approved_at, label: 'Approved', note: null } : null,
    order.delivered_at ? { at: order.delivered_at, label: 'Delivered', note: null } : null,
  ].filter(Boolean) as { at: string; label: string; note: string | null }[]

  const rows =
    events.length > 0
      ? events.map((e) => ({
          at: e.created_at,
          label: STATUS_LABEL[e.status] ?? e.status,
          note: e.note,
        }))
      : synthetic

  return (
    <ol className="relative ml-3 space-y-0 border-l border-border">
      {rows.map((row, idx) => (
        <li key={`${row.at}-${idx}`} className="relative pb-6 pl-6 last:pb-0">
          <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-foreground" />
          <p className="text-sm font-medium text-foreground">{row.label}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(row.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          {row.note ? <p className="mt-1 text-sm text-muted-foreground">{row.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}
