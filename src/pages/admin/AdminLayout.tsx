import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  X,
} from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { requireAdminAccess, type AdminRole } from '@/lib/admin'

const NAV = [
  { to: '/admin', end: true, label: 'Orders', icon: ClipboardList },
  { to: '/admin/content/questionnaire', end: false, label: 'Questionnaire', icon: MessageSquareText },
  { to: '/admin/content/skeleton', end: false, label: 'Document templates', icon: FileText },
] as const

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    localStorage.removeItem('myaiwill.admin.demo')
    let alive = true
    requireAdminAccess()
      .then(({ user, roles: r, ok }) => {
        if (!alive) return
        setAllowed(ok)
        setEmail(user?.email ?? null)
        setRoles(r)
        setChecking(false)
      })
      .catch(() => {
        if (!alive) return
        setAllowed(false)
        setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut().catch(() => undefined)
    navigate('/auth?redirect=/admin', { replace: true })
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking access…
      </div>
    )
  }

  if (!allowed) {
    return <Navigate to="/auth?redirect=/admin" replace />
  }

  const sidebar = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border/70 bg-card',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-14 items-center border-b border-border/60 px-3', collapsed && 'justify-center')}>
        <Link to="/admin" className="text-foreground" onClick={() => setMobileOpen(false)}>
          {collapsed ? (
            <span className="font-serif text-lg font-semibold">W</span>
          ) : (
            <Wordmark className="origin-left scale-90" />
          )}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => {
                const onOrdersDetail =
                  item.to === '/admin' && location.pathname.startsWith('/admin/orders/')
                const active = isActive || onOrdersDetail
                return cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  collapsed && 'justify-center px-2',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                )
              }}
              title={item.label}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        {!collapsed ? (
          <div className="mb-3 px-1 text-xs">
            <p className="truncate font-medium text-foreground">{email}</p>
            <p className="text-muted-foreground">{roles.join(' · ') || 'staff'}</p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-9 w-full gap-1.5 rounded-full', collapsed && 'px-0')}
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed ? 'Sign out' : null}
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-dvh shrink-0 md:block">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-card/90 px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 rounded-full md:inline-flex"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admin
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : null}
          </Button>
        </header>
        <main className="w-full flex-1 px-3 py-4 sm:px-4 sm:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
