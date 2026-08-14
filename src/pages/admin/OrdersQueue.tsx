import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import {
  STATUS_LABEL,
  STATUS_TONE,
  archiveOrder,
  deleteOrder,
  listOrders,
  requireAdminAccess,
  type OrderRow,
} from '@/lib/admin'

const PAGE_SIZE = 50

type StatusFilter =
  | 'all'
  | 'pending'
  | 'in_review'
  | 'needs_revision'
  | 'delivered'
  | 'archived'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending Review' },
  { id: 'in_review', label: 'In Review' },
  { id: 'needs_revision', label: 'Needs Revision' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'archived', label: 'Archived' },
]

function startOfDay(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d
}

function endOfDay(iso: string) {
  const d = new Date(`${iso}T23:59:59.999`)
  return d
}

export default function OrdersQueue() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  async function load(soft = false) {
    if (soft) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const rows = await listOrders(true)
      setOrders(rows)
    } catch (err) {
      setOrders([])
      setError(err instanceof Error ? err.message : 'Could not load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    requireAdminAccess()
      .then(({ roles }) => setIsAdmin(roles.includes('admin')))
      .catch(() => setIsAdmin(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateFrom, dateTo])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = orders.filter((o) => {
      if (statusFilter === 'archived') {
        if (!o.archived_at) return false
      } else if (statusFilter === 'all') {
        if (o.archived_at) return false
      } else if (statusFilter === 'pending') {
        if (o.archived_at) return false
        if (o.status !== 'submitted' && o.status !== 'ready_for_review') return false
      } else {
        if (o.archived_at) return false
        if (o.status !== statusFilter) return false
      }

      if (q) {
        const hay = [
          o.customer_name,
          o.partner_name,
          o.user_email,
          o.partner_email,
          o.promo_code,
          o.plan_type,
          o.id,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }

      const submitted = o.submitted_at ? new Date(o.submitted_at) : null
      if (dateFrom) {
        if (!submitted || submitted < startOfDay(dateFrom)) return false
      }
      if (dateTo) {
        if (!submitted || submitted > endOfDay(dateTo)) return false
      }

      return true
    })

    return rows.sort((a, b) => {
      const aT = new Date(a.submitted_at ?? a.created_at).getTime()
      const bT = new Date(b.submitted_at ?? b.created_at).getTime()
      return bT - aT
    })
  }, [orders, search, statusFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1
  const rangeTo = Math.min(pageStart + PAGE_SIZE, filtered.length)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-foreground">Orders queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Newest first, with customer email, submission time, status, and a 24-hour delivery clock.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full"
          onClick={() => void load(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, promo, order id…"
            className="h-10 rounded-full border-border/60 bg-secondary/30 pl-10 shadow-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                statusFilter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border/70 bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              From date
            </label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-xl border-border/60 bg-secondary/30 shadow-none"
            />
          </div>
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              To date
            </label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-xl border-border/60 bg-secondary/30 shadow-none"
            />
          </div>
          {(dateFrom || dateTo || search || statusFilter !== 'all') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-full text-muted-foreground"
              onClick={() => {
                setSearch('')
                setStatusFilter('all')
                setDateFrom('')
                setDateTo('')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading orders…</p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          {error ? (
            <p className="border-b border-border/50 px-4 py-3 text-sm text-destructive">{error}</p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">24h clock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Promo</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No orders match these filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((o) => (
                    <OrderRowView
                      key={o.id}
                      order={o}
                      isAdmin={isAdmin}
                      onChanged={() => void load(true)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {rangeFrom}–{rangeTo} of {filtered.length}
              <span className="text-muted-foreground/70"> · {PAGE_SIZE} per page</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-full"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-full"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderRowView({
  order: o,
  isAdmin,
  onChanged,
}: {
  order: OrderRow
  isAdmin: boolean
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const submittedAt = o.submitted_at ? new Date(o.submitted_at) : null
  const deadline = submittedAt ? new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000) : null
  const hoursLeft = deadline ? (deadline.getTime() - Date.now()) / 36e5 : null
  const overdue =
    hoursLeft !== null && hoursLeft < 0 && o.status !== 'delivered' && o.status !== 'approved'
  const urgent =
    hoursLeft !== null &&
    hoursLeft >= 0 &&
    hoursLeft < 4 &&
    o.status !== 'delivered' &&
    o.status !== 'approved'

  const countdownText = (() => {
    if (o.status === 'delivered' || o.status === 'approved') return '—'
    if (hoursLeft === null) return '—'
    if (overdue) return `${Math.abs(hoursLeft).toFixed(1)}h overdue`
    if (hoursLeft < 1) return `${Math.max(0, Math.round(hoursLeft * 60))}m left`
    return `${hoursLeft.toFixed(1)}h left`
  })()

  return (
    <tr
      className={cn(
        'cursor-pointer transition hover:bg-secondary/30',
        urgent && 'bg-red-50/50',
        o.archived_at && 'opacity-60',
      )}
      onClick={() => navigate(`/admin/orders/${o.id}`)}
    >
      <td className="px-4 py-3.5">
        <p className="font-medium text-foreground">{o.customer_name ?? o.user_email}</p>
        <p className="text-xs text-muted-foreground">{o.user_email}</p>
        {o.partner_email ? (
          <p className="text-xs text-muted-foreground">+ {o.partner_name ?? o.partner_email}</p>
        ) : null}
      </td>
      <td className="px-4 py-3.5 capitalize text-foreground">{o.plan_type}</td>
      <td className="px-4 py-3.5 text-muted-foreground">
        {submittedAt
          ? submittedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
          : '—'}
      </td>
      <td
        className={cn(
          'px-4 py-3.5',
          overdue || urgent ? 'font-semibold text-red-700' : 'text-muted-foreground',
        )}
      >
        {countdownText}
      </td>
      <td className="px-4 py-3.5">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            STATUS_TONE[o.status] ?? 'bg-secondary text-foreground',
          )}
        >
          {STATUS_LABEL[o.status] ?? o.status}
        </span>
        {o.archived_at ? (
          <span className="ml-2 rounded bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
            Archived
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3.5 text-xs">
        {o.promo_code ? (
          <span className="rounded bg-violet-100 px-2 py-0.5 font-mono text-violet-900">
            {o.promo_code}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <RowActions order={o} isAdmin={isAdmin} onChanged={onChanged} />
      </td>
    </tr>
  )
}

function RowActions({
  order: o,
  isAdmin,
  onChanged,
}: {
  order: OrderRow
  isAdmin: boolean
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(
    null,
  )
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isArchived = Boolean(o.archived_at)

  function placeMenu() {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuWidth = 224
    const estimatedHeight = isAdmin ? 280 : 160
    const spaceBelow = window.innerHeight - r.bottom
    const openUp = spaceBelow < estimatedHeight && r.top > spaceBelow
    const left = Math.min(Math.max(8, r.right - menuWidth), window.innerWidth - menuWidth - 8)
    setMenuPos({
      top: openUp ? r.top - 4 : r.bottom + 4,
      left,
      openUp,
    })
  }

  useEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    placeMenu()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => placeMenu()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin])

  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 1800)
    return () => window.clearTimeout(t)
  }, [flash])

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setFlash(`${label} copied`)
    } catch {
      setFlash(`Could not copy ${label.toLowerCase()}`)
    }
    setOpen(false)
  }

  async function onArchive(archived: boolean) {
    setBusy(true)
    try {
      await archiveOrder(o.id, archived)
      setFlash(archived ? 'Order archived' : 'Order unarchived')
      setOpen(false)
      onChanged()
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    setBusy(true)
    try {
      await deleteOrder(o.id)
      setConfirmOpen(false)
      setConfirmText('')
      setFlash('Order deleted')
      onChanged()
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuPos.openUp ? undefined : menuPos.top,
              bottom: menuPos.openUp ? window.innerHeight - menuPos.top : undefined,
              left: menuPos.left,
            }}
            className="z-[80] w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
          >
            <p className="px-3 py-1.5 text-xs font-semibold text-foreground">Order actions</p>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => {
                setOpen(false)
                navigate(`/admin/orders/${o.id}`)
              }}
            >
              Open order
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => {
                setOpen(false)
                navigate(`/admin/orders/${o.id}?tab=layouts`)
              }}
            >
              Review documents
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => void copy(o.user_email, 'Email')}
            >
              Copy customer email
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => void copy(o.id, 'Order ID')}
            >
              Copy order ID
            </button>

            {isAdmin ? (
              <>
                <div className="my-1 border-t border-border" />
                {isArchived ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => void onArchive(false)}
                  >
                    Unarchive order
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => void onArchive(true)}
                  >
                    Archive order
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setOpen(false)
                    setConfirmOpen(true)
                  }}
                >
                  Delete order…
                </button>
              </>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative inline-block text-left">
      {flash ? (
        <span className="pointer-events-none absolute -top-8 right-0 z-20 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background">
          {flash}
        </span>
      ) : null}
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full p-0"
        aria-label="Order actions"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {menu}

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (busy) return
          setConfirmOpen(false)
          setConfirmText('')
        }}
        title="Delete this order?"
        description="This permanently removes the order, its questionnaire answers, generated wills, and timeline events. This cannot be undone."
        className="max-w-md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              disabled={busy}
              onClick={() => {
                setConfirmOpen(false)
                setConfirmText('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              disabled={confirmText !== 'DELETE' || busy}
              onClick={() => void onDelete()}
            >
              {busy ? 'Deleting…' : 'Delete order'}
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-muted-foreground">
          Type <strong>DELETE</strong> to confirm.
        </p>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoFocus
          className="rounded-xl"
        />
      </Modal>
    </div>
  )
}
