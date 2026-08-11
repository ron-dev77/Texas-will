import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { clearDemoAdmin, requireAdminAccess, type AdminRole } from '@/lib/admin'

export default function AdminLayout() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [roles, setRoles] = useState<AdminRole[]>([])

  useEffect(() => {
    let alive = true
    requireAdminAccess()
      .then(({ user, roles: r, ok }) => {
        if (!alive) return
        setAllowed(ok)
        setEmail(user && 'email' in user ? ((user as { email?: string | null }).email ?? null) : null)
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
    clearDemoAdmin()
    await supabase.auth.signOut().catch(() => undefined)
    navigate('/auth', { replace: true })
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

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-foreground">
              <Wordmark className="origin-left scale-90" />
            </Link>
            <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-medium text-foreground">{email}</p>
              <p className="text-muted-foreground">{roles.join(' · ') || 'staff'}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-full"
              onClick={signOut}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
