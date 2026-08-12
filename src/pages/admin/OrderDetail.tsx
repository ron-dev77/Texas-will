import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin'
import {
  getOrderDetail,
  updateOrderStatus,
  upsertWillDocument,
  type AnswersRow,
  type OrderDetail,
  type WillDocRow,
} from '@/lib/admin-order'
import { SECTIONS, formatAnswerPreview, getVisibleFields } from '@/lib/questionnaire'
import { buildTrustFromAnswers, buildWillFromAnswers } from '@/lib/will-content'
import { normalizeWillExecutionBlock, renderDocumentPdf, type WillContent } from '@/lib/will-render'

type TabId = 'answers' | 'documents' | 'timeline'

const TABS: { id: TabId; label: string }[] = [
  { id: 'answers', label: 'Answers' },
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
  const [docKind, setDocKind] = useState<'will' | 'rlt'>('will')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const detail = await getOrderDetail(orderId)
      setData(detail)
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

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const answersRow: AnswersRow | undefined = useMemo(
    () => data?.answers.find((a) => a.partner_number === partner),
    [data, partner],
  )
  const includeTrust = Boolean(data?.order.add_ons?.trust)
  const partnerWill = data?.wills.find(
    (w) => w.partner_number === partner && (w.document_kind ?? 'will') === 'will',
  )
  const partnerTrust = data?.wills.find(
    (w) => w.partner_number === partner && w.document_kind === 'rlt',
  )
  const activeDoc: WillDocRow | undefined = docKind === 'rlt' ? partnerTrust : partnerWill

  async function refreshPdf(content: WillContent, kind: 'will' | 'rlt') {
    const normalized = kind === 'will' ? normalizeWillExecutionBlock(content) : content
    const bytes = await renderDocumentPdf(normalized, kind)
    const copy = new Uint8Array(bytes)
    const blob = new Blob([copy], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    return bytes
  }

  useEffect(() => {
    if (!activeDoc?.will_content) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }
    void refreshPdf(activeDoc.will_content, docKind).catch((err) => {
      console.error(err)
      setActionMsg(err instanceof Error ? err.message : 'Could not render PDF')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?.id, activeDoc?.version, docKind])

  async function regenerate(kind: 'will' | 'rlt') {
    if (!data || !answersRow) {
      setActionMsg('No questionnaire answers for this partner yet.')
      return
    }
    if (kind === 'will' && partnerWill && !notes.trim()) {
      setActionMsg('Add attorney notes before regenerating an existing will.')
      return
    }
    setBusy(kind === 'will' ? 'regen-will' : 'regen-trust')
    setActionMsg(null)
    try {
      const draft =
        kind === 'will'
          ? buildWillFromAnswers(answersRow.answers)
          : buildTrustFromAnswers(answersRow.answers)
      const content = kind === 'will' ? normalizeWillExecutionBlock(draft) : draft
      const saved = await upsertWillDocument({
        orderId,
        partnerNumber: partner,
        kind,
        content,
        attorneyNotes: notes,
      })
      await updateOrderStatus({
        orderId,
        status: 'in_review',
        note: `Regenerated ${kind === 'will' ? 'will' : 'trust'} (v${saved.version})${notes.trim() ? `: ${notes.trim()}` : ''}`,
      })
      await refreshPdf(content, kind)
      setNotes('')
      setDocKind(kind)
      setActionMsg(kind === 'will' ? 'Will regenerated' : 'Trust regenerated')
      await load()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setBusy(null)
    }
  }

  async function markStatus(status: 'delivered' | 'needs_revision') {
    if (!data) return
    setBusy(status)
    setActionMsg(null)
    try {
      await updateOrderStatus({
        orderId,
        status,
        note: notes.trim() || (status === 'delivered' ? 'Approved & marked delivered' : 'Needs revision'),
      })
      setActionMsg(status === 'delivered' ? 'Marked delivered' : 'Marked needs revision')
      await load()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  async function downloadPdf() {
    if (!pdfUrl) return
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = `${data?.order.customer_name ?? 'Will'} - ${docKind === 'rlt' ? 'Trust' : 'Last Will and Testament'}.pdf`
    a.click()
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error ?? 'Order not found'}</p>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          Back to queue
        </Button>
      </div>
    )
  }

  const { order, events } = data
  const isCouples = order.plan_type === 'couples'
  const amount = (order.amount_paid / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to queue
          </button>
          <h1 className="font-serif text-3xl text-foreground">
            {order.customer_name ?? order.user_email}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.user_email}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
        <div className="flex gap-2">
          {([1, 2] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={partner === p ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setPartner(p)}
            >
              Partner {p}
            </Button>
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

      {tab === 'answers' ? <AnswersTab answers={answersRow} /> : null}

      {tab === 'documents' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DocCard
              title="Last Will and Testament"
              doc={partnerWill}
              active={docKind === 'will'}
              onSelect={() => setDocKind('will')}
            />
            {includeTrust ? (
              <DocCard
                title="Revocable Living Trust"
                doc={partnerTrust}
                active={docKind === 'rlt'}
                onSelect={() => setDocKind('rlt')}
              />
            ) : null}
          </div>

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <h2 className="font-serif text-xl">Attorney notes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe the changes you want, then regenerate the{' '}
              {docKind === 'rlt' ? 'trust' : 'will'} (currently selected:{' '}
              <strong>{docKind === 'rlt' ? 'Revocable Living Trust' : 'Last Will and Testament'}</strong>
              ). Click <strong>Delivered</strong> when all documents look right.
            </p>
            <Textarea
              className="mt-3 min-h-28"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Change the executor to John Smith. Strengthen the residuary clause."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => void regenerate('will')}
                className="rounded-full"
              >
                {busy === 'regen-will' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Regenerate will
              </Button>
              {includeTrust ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => void regenerate('rlt')}
                  className="rounded-full"
                >
                  {busy === 'regen-trust' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Regenerate trust
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => void markStatus('delivered')}
                className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
              >
                Delivered
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

          <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl">
                {docKind === 'rlt' ? 'Trust preview' : 'Will preview'}
              </h2>
              <div className="flex gap-2">
                {!activeDoc?.will_content ? (
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    disabled={busy !== null}
                    onClick={() => void regenerate(docKind)}
                  >
                    Generate draft
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5"
                  disabled={!pdfUrl}
                  onClick={() => void downloadPdf()}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
            </div>
            {pdfUrl ? (
              <iframe
                title="Document PDF"
                src={pdfUrl}
                className="mt-4 h-[720px] w-full rounded-md border border-border bg-white"
              />
            ) : (
              <div className="mt-4 flex h-64 flex-col items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                <FileText className="mb-2 h-8 w-8 opacity-40" />
                No document yet — generate a draft from the questionnaire answers.
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'timeline' ? <TimelineTab order={order} events={events} /> : null}
    </div>
  )
}

function DocCard({
  title,
  doc,
  active,
  onSelect,
}: {
  title: string
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
      <p className="mt-1 text-xs text-muted-foreground">
        {doc
          ? `v${doc.version} · ${STATUS_LABEL[doc.status] ?? doc.status}${doc.draft_generated_at ? ` · ${new Date(doc.draft_generated_at).toLocaleString()}` : ''}`
          : 'Not generated yet'}
      </p>
    </button>
  )
}

function AnswersTab({ answers }: { answers?: AnswersRow }) {
  if (!answers) {
    return <p className="text-sm text-muted-foreground">No answers submitted for this partner.</p>
  }

  return (
    <div className="space-y-4">
      {SECTIONS.filter((s) => s.id !== 'review').map((section) => {
        const fields = getVisibleFields(section, answers.answers)
        if (fields.length === 0) return null
        return (
          <section key={section.id} className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-serif text-lg">{section.title}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.id} className={field.type === 'longtext' || field.type === 'people' || field.type === 'gifts' || field.type === 'charitable_gifts' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                    {formatAnswerPreview(field, answers.answers[field.id]) || '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
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
    <ol className="relative space-y-0 border-l border-border ml-3">
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
