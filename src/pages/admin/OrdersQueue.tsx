import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  STATUS_LABEL,
  STATUS_TONE,
  listOrders,
  type OrderRow,
} from '@/lib/admin'

const PAGE_SIZE = 50

type StatusFilter =
  | 'all'
  | 'pending'
  | 'in_review'
  | 'needs_revision'
  | 'delivered'
  | 'paid'
  | 'archived'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending Review' },
  { id: 'in_review', label: 'In Review' },
  { id: 'needs_revision', label: 'Needs Revision' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'paid', label: 'Paid' },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateFrom, dateTo])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter === 'archived') {
        if (!o.archived_at) return false
      } else if (statusFilter === 'all') {
        if (o.archived_at) return false
      } else if (statusFilter === 'pending') {
        if (o.archived_at) return false
        if (o.status !== 'submitted' && o.status !== 'ready_for_review') return false
      } else if (statusFilter === 'paid') {
        if (o.archived_at) return false
        if (o.status !== 'paid' && o.status !== 'pending_payment') return false
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
          <h1 className="font-serif text-3xl tracking-tight text-foreground">Review queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders awaiting review, with a 24-hour delivery clock.
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

      {/* Filters */}
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
                  <th className="px-4 py-3 font-medium">Countdown</th>
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
                  pageRows.map((o) => <OrderRow key={o.id} order={o} />)
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

function OrderRow({ order: o }: { order: OrderRow }) {
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
      <td className="px-4 py-3.5 text-right">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Open order detail"
          title="Open order detail"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/admin/orders/${o.id}`)
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}
