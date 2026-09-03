import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLoadingEffect } from '@/components/ui/loading-block'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/admin'
import { getActiveQuestionnaireSchema, resolveSkeletonForOrder } from '@/lib/admin-forms'
import { parseSkeletonBody, type SkeletonDoc } from '@/lib/skeleton-doc'
import { ANCILLARY_KINDS, type DocumentKind } from '@/lib/document-kinds'
import {
  getOrderDetail,
  updateOrderStatus,
  type AnswersRow,
  type OrderDetail,
} from '@/lib/admin-order'
import { orderedDocumentKindsForDelivery } from '@/lib/admin-deliver'
import { readDocumentBucket } from '@/lib/admin-document-bucket'
import {
  formatAnswerPreview,
  getActiveSections,
  getVisibleFields,
  SECTIONS,
  type Section,
} from '@/lib/questionnaire'
import { OrderLayoutsTab } from '@/components/admin/OrderLayoutsTab'
import { OrderBucketTab } from '@/components/admin/OrderBucketTab'
import type { SkeletonMeta } from '@/lib/admin-document-preview'

type TabId = 'answers' | 'layouts' | 'bucket' | 'timeline'

const PACKAGE_SHORT: Record<DocumentKind, string> = {
  will: 'Will',
  rlt: 'Trust',
  spousal_trust: 'Spousal',
  mpoa: 'MPOA',
  dpoa: 'DPOA',
  directive: 'Directive',
  hipaa: 'HIPAA',
}

const TAB_IDS: TabId[] = ['answers', 'layouts', 'bucket', 'timeline']

const TAB_LABEL: Record<TabId, string> = {
  answers: 'Answers',
  layouts: 'Layouts',
  bucket: 'Bucket',
  timeline: 'Timeline',
}

export default function OrderDetailPage() {
  const { orderId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [data, setData] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<TabId>(
    tabParam === 'layouts' || tabParam === 'bucket' || tabParam === 'timeline'
      ? tabParam
      : 'answers',
  )
  const [partner, setPartner] = useState<1 | 2>(1)
  const [skeletonByKind, setSkeletonByKind] = useState<Partial<Record<DocumentKind, SkeletonDoc>>>(
    {},
  )
  const [skeletonMetaByKind, setSkeletonMetaByKind] = useState<
    Partial<Record<DocumentKind, SkeletonMeta>>
  >({})
  const [layoutSchema, setLayoutSchema] = useState<Section[]>([...SECTIONS])

  function selectTab(next: TabId) {
    setTab(next)
    setSearchParams(next === 'answers' ? {} : { tab: next }, { replace: true })
  }

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const detail = await getOrderDetail(orderId)
      setData(detail)
      if (
        !opts?.silent &&
        (detail.order.status === 'submitted' || detail.order.status === 'ready_for_review')
      ) {
        void updateOrderStatus({ orderId, status: 'in_review', note: 'Opened by admin' }).catch(
          () => undefined,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order')
      if (!opts?.silent) setData(null)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  async function loadSkeletons(detail: OrderDetail, partnerNumber: 1 | 2) {
    const kinds: DocumentKind[] = ['will', 'rlt', 'spousal_trust', ...ANCILLARY_KINDS]
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
    if (tabParam === 'layouts' || tabParam === 'bucket' || tabParam === 'timeline') setTab(tabParam)
    else if (tabParam === 'answers' || !tabParam) setTab('answers')
  }, [tabParam])

  const answersRow = useMemo(
    () => data?.answers.find((a) => a.partner_number === partner),
    [data, partner],
  )
  const includeTrust = Boolean(data?.order.add_ons?.trust)
  const includeSpousalTrust = Boolean(
    (data?.order.add_ons as { spousal_trust?: boolean } | null)?.spousal_trust,
  )
  const estateBracket = (data?.order.add_ons as { estate_bracket?: string } | null)?.estate_bracket
  const isCouples = data?.order.plan_type === 'couples'

  if (loading) {
    return <PageLoadingEffect label="Loading order" />
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
  const displayName = order.customer_name?.trim() || order.user_email || 'Order'
  const packageKinds = orderedDocumentKindsForDelivery({
    documents: (order.add_ons as { documents?: unknown } | null)?.documents,
    includeTrust,
    includeSpousalTrust,
  })
  const bucketCount = readDocumentBucket(order.add_ons as Record<string, unknown> | null).items
    .length
  const showPartnerSwitcher = tab === 'answers'

  return (
    <div className="space-y-5">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 mb-3 h-8 gap-1.5 px-2 text-muted-foreground"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
              {displayName}
            </h1>
            {order.customer_name && order.user_email ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{order.user_email}</p>
            ) : null}
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">{amount}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium',
              STATUS_TONE[order.status] ?? 'bg-secondary',
            )}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <span className="text-xs text-muted-foreground capitalize">{order.plan_type}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {packageKinds.map((k) => PACKAGE_SHORT[k]).join(' · ')}
          </span>
          {includeSpousalTrust ? (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Spousal trust
            </span>
          ) : null}
          {estateBracket ? (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              Estate: {estateBracket.replace(/_/g, ' ')}
            </span>
          ) : null}
        </div>
      </div>

      {showPartnerSwitcher ? (
        isCouples ? (
          <div className="flex flex-wrap gap-2">
            {([1, 2] as const).map((p) => {
              const name = p === 1 ? partner1Label : partner2Label
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPartner(p)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm transition',
                    partner === p
                      ? 'bg-foreground text-background'
                      : 'border border-border bg-card text-foreground hover:border-foreground/30',
                  )}
                >
                  <span className="block font-medium leading-snug">{name}</span>
                  <span
                    className={cn(
                      'block text-[11px]',
                      partner === p ? 'opacity-70' : 'text-muted-foreground',
                    )}
                  >
                    Partner {p}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="inline-flex min-w-[10rem] flex-col rounded-xl bg-foreground px-3 py-2.5 text-left text-sm font-medium text-background">
            <span className="leading-snug">{partner1Label}</span>
            <span className="mt-0.5 text-[11px] font-normal opacity-80">Individual</span>
          </div>
        )
      ) : null}

      <div className="flex gap-1 border-b border-border">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4',
              tab === id
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {TAB_LABEL[id]}
            {id === 'bucket' && bucketCount > 0 ? (
              <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                {bucketCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'answers' ? (
        <AnswersTab
          answers={answersRow}
          includeTrust={includeTrust}
          includeSpousalTrust={includeSpousalTrust}
          documents={
            Array.isArray(data.order.add_ons?.documents)
              ? (data.order.add_ons.documents as string[])
              : ['will']
          }
        />
      ) : null}

      {tab === 'layouts' ? (
        <OrderLayoutsTab
          orderId={orderId}
          data={data}
          partner={partner}
          onPartnerChange={setPartner}
          skeletonByKind={skeletonByKind}
          skeletonMetaByKind={skeletonMetaByKind}
          setSkeletonByKind={setSkeletonByKind}
          layoutSchema={layoutSchema}
          onReload={() => load({ silent: true })}
        />
      ) : null}

      {tab === 'bucket' ? (
        <OrderBucketTab orderId={orderId} data={data} onReload={() => load({ silent: true })} />
      ) : null}

      {tab === 'timeline' ? <TimelineTab order={order} events={events} /> : null}
    </div>
  )
}

function AnswersTab({
  answers,
  includeTrust,
  includeSpousalTrust,
  documents = ['will'],
}: {
  answers?: AnswersRow
  includeTrust?: boolean
  includeSpousalTrust?: boolean
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

  const sections = getActiveSections(
    Boolean(includeTrust),
    schema,
    documents,
    Boolean(includeSpousalTrust),
  ).filter(
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
