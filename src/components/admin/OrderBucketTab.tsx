import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Modal } from '@/components/ui/modal'
import { PreviewLoadingEffect } from '@/components/ui/loading-block'
import { cn, pdfEmbedSrc } from '@/lib/utils'
import { DOCUMENT_KIND_LABEL } from '@/lib/document-kinds'
import {
  readDocumentBucket,
  removeBucketItem,
  saveDocumentBucket,
  type DocumentBucketItem,
} from '@/lib/admin-document-bucket'
import { listWillVersions, type OrderDetail, type WillVersionRow } from '@/lib/admin-order'
import { renderOrderDocumentPdf, sha256Hex } from '@/lib/admin-document-preview'
import { parseSkeletonBody } from '@/lib/skeleton-doc'
import {
  deliverDocumentsToClient,
  pdfBytesToBase64,
  pdfFilenameFor,
} from '@/lib/admin-deliver'
import { updateOrderStatus } from '@/lib/admin-order'
import {
  orderNeedsSpecialNeedsLawyerSignoff,
  SPECIAL_NEEDS_LAWYER_SIGNOFF_TEXT,
} from '@/lib/special-needs-trust'

type Props = {
  orderId: string
  data: OrderDetail
  onReload: () => Promise<void>
}

export function OrderBucketTab({ orderId, data, onReload }: Props) {
  const includeTrust = Boolean(data.order.add_ons?.trust)
  const isCouples = data.order.plan_type === 'couples'
  const partner1 = data.order.customer_name ?? data.order.user_email ?? 'Partner 1'
  const partner2 = data.order.partner_name ?? data.order.partner_email ?? 'Partner 2'
  const clientEmail = data.order.user_email ?? data.order.customer_name ?? 'the client'

  const bucket = useMemo(
    () => readDocumentBucket(data.order.add_ons as Record<string, unknown> | null),
    [data.order.add_ons],
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [versionCache, setVersionCache] = useState<Record<string, WillVersionRow | null>>({})
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfHash, setPdfHash] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const [sntLawyerApproved, setSntLawyerApproved] = useState(false)
  const needsSntLawyerSignoff = useMemo(
    () => orderNeedsSpecialNeedsLawyerSignoff(data.answers),
    [data.answers],
  )

  const items = bucket.items
  const selected = items.find((i) => itemKey(i) === selectedKey) ?? items[0] ?? null

  useEffect(() => {
    if (!items.length) {
      setSelectedKey(null)
      return
    }
    if (!selectedKey || !items.some((i) => itemKey(i) === selectedKey)) {
      setSelectedKey(itemKey(items[0]!))
    }
  }, [items, selectedKey])

  useEffect(() => {
    if (!selected) return
    const id = selected.versionId
    if (versionCache[id] !== undefined) return
    let cancelled = false
    void listWillVersions({
      orderId,
      partnerNumber: selected.partnerNumber,
      kind: selected.kind,
    })
      .then((rows) => {
        if (cancelled) return
        const hit = rows.find((r) => r.id === id) ?? null
        setVersionCache((prev) => ({ ...prev, [id]: hit }))
      })
      .catch(() => {
        if (!cancelled) setVersionCache((prev) => ({ ...prev, [id]: null }))
      })
    return () => {
      cancelled = true
    }
  }, [selected, orderId, versionCache])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    if (!selected) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfHash(null)
      return
    }
    const version = versionCache[selected.versionId]
    if (version === undefined) return
    if (!version) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPdfHash(null)
      setMsg('Saved version not found for this bucket item.')
      return
    }

    const answers = data.answers.find((a) => a.partner_number === selected.partnerNumber)
    if (!answers) {
      setMsg('Answers missing for this partner.')
      return
    }

    let cancelled = false
    setLoadingPdf(true)
    setMsg(null)

    const liveDoc = data.wills.find(
      (w) =>
        w.partner_number === selected.partnerNumber && w.document_kind === selected.kind,
    )
    const skeletonBody =
      selected.skeletonBody?.trim() ||
      (liveDoc?.version === selected.version ? liveDoc.skeleton_body?.trim() : '') ||
      null
    const skeleton = skeletonBody ? parseSkeletonBody(skeletonBody) : null

    void renderOrderDocumentPdf({
      kind: selected.kind,
      answers: answers.answers,
      skeleton,
      includeTrust,
      fallbackContent: version.will_content,
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
        if (!cancelled) setLoadingPdf(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected, versionCache, data.answers, data.wills, includeTrust])

  async function removeItem(item: DocumentBucketItem) {
    setBusy(itemKey(item))
    setMsg(null)
    try {
      const next = removeBucketItem(bucket, item.kind, item.partnerNumber)
      await saveDocumentBucket({
        orderId,
        addOns: data.order.add_ons as Record<string, unknown> | null,
        bucket: next,
      })
      await onReload()
      setMsg('Removed from bucket')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setBusy(null)
    }
  }

  async function resolveVersion(item: DocumentBucketItem): Promise<WillVersionRow | null> {
    const cached = versionCache[item.versionId]
    if (cached !== undefined) return cached
    const rows = await listWillVersions({
      orderId,
      partnerNumber: item.partnerNumber,
      kind: item.kind,
    })
    const hit = rows.find((r) => r.id === item.versionId) ?? null
    setVersionCache((prev) => ({ ...prev, [item.versionId]: hit }))
    return hit
  }

  async function confirmSendToClient() {
    if (!items.length) return
    if (needsSntLawyerSignoff && !sntLawyerApproved) {
      setMsg('A licensed Texas attorney must approve the special needs / Texas ABLE language before send.')
      return
    }
    setBusy('send')
    setMsg(null)
    try {
      const attachments = []
      for (const item of items) {
        const answers = data.answers.find((a) => a.partner_number === item.partnerNumber)
        if (!answers) {
          throw new Error(
            `Missing answers for ${DOCUMENT_KIND_LABEL[item.kind]} (partner ${item.partnerNumber})`,
          )
        }
        const version = await resolveVersion(item)
        if (!version) {
          throw new Error(
            `Missing saved version for ${DOCUMENT_KIND_LABEL[item.kind]} v${item.version}`,
          )
        }
        const liveDoc = data.wills.find(
          (w) => w.partner_number === item.partnerNumber && w.document_kind === item.kind,
        )
        const skeletonBody =
          item.skeletonBody?.trim() ||
          (liveDoc?.version === item.version ? liveDoc.skeleton_body?.trim() : '') ||
          null
        const skeleton = skeletonBody ? parseSkeletonBody(skeletonBody) : null
        const bytes = await renderOrderDocumentPdf({
          kind: item.kind,
          answers: answers.answers,
          skeleton,
          includeTrust,
          fallbackContent: version.will_content,
        })
        attachments.push({
          kind: item.kind,
          partnerNumber: item.partnerNumber,
          filename: pdfFilenameFor(item.kind, item.partnerNumber, isCouples),
          label: DOCUMENT_KIND_LABEL[item.kind],
          contentBase64: await pdfBytesToBase64(bytes),
        })
      }
      const result = await deliverDocumentsToClient({
        orderId,
        attachments,
        markDelivered: true,
      })
      if (needsSntLawyerSignoff) {
        await updateOrderStatus({
          orderId,
          status: 'delivered',
          note: SPECIAL_NEEDS_LAWYER_SIGNOFF_TEXT,
        })
      }
      setConfirmSendOpen(false)
      setSntLawyerApproved(false)
      await onReload()
      const sentLines = [
        result.emails.primary?.ok
          ? `Primary: ${data.order.user_email}${result.emails.primary.id ? ` (${result.emails.primary.id})` : ''}`
          : null,
        result.emails.partner?.ok
          ? `Partner: ${data.order.partner_email ?? 'partner'}${result.emails.partner.id ? ` (${result.emails.partner.id})` : ''}`
          : null,
      ].filter(Boolean)
      setMsg(
        sentLines.length
          ? `Sent ${result.sentCount} PDF(s). Email delivered to ${sentLines.join(' · ')}`
          : `Sent ${result.sentCount} PDF(s) to client`,
      )
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(null)
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <p className="font-medium text-foreground">Bucket is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          On Layouts, pick a version in Document preview and click Move to bucket.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {msg ? (
        <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">{msg}</p>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-xl tracking-tight">Ready to send</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {items.length} document{items.length === 1 ? '' : 's'} in bucket · emails go to{' '}
              {data.order.user_email ?? clientEmail}
              {isCouples && data.order.partner_email
                ? ` and ${data.order.partner_email}`
                : ''}
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="h-12 rounded-xl bg-emerald-700 px-8 text-base font-medium text-white hover:bg-emerald-800 sm:min-w-[14rem]"
            disabled={busy !== null || items.length === 0}
            onClick={() => setConfirmSendOpen(true)}
          >
            <Send className="mr-2 h-5 w-5" />
            Send to client
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
        <aside className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Documents in bucket
          </p>
          <ul className="space-y-2">
            {items.map((item) => {
              const key = itemKey(item)
              const active = selected && itemKey(selected) === key
              const partnerName = item.partnerNumber === 1 ? partner1 : partner2
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left transition',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card hover:border-foreground/40',
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {DOCUMENT_KIND_LABEL[item.kind]}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 block text-[11px]',
                        active ? 'opacity-80' : 'text-muted-foreground',
                      )}
                    >
                      {isCouples ? `${partnerName} · ` : ''}v{item.version} · view only
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div>
                  <h3 className="text-sm font-medium">
                    {DOCUMENT_KIND_LABEL[selected.kind]}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    v{selected.version}
                    {isCouples
                      ? ` · ${selected.partnerNumber === 1 ? partner1 : partner2}`
                      : ''}
                    {' · '}
                    added {new Date(selected.addedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                      a.download = `${DOCUMENT_KIND_LABEL[selected.kind]}-v${selected.version}.pdf`
                      a.click()
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full gap-1 text-destructive"
                    disabled={busy !== null}
                    onClick={() => void removeItem(selected)}
                  >
                    {busy === itemKey(selected) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
              {loadingPdf || versionCache[selected.versionId] === undefined ? (
                <PreviewLoadingEffect className="h-[36rem]" />
              ) : pdfUrl ? (
                <iframe
                  title="Bucket preview"
                  src={pdfEmbedSrc(pdfUrl)}
                  className="h-[42rem] w-full bg-white"
                />
              ) : (
                <p className="px-4 py-16 text-center text-sm text-muted-foreground">
                  Could not load this document.
                </p>
              )}
              {pdfHash ? (
                <p className="truncate border-t border-border/60 px-3 py-2 font-mono text-[10px] text-muted-foreground">
                  {pdfHash.slice(0, 24)}…
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>

      <Modal
        open={confirmSendOpen}
        onClose={() => {
          if (busy === 'send') return
          setConfirmSendOpen(false)
          setSntLawyerApproved(false)
        }}
        title="Send documents to client?"
        description={`These bucket PDFs will be emailed to ${clientEmail}.`}
        className="max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={busy === 'send'}
              onClick={() => setConfirmSendOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
              disabled={busy === 'send' || (needsSntLawyerSignoff && !sntLawyerApproved)}
              onClick={() => void confirmSendToClient()}
            >
              {busy === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & send
            </Button>
          </>
        }
      >
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={itemKey(item)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
            >
              <span className="font-medium">{DOCUMENT_KIND_LABEL[item.kind]}</span>
              <span className="text-xs text-muted-foreground">
                {isCouples
                  ? `${item.partnerNumber === 1 ? partner1 : partner2} · `
                  : ''}
                v{item.version}
              </span>
            </li>
          ))}
        </ul>
        {needsSntLawyerSignoff ? (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-foreground">
            <Checkbox
              checked={sntLawyerApproved}
              onCheckedChange={(v) => setSntLawyerApproved(v === true)}
              className="mt-0.5"
            />
            <span>{SPECIAL_NEEDS_LAWYER_SIGNOFF_TEXT}</span>
          </label>
        ) : null}
        <p className="mt-4 text-xs text-muted-foreground">
          PDFs are emailed via Resend — the client does not get a website link. The order is marked
          delivered only after email succeeds. Check spam if the inbox is empty; verify{' '}
          <code className="rounded bg-secondary px-1">RESEND_API_KEY</code> and{' '}
          <code className="rounded bg-secondary px-1">EMAIL_FROM</code> are set on Supabase.
        </p>
      </Modal>
    </div>
  )
}

function itemKey(item: Pick<DocumentBucketItem, 'kind' | 'partnerNumber'>): string {
  return `${item.partnerNumber}:${item.kind}`
}
